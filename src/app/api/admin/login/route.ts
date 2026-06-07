import { cookies } from "next/headers";
import { ADMIN_COOKIE, checkPassword, tokenFor } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return Response.json({ error: "格式錯誤" }, { status: 400 });
  }

  if (!checkPassword(password)) {
    return Response.json({ error: "密碼錯誤" }, { status: 401 });
  }

  const store = await cookies();
  store.set(ADMIN_COOKIE, tokenFor(process.env.ADMIN_PASSWORD as string), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 天
  });

  return Response.json({ ok: true });
}
