import { NextRequest } from "next/server";
import { recordAnalysis, saveImage } from "@/lib/store";
import {
  runAnalysis,
  validateAnalyzeRequest,
  type AnalyzeRequest,
} from "@/lib/analyze-core";
import { getFreeUseToday, incrementFreeUseToday } from "@/lib/freeuse";

export const runtime = "nodejs";
export const maxDuration = 60;

// 免登入試用端點：全站每天總共 FREEUSE_DAILY_LIMIT 次（不分人）
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "尚未設定 ANTHROPIC_API_KEY 環境變數。" },
        { status: 500 }
      );
    }

    // 全站每日總量檢查
    const usage = await getFreeUseToday();
    if (usage.count >= usage.limit) {
      return Response.json(
        {
          error: `今日免費試用次數已達上限（每日 ${usage.limit} 次），請明天再來 🙏`,
          dailyLimit: true,
        },
        { status: 429 }
      );
    }

    const body = (await req.json()) as AnalyzeRequest;
    const invalid = validateAnalyzeRequest(body);
    if (invalid) {
      return Response.json({ error: invalid }, { status: 400 });
    }

    const parsed = await runAnalysis(apiKey, body);

    // 成功後才計入今日用量
    try {
      await incrementFreeUseToday();
    } catch (e) {
      console.error("freeuse 計數失敗：", e);
    }

    // 記錄到後台（標記為訪客試用，無 userId）
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
        userId: "freeuse-guest",
      });
    } catch (persistErr) {
      console.error("記錄分析失敗（不影響使用者）：", persistErr);
    }

    return Response.json({ ...parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Free analyze error:", err);
    return Response.json({ error: `分析過程出錯：${message}` }, { status: 500 });
  }
}
