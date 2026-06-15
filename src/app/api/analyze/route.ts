import { NextRequest } from "next/server";
import { recordAnalysis, saveImage } from "@/lib/store";
import { getSessionGoogleId } from "@/lib/session";
import { getUser, consumeFreeUse, isUnlimited } from "@/lib/users";
import {
  runAnalysis,
  validateAnalyzeRequest,
  type AnalyzeRequest,
} from "@/lib/analyze-core";
import { recordApiUsage } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "尚未設定 ANTHROPIC_API_KEY 環境變數。" },
        { status: 500 }
      );
    }

    // 會員制：必須登入才能使用分析
    const googleId = await getSessionGoogleId();
    if (!googleId) {
      return Response.json(
        { error: "請先用 Google 登入才能使用分析", needLogin: true },
        { status: 401 }
      );
    }
    const member = await getUser(googleId);
    if (!member) {
      return Response.json(
        { error: "請先用 Google 登入才能使用分析", needLogin: true },
        { status: 401 }
      );
    }
    const unlimited = isUnlimited(member.email);
    if (!unlimited && member.freeUsesRemaining <= 0) {
      return Response.json(
        { error: "免費次數已用完，付費方案即將推出 🙏", outOfFree: true },
        { status: 403 }
      );
    }

    const body = (await req.json()) as AnalyzeRequest;
    const invalid = validateAnalyzeRequest(body);
    if (invalid) {
      return Response.json({ error: invalid }, { status: 400 });
    }

    const { result: parsed, usage } = await runAnalysis(apiKey, body);

    // 記錄本月 API 用量（實際 token）
    try {
      await recordApiUsage(usage.inputTokens, usage.outputTokens);
    } catch (e) {
      console.error("記錄 API 用量失敗：", e);
    }

    // 分析成功 → 扣一次免費額度（無限次帳號不扣）
    let freeUsesRemaining = member.freeUsesRemaining;
    if (!unlimited) {
      try {
        const ok = await consumeFreeUse(googleId);
        if (ok) freeUsesRemaining = Math.max(0, member.freeUsesRemaining - 1);
      } catch (e) {
        console.error("扣免費次數失敗：", e);
      }
    }

    // 記錄到後台（含照片、擁有者）。失敗不影響使用者拿到分析結果
    try {
      let imageUrl: string | undefined;
      if (body.imageBase64 && body.imageMediaType) {
        imageUrl = await saveImage(body.imageBase64, body.imageMediaType);
      }
      await recordAnalysis({
        petType: body.petType,
        petName: body.petName,
        petAge: body.petAge,
        symptoms: body.symptoms,
        severity: parsed.severity,
        result: parsed,
        imageUrl,
        userId: googleId,
      });
    } catch (persistErr) {
      console.error("記錄分析失敗（不影響使用者）：", persistErr);
    }

    return Response.json({ ...parsed, freeUsesRemaining, unlimited });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Analyze error:", err);
    return Response.json({ error: `分析過程出錯：${message}` }, { status: 500 });
  }
}
