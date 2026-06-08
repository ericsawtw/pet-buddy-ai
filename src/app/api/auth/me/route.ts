import { getSessionGoogleId } from "@/lib/session";
import { getUser } from "@/lib/users";

export const runtime = "nodejs";

// 回傳目前登入會員的公開資訊（給前端顯示登入狀態與剩餘次數）
export async function GET() {
  const googleId = await getSessionGoogleId();
  if (!googleId) {
    return Response.json({ user: null });
  }
  const user = await getUser(googleId);
  if (!user) {
    return Response.json({ user: null });
  }
  return Response.json({
    user: {
      name: user.name,
      email: user.email,
      picture: user.picture,
      freeUsesRemaining: user.freeUsesRemaining,
    },
  });
}
