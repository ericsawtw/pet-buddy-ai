import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const SESSION_COOKIE = "pb_session";

// 用 SESSION_SECRET 對 googleId 簽章，cookie 值 = googleId.signature
function sign(value: string): string {
  const secret = process.env.SESSION_SECRET || "";
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function makeSessionToken(googleId: string): string {
  return `${googleId}.${sign(googleId)}`;
}

// 驗證 cookie，回傳 googleId 或 null（簽章不符即拒絕，防偽造）
export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return null;
  const googleId = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = sign(googleId);
  if (sig.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return googleId;
}

export async function setSession(googleId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, makeSessionToken(googleId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 天
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// 從目前請求的 cookie 取得已登入的 googleId（server 端）
export async function getSessionGoogleId(): Promise<string | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}
