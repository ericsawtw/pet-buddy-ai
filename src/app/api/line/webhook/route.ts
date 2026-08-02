import { NextRequest } from "next/server";
import { verifyLineSignature, lineReplyText, getLineImage } from "@/lib/line";
import { getLineUser, setLinePending, consumeLineFree } from "@/lib/line-users";
import { saveImage, recordAnalysis } from "@/lib/store";
import {
  runAnalysis,
  validateAnalyzeRequest,
  type AnalyzeRequest,
  type AnalyzeResponse,
} from "@/lib/analyze-core";
import { recordApiUsage } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type: string; id: string; text?: string };
};

const WELCOME =
  "🐾 歡迎加入毛孩管家！\n\n" +
  "毛孩怪怪的？傳一張牠的照片給我，再用文字描述症狀，" +
  "我就用 AI 幫你做健康分級（🟢🟡🔴）＋照護與就醫建議。\n\n" +
  "先傳一張毛孩的照片吧 📸";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");
  if (!verifyLineSignature(rawBody, signature)) {
    return new Response("Bad signature", { status: 401 });
  }

  let data: { events?: LineEvent[] };
  try {
    data = JSON.parse(rawBody);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  for (const ev of data.events ?? []) {
    try {
      await handleEvent(ev);
    } catch (e) {
      console.error("LINE event error", e);
    }
  }
  return new Response("OK");
}

async function handleEvent(ev: LineEvent): Promise<void> {
  const replyToken = ev.replyToken;
  const userId = ev.source?.userId;

  // 加好友 → 歡迎訊息
  if (ev.type === "follow" && replyToken) {
    await lineReplyText(replyToken, WELCOME);
    return;
  }

  if (ev.type !== "message" || !replyToken || !userId || !ev.message) return;
  const msg = ev.message;

  // 收到照片 → 存起來，請他描述症狀
  if (msg.type === "image") {
    try {
      const { base64, mediaType } = await getLineImage(msg.id);
      const imageUrl = await saveImage(base64, mediaType);
      await setLinePending(userId, { imageUrl, mediaType });
      await lineReplyText(
        replyToken,
        "📸 收到照片！請用文字描述毛孩的症狀（例如：一直抓耳朵、食慾變差、精神不好），我就幫你分析 🐾"
      );
    } catch (e) {
      console.error(e);
      await lineReplyText(replyToken, "照片處理失敗了 🙏 請再傳一次。");
    }
    return;
  }

  // 收到文字 → 若有待分析的照片就進行分析
  if (msg.type === "text") {
    const text = (msg.text ?? "").trim();
    const user = await getLineUser(userId);

    if (!user.pending) {
      await lineReplyText(
        replyToken,
        "請先傳一張毛孩的照片 🐾，再用文字描述症狀，我才能幫你分析喔。"
      );
      return;
    }
    if (user.freeUsesRemaining <= 0) {
      await lineReplyText(replyToken, "你的免費次數已用完囉 🙏 付費方案即將推出。");
      return;
    }

    const petType: "dog" | "cat" = /貓|喵|kitty|cat/i.test(text) ? "cat" : "dog";
    const body: AnalyzeRequest = { petType, symptoms: text };
    const invalid = validateAnalyzeRequest(body);
    if (invalid) {
      await lineReplyText(replyToken, invalid);
      return;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      await lineReplyText(replyToken, "系統設定未完成，請稍後再試 🙏");
      return;
    }

    // 取回先前存下的照片轉 base64
    try {
      const r = await fetch(user.pending.imageUrl, { cache: "no-store" });
      if (r.ok) {
        body.imageBase64 = Buffer.from(await r.arrayBuffer()).toString("base64");
        body.imageMediaType = user.pending.mediaType;
      }
    } catch {
      // 沒有照片也讓 Claude 依症狀分析
    }

    try {
      const { result, usage } = await runAnalysis(apiKey, body);
      try {
        await recordApiUsage(usage.inputTokens, usage.outputTokens);
      } catch (e) {
        console.error("記錄用量失敗", e);
      }
      try {
        await recordAnalysis({
          petType,
          symptoms: text,
          severity: result.severity,
          result,
          imageUrl: user.pending.imageUrl,
          userId: "line:" + userId,
        });
      } catch (e) {
        console.error("記錄分析失敗", e);
      }
      await consumeLineFree(userId);
      const remaining = Math.max(0, user.freeUsesRemaining - 1);
      await lineReplyText(replyToken, formatResult(result, remaining));
    } catch (e) {
      console.error("分析失敗", e);
      await lineReplyText(replyToken, "分析時發生問題 🙏 請稍後再試一次。");
    }
  }
}

function formatResult(r: AnalyzeResponse, remaining: number): string {
  const dot = r.severity === "red" ? "🔴" : r.severity === "yellow" ? "🟡" : "🟢";
  const lines: string[] = [];
  lines.push(`${dot} ${r.severityLabel || r.severity}`);
  if (r.severityReason) lines.push(r.severityReason);

  if (r.possibleCauses && r.possibleCauses.length > 0) {
    lines.push("\n【可能原因】");
    for (const c of r.possibleCauses) {
      lines.push(`• ${c.name}（${c.likelihood}）— ${c.description}`);
    }
  }
  if (r.homeCare && r.homeCare.length > 0) {
    lines.push("\n【居家照護】");
    for (const h of r.homeCare) lines.push(`• ${h}`);
  }
  if (r.vetAdvice) {
    lines.push("\n【就醫建議】");
    lines.push(r.vetAdvice);
  }
  if (r.dietAdvice) {
    lines.push("\n【飲食建議】");
    lines.push(r.dietAdvice);
  }
  if (r.warning) lines.push(`\n⚠️ ${r.warning}`);

  lines.push("\n———");
  lines.push(`本結果為健康參考，非獸醫診斷。剩餘免費次數：${remaining} 次。`);
  return lines.join("\n");
}
