import { cookies } from "next/headers";
import { setSession } from "@/lib/session";
import { upsertUserOnLogin } from "@/lib/users";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const store = await cookies();
  const savedState = store.get("pb_oauth_state")?.value;
  store.delete("pb_oauth_state");

  // 驗證 state（防 CSRF）
  if (!code || !state || !savedState || state !== savedState) {
    return Response.redirect(`${url.origin}/?login=error`);
  }

  const redirectUri = `${url.origin}/api/auth/google/callback`;

  try {
    // 用 code 換 access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      return Response.redirect(`${url.origin}/?login=error`);
    }
    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) {
      return Response.redirect(`${url.origin}/?login=error`);
    }

    // 取得使用者基本資料
    const infoRes = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    if (!infoRes.ok) {
      return Response.redirect(`${url.origin}/?login=error`);
    }
    const profile = (await infoRes.json()) as {
      sub: string;
      email?: string;
      name?: string;
      picture?: string;
    };

    await upsertUserOnLogin({
      googleId: profile.sub,
      email: profile.email || "",
      name: profile.name || "毛孩家長",
      picture: profile.picture,
    });
    await setSession(profile.sub);

    return Response.redirect(`${url.origin}/analyze`);
  } catch {
    return Response.redirect(`${url.origin}/?login=error`);
  }
}
