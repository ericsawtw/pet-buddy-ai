import { createHmac, timingSafeEqual } from "crypto";

export const SITE_URL = "https://careyourpet.net";

// 連結有效期。卡片會一直留在 LINE 聊天室裡，太短會讓舊卡片點不開，
// 所以給 30 天；過期的話頁面會請他回 LINE 重新點一次「歷史紀錄」。
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

function sign(payload: string): string {
  return createHmac("sha256", process.env.SESSION_SECRET || "")
    .update(payload)
    .digest("base64url");
}

function payloadOf(key: string, id: string, exp: string): string {
  return `${key}.${id}.${exp}`;
}

// 產生「我的紀錄列表」連結。帶的是雜湊後的資料夾名稱，不會外洩 LINE ID。
export function historyListUrl(key: string): string {
  const exp = String(Date.now() + TTL_MS);
  const sig = sign(payloadOf(key, "", exp));
  const q = new URLSearchParams({ k: key, e: exp, s: sig });
  return `${SITE_URL}/r?${q}`;
}

// 產生「單筆完整報告」連結
export function historyRecordUrl(key: string, id: string): string {
  const exp = String(Date.now() + TTL_MS);
  const sig = sign(payloadOf(key, id, exp));
  const q = new URLSearchParams({ k: key, e: exp, s: sig });
  return `${SITE_URL}/r/${id}?${q}`;
}

export type LinkCheck = { ok: true } | { ok: false; reason: "expired" | "invalid" };

// 驗章。先比簽章再看有效期，這樣過期訊息只會出現在真的是本人的連結上。
export function verifyHistoryLink(params: {
  key?: string | null;
  id?: string | null;
  exp?: string | null;
  sig?: string | null;
}): LinkCheck {
  const { key, exp, sig } = params;
  const id = params.id ?? "";
  if (!key || !exp || !sig) return { ok: false, reason: "invalid" };

  const expected = Buffer.from(sign(payloadOf(key, id, exp)));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, reason: "invalid" };
  }

  const ms = Number(exp);
  if (!Number.isFinite(ms) || Date.now() > ms) return { ok: false, reason: "expired" };
  return { ok: true };
}
