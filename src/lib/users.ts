import { put, list } from "@vercel/blob";
import { createHmac } from "crypto";

export type User = {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  freeUsesRemaining: number;
  createdAt: string;
};

const PREFIX = "users/";
const FREE_QUOTA = 3;

// 用 SESSION_SECRET 把 googleId 雜湊成 Blob 路徑，讓檔名無法從 googleId 直接猜出（隱私）
function pathFor(googleId: string): string {
  const h = createHmac("sha256", process.env.SESSION_SECRET || "")
    .update("user:" + googleId)
    .digest("hex");
  return `${PREFIX}${h}.json`;
}

async function saveUser(user: User): Promise<void> {
  await put(pathFor(user.googleId), JSON.stringify(user), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function getUser(googleId: string): Promise<User | null> {
  const path = pathFor(googleId);
  const { blobs } = await list({ prefix: path, limit: 1 });
  const match = blobs.find((b) => b.pathname === path);
  if (!match) return null;
  try {
    const res = await fetch(match.url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as User;
  } catch {
    return null;
  }
}

// 登入時建立或更新會員資料（新會員給 FREE_QUOTA 次免費）
export async function upsertUserOnLogin(profile: {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}): Promise<User> {
  const existing = await getUser(profile.googleId);
  const user: User = existing
    ? { ...existing, email: profile.email, name: profile.name, picture: profile.picture }
    : {
        googleId: profile.googleId,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        freeUsesRemaining: FREE_QUOTA,
        createdAt: new Date().toISOString(),
      };
  await saveUser(user);
  return user;
}

// 扣一次免費額度，成功回 true；沒額度或查無會員回 false
export async function consumeFreeUse(googleId: string): Promise<boolean> {
  const user = await getUser(googleId);
  if (!user || user.freeUsesRemaining <= 0) return false;
  user.freeUsesRemaining -= 1;
  await saveUser(user);
  return true;
}
