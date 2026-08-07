import { NextRequest } from "next/server";
import {
  verifyLineSignature,
  lineReply,
  lineReplyText,
  lineReplyPhotoPrompt,
  lineReplyVideo,
  linePush,
  getLineImage,
} from "@/lib/line";
import {
  getLineUser,
  setLinePending,
  consumeCredit,
  remainingCredits,
  addPaidCredits,
} from "@/lib/line-users";
import { addOwner, getOwnerIds } from "@/lib/line-owners";
import { findPendingByLast5, markPaymentConfirmed } from "@/lib/line-payments";
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

const PRICING_MSG =
  "💳 完整深度健檢報告 方案：\n" +
  "・單次 NT$59\n" +
  "・3 次 NT$149（約 50/次）\n" +
  "・10 次 NT$399（約 40/次）\n\n" +
  "🏦 收款帳戶（無痕轉帳・省手續費）\n" +
  "銀行：中國信託銀行（822）\n" +
  "帳號：314972087423\n\n" +
  "轉帳後請點下方「📝 已匯款回報」填單，我們人工確認入帳後幫你開通次數 🐾";

const TUTORIAL_VIDEO_URL =
  "https://xn8q9yjwnzrmbvwt.public.blob.vercel-storage.com/promo/pet-buddy-final-v2-ZJBUQW7EuAhR5JxKSdM9yysB6IUJxo.mp4";
const TUTORIAL_PREVIEW_URL =
  "https://xn8q9yjwnzrmbvwt.public.blob.vercel-storage.com/line/tut-thumb-RWFRLjpvQM65VDtzLm3WqSnVvjktT9.jpg";

// 圖文選單按鈕（點下去會送出對應關鍵字）。有處理就回 true
async function handleMenuCommand(
  userId: string,
  text: string,
  replyToken: string
): Promise<boolean> {
  switch (text) {
    case "開始健檢":
      await lineReplyPhotoPrompt(
        replyToken,
        "🩺 開始健檢！\n請傳一張毛孩的照片 📸（點下方按鈕拍照或選圖），接著用文字描述症狀，我就幫你做健康分級。"
      );
      return true;
    case "剩餘次數": {
      const u = await getLineUser(userId);
      await lineReplyText(
        replyToken,
        `🦴 你目前可用 ${remainingCredits(u)} 次（免費 ${u.freeUsesRemaining}＋付費 ${u.paidCredits ?? 0}）。\n用完可到「購買次數」加值 🐾`
      );
      return true;
    }
    case "購買次數":
      await lineReply(replyToken, [
        {
          type: "text",
          text: PRICING_MSG,
          quickReply: {
            items: [
              {
                type: "action",
                action: {
                  type: "uri",
                  label: "📝 已匯款回報",
                  uri: `https://careyourpet.net/line-report?u=${encodeURIComponent(userId)}`,
                },
              },
            ],
          },
        },
      ]);
      return true;
    case "歷史紀錄":
      await lineReplyText(replyToken, "📖 歷史紀錄功能即將推出，敬請期待 🙏");
      return true;
    case "使用教學":
      await lineReplyVideo(
        replyToken,
        TUTORIAL_VIDEO_URL,
        TUTORIAL_PREVIEW_URL,
        "▶️ 30 秒看懂怎麼用！\n有問題點「聯絡客服」找我們 🐾"
      );
      return true;
    case "聯絡客服":
      await lineReplyText(
        replyToken,
        "💬 有任何問題，直接在這裡留言就好，我們會盡快回覆你 🐾"
      );
      return true;
    default:
      return false;
  }
}

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

  // 加好友 → 歡迎訊息（附拍照/相簿按鈕）
  if (ev.type === "follow" && replyToken) {
    await lineReplyPhotoPrompt(replyToken, WELCOME);
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

    // 管理員指令（綁定 / 開通匯款）
    if (await handleAdminCommand(userId, text, replyToken)) return;

    // 圖文選單按鈕（關鍵字）
    if (await handleMenuCommand(userId, text, replyToken)) return;

    const user = await getLineUser(userId);

    if (!user.pending) {
      await lineReplyPhotoPrompt(
        replyToken,
        "請先傳一張毛孩的照片 🐾（點下方按鈕拍照或選圖），再用文字描述症狀，我才能幫你分析喔。"
      );
      return;
    }
    if (remainingCredits(user) <= 0) {
      await lineReplyText(
        replyToken,
        "你的次數已用完囉 🙏 點下方「購買次數」加值即可繼續使用。"
      );
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
      // 直接用扣款後回傳的使用者算剩餘次數。若改成重讀一次，會讀到扣款前的舊值。
      const after = await consumeCredit(userId);
      await lineReplyText(
        replyToken,
        formatResult(result, after ? remainingCredits(after) : 0)
      );
    } catch (e) {
      console.error("分析失敗", e);
      await lineReplyText(replyToken, "分析時發生問題 🙏 請稍後再試一次。");
    }
  }
}

// 管理員指令：綁定管理員、確認匯款開通。有處理回 true
async function handleAdminCommand(
  userId: string,
  text: string,
  replyToken: string
): Promise<boolean> {
  // 綁定管理員：「管理員綁定 <ADMIN_PASSWORD>」
  if (text.startsWith("管理員綁定")) {
    const pwd = text.replace("管理員綁定", "").trim();
    if (pwd && pwd === process.env.ADMIN_PASSWORD) {
      await addOwner(userId);
      await lineReplyText(
        replyToken,
        "✅ 已設為管理員，之後有人回報匯款會通知你。\n確認入帳後回「開通 末五碼」即可幫對方加值。"
      );
    } else {
      await lineReplyText(replyToken, "密碼錯誤 🙏");
    }
    return true;
  }

  // 確認開通：「開通 <匯款末五碼>」（僅管理員）
  if (text.startsWith("開通")) {
    const owners = await getOwnerIds();
    if (!owners.includes(userId)) return false; // 非管理員，當一般文字處理
    const last5 = text.replace("開通", "").trim();
    const found = await findPendingByLast5(last5);
    if (!found) {
      await lineReplyText(replyToken, `找不到末五碼 ${last5} 的待核帳款 🙏`);
      return true;
    }
    await markPaymentConfirmed(found.rec);
    const u = await addPaidCredits(found.rec.lineUserId, found.rec.credits);
    await linePush(
      found.rec.lineUserId,
      `✅ 已確認收到你的 ${found.rec.planLabel}（NT$${found.rec.amount}）款項，為你加值 ${found.rec.credits} 次！\n目前可用 ${remainingCredits(u)} 次 🐾`
    );
    await lineReplyText(
      replyToken,
      `✅ 已開通：${found.rec.planLabel} ＋${found.rec.credits} 次，並通知對方。`
    );
    return true;
  }

  return false;
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
  lines.push(`本結果為健康參考，非獸醫診斷。剩餘次數：${remaining} 次。`);
  return lines.join("\n");
}
