import { put, list } from "@vercel/blob";
import { createHmac } from "crypto";

// 一位 LINE 使用者「待分析」的照片（等他描述症狀）
export type LinePending = {
  imageUrl: string;
  mediaType: "image/jpeg" | "image/png";
};

export type LineUser = {
  lineUserId: string;
  freeUsesRemaining: number;
  createdAt: string;
  pending?: LinePending | null;
};

const PREFIX = "line-users/";
const LINE_FREE_QUOTA = 3; // 每個 LINE 用戶的免費次數（之後收費上線可調整）

// 用 SESSION_SECRET 把 lineUserId 雜湊成 Blob 路徑（隱私，檔名猜不出）
function pathFor(lineUserId: string): string {
  const h = createHmac("sha256", process.env.SESSION_SECRET || "")
    .update("line:" + lineUserId)
    .digest("hex");
  return `${PREFIX}${h}.json`;
}

async function save(u: LineUser): Promise<void> {
  await put(pathFor(u.lineUserId), JSON.stringify(u), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

// 取得（或初次建立）一位 LINE 使用者
export async function getLineUser(lineUserId: string): Promise<LineUser> {
  const path = pathFor(lineUserId);
  const { blobs } = await list({ prefix: path, limit: 1 });
  const match = blobs.find((b) => b.pathname === path);
  if (match) {
    try {
      const res = await fetch(match.url, { cache: "no-store" });
      if (res.ok) return (await res.json()) as LineUser;
    } catch {
      // 讀取失敗就當作新使用者往下走
    }
  }
  const fresh: LineUser = {
    lineUserId,
    freeUsesRemaining: LINE_FREE_QUOTA,
    createdAt: new Date().toISOString(),
    pending: null,
  };
  await save(fresh);
  return fresh;
}

// 設定 / 清除「待分析照片」
export async function setLinePending(
  lineUserId: string,
  pending: LinePending | null
): Promise<void> {
  const u = await getLineUser(lineUserId);
  u.pending = pending;
  await save(u);
}

// 扣一次免費額度並清掉 pending；成功回 true，沒額度回 false
export async function consumeLineFree(lineUserId: string): Promise<boolean> {
  const u = await getLineUser(lineUserId);
  if (u.freeUsesRemaining <= 0) return false;
  u.freeUsesRemaining -= 1;
  u.pending = null;
  await save(u);
  return true;
}
