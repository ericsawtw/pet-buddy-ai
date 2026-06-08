import { put, list } from "@vercel/blob";

// /freeuse 全站每日總用量上限（不分人，所有人加總）
export const FREEUSE_DAILY_LIMIT = 10;

const PREFIX = "freeuse-usage/";

// 以台灣時間(UTC+8)計算「今天」的日期字串 YYYY-MM-DD
function todayTaipei(): string {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

async function readCount(date: string): Promise<number> {
  const path = `${PREFIX}${date}.json`;
  const { blobs } = await list({ prefix: path, limit: 1 });
  const match = blobs.find((b) => b.pathname === path);
  if (!match) return 0;
  try {
    const res = await fetch(match.url, { cache: "no-store" });
    if (!res.ok) return 0;
    const data = (await res.json()) as { count?: number };
    return data.count || 0;
  } catch {
    return 0;
  }
}

export async function getFreeUseToday(): Promise<{
  date: string;
  count: number;
  limit: number;
}> {
  const date = todayTaipei();
  return { date, count: await readCount(date), limit: FREEUSE_DAILY_LIMIT };
}

export async function incrementFreeUseToday(): Promise<void> {
  const date = todayTaipei();
  const count = (await readCount(date)) + 1;
  await put(`${PREFIX}${date}.json`, JSON.stringify({ date, count }), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}
