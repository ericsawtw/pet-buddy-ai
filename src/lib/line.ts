import { createHmac } from "crypto";

const REPLY_URL = "https://api.line.me/v2/bot/message/reply";
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

// 用 replyToken 回覆文字（回覆訊息免費，不計入推播額度）
export async function lineReplyText(replyToken: string, text: string): Promise<void> {
  const res = await fetch(REPLY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken()}`,
    },
    body: JSON.stringify({ replyToken, messages: [{ type: "text", text }] }),
  });
  if (!res.ok) {
    console.error("LINE reply 失敗", res.status, await res.text().catch(() => ""));
  }
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
