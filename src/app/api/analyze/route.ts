import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { recordAnalysis, saveImage } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

type AnalyzeRequest = {
  petType: "dog" | "cat";
  petName?: string;
  petAge?: string;
  symptoms: string;
  imageBase64?: string;
  imageMediaType?: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
};

type AnalyzeResponse = {
  severity: "green" | "yellow" | "red";
  severityLabel: string;
  severityReason: string;
  possibleCauses: Array<{
    name: string;
    likelihood: "高" | "中" | "低";
    description: string;
  }>;
  homeCare: string[];
  vetAdvice: string;
  dietAdvice?: string;
  warning?: string;
};

const SYSTEM_PROMPT = `你是一位專業、溫暖的台灣寵物健康助手 AI。你的工作是根據飼主提供的照片和症狀描述，給予初步的健康分析建議。

重要原則：
1. 你「不是獸醫」，提供的是參考意見，不是醫療診斷
2. 嚴重症狀（出血、抽搐、無法呼吸、意識不清、無法站立等）一律建議立即就醫
3. 用繁體中文、台灣用語回答
4. 語氣溫暖、給飼主安心感，但不能誇大或淡化嚴重性
5. 必須以 JSON 格式回應，不要任何其他文字

嚴重程度判斷：
- "green"（綠燈，輕微）：常見小問題，可以先在家觀察處理
- "yellow"（黃燈，觀察）：建議近期預約獸醫，但不是急診
- "red"（紅燈，緊急）：建議立即送醫或聯絡 24 小時急診

回應 JSON 格式（嚴格遵守）：
{
  "severity": "green" | "yellow" | "red",
  "severityLabel": "紅綠燈中文標籤，例如：輕微觀察 / 建議就醫 / 立即送醫",
  "severityReason": "為什麼判斷這個嚴重程度（1-2 句話）",
  "possibleCauses": [
    { "name": "可能原因名稱", "likelihood": "高/中/低", "description": "簡單說明 1-2 句" }
  ],
  "homeCare": ["居家可做的事 1", "居家可做的事 2", "..."],
  "vetAdvice": "什麼時候要去看醫生、要跟醫生說什麼",
  "dietAdvice": "飲食建議（選填，沒有就不要這欄）",
  "warning": "需要立即注意的警訊（選填）"
}`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        {
          error: "尚未設定 ANTHROPIC_API_KEY 環境變數。請在 .env.local 中加入 API Key。",
        },
        { status: 500 }
      );
    }

    const body = (await req.json()) as AnalyzeRequest;

    if (!body.symptoms || body.symptoms.trim().length < 2) {
      return Response.json(
        { error: "請描述毛孩的症狀（至少 2 個字）" },
        { status: 400 }
      );
    }

    if (!body.petType || !["dog", "cat"].includes(body.petType)) {
      return Response.json(
        { error: "請選擇寵物類型（狗 或 貓）" },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey });

    const petTypeZh = body.petType === "dog" ? "狗狗" : "貓咪";
    const userTextContent = `
寵物資訊：
- 類型：${petTypeZh}
- 名字：${body.petName || "（未提供）"}
- 年齡：${body.petAge || "（未提供）"}

飼主描述的症狀：
${body.symptoms}

${body.imageBase64 ? "（飼主有附上照片，請參考）" : "（飼主沒有附照片）"}

請根據以上資訊，依照系統指示的 JSON 格式回應分析結果。
`.trim();

    const userContent: Anthropic.MessageParam["content"] =
      body.imageBase64 && body.imageMediaType
        ? [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: body.imageMediaType,
                data: body.imageBase64,
              },
            },
            { type: "text", text: userTextContent },
          ]
        : [{ type: "text", text: userTextContent }];

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userContent,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return Response.json(
        { error: "AI 未回傳分析結果，請稍後再試" },
        { status: 500 }
      );
    }

    const rawText = textBlock.text.trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json(
        { error: "AI 回應格式異常，請稍後再試", raw: rawText },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]) as AnalyzeResponse;

    // 記錄到後台（含照片）。失敗不影響使用者拿到分析結果 —— 分析功能優先
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
      });
    } catch (persistErr) {
      console.error("記錄分析失敗（不影響使用者）：", persistErr);
    }

    return Response.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Analyze error:", err);
    return Response.json(
      { error: `分析過程出錯：${message}` },
      { status: 500 }
    );
  }
}
