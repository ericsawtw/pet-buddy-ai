import { cookies } from "next/headers";
import { createHash } from "crypto";

// 後台登入用的 cookie 名稱
export const ADMIN_COOKIE = "pb_admin";

// 由密碼衍生出 token，存進 cookie（不直接放明碼；改密碼會讓舊 cookie 失效）
export function tokenFor(password: string): string {
  return createHash("sha256").update(`pet-buddy::${password}`).digest("hex");
}

// 驗證使用者輸入的密碼是否正確
export function checkPassword(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  return Boolean(pw) && input === pw;
}

// 檢查目前請求是否已通過後台登入（server 端讀 cookie）
export async function isAuthed(): Promise<boolean> {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === tokenFor(pw);
}
