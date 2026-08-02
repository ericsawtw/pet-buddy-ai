import { createHmac } from "crypto";

const REPLY_URL = "https://api.line.me/v2/bot/message/reply";
const PUSH_URL = "https://api.line.me/v2/bot/message/push";
const contentUrl = (messageId: string) =>
  `https://api-data.line.me/v2/bot/message/${messageId}/content`;

function accessToken(): string {
  return process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
}

// 驗證 LINE webhook 簽章（header: x-line-signature）
export function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET || "";
  if (!secret || !signature) return false;
  const hash = createHmac("sha256", secret).update(rawBody).digest("base64");
  return hash.length === signature.length && hash === signature;
}

// 用 replyToken 回覆訊息（回覆訊息免費，不計入推播額度）
export async function lineReply(replyToken: string, messages: unknown[]): Promise<void> {
  const res = await fetch(REPLY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken()}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
  if (!res.ok) {
    console.error("LINE reply 失敗", res.status, await res.text().catch(() => ""));
  }
}

export async function lineReplyText(replyToken: string, text: string): Promise<void> {
  await lineReply(replyToken, [{ type: "text", text }]);
}

// 主動推播文字給某個 LINE 使用者（用於通知管理員；對方須為官方帳號好友）
export async function linePush(to: string, text: string): Promise<void> {
  const res = await fetch(PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken()}`,
    },
    body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
  });
  if (!res.ok) {
    console.error("LINE push 失敗", res.status, await res.text().catch(() => ""));
  }
}

// 回覆文字，並在下方附「📷 拍照 / 🖼️ 從相簿選」快速按鈕
// （點了直接叫出相機或相簿，選完照片自動傳給 bot；僅手機 App 有效）
export async function lineReplyPhotoPrompt(replyToken: string, text: string): Promise<void> {
  await lineReply(replyToken, [
    {
      type: "text",
      text,
      quickReply: {
        items: [
          { type: "action", action: { type: "cameraRoll", label: "🖼️ 從相簿選" } },
          { type: "action", action: { type: "camera", label: "📷 拍照" } },
        ],
      },
    },
  ]);
}

// 下載使用者傳來的圖片，回傳 base64 + mediaType
export async function getLineImage(
  messageId: string
): Promise<{ base64: string; mediaType: "image/jpeg" | "image/png" }> {
  const res = await fetch(contentUrl(messageId), {
    headers: { Authorization: `Bearer ${accessToken()}` },
  });
  if (!res.ok) throw new Error(`下載 LINE 圖片失敗: ${res.status}`);
  const ct = res.headers.get("content-type") || "image/jpeg";
  const mediaType: "image/jpeg" | "image/png" = ct.includes("png")
    ? "image/png"
    : "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  return { base64: buf.toString("base64"), mediaType };
}
