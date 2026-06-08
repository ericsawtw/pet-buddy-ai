import { getSessionGoogleId } from "@/lib/session";
import { getUser } from "@/lib/users";

// 管理者 email（環境變數 ADMIN_EMAILS，逗號分隔，不分大小寫）
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

// 目前登入者是否為管理者（用 Google 登入 + email 比對）
export async function isAdmin(): Promise<boolean> {
  const googleId = await getSessionGoogleId();
  if (!googleId) return false;
  const user = await getUser(googleId);
  return isAdminEmail(user?.email);
}
