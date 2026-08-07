import { put, list, del } from "@vercel/blob";
import { createHmac, randomUUID } from "crypto";

// 一筆分析紀錄的資料形狀
export type AnalysisRecord = {
  id: string;
  createdAt: string; // ISO 時間字串
  petType: "dog" | "cat";
  petName?: string;
  petAge?: string;
  symptoms: string;
  severity: string; // green / yellow / red
  result: unknown; // 完整 AI 分析結果
  imageUrl?: string; // 照片網址（存在 Vercel Blob）
  userId?: string; // 提交者（Google 帳號 ID，或 LINE 的 "line:<id>"）
};

const PREFIX = "analyses/";
const USER_PREFIX = `${PREFIX}u/`;
const ANON_PREFIX = `${PREFIX}anon/`;

// 把 userId 雜湊成資料夾名稱（隱私，看檔名猜不出是誰）
export function userKey(userId: string): string {
  return createHmac("sha256", process.env.SESSION_SECRET || "")
    .update(userId)
    .digest("hex");
}

// 某位使用者的紀錄資料夾。沒有 userId 的訪客紀錄統一放 anon/。
//
// 為什麼要分資料夾：要列出「某個人的紀錄」時，只需列他自己的資料夾、
// 並且只下載需要的那幾筆。原本全部平放在 analyses/ 底下，得把全站每一筆
// 都下載回來再過濾，紀錄一多就會慢到 LINE 等不及回覆。
export function folderForKey(key: string): string {
  return `${USER_PREFIX}${key}/`;
}

export function folderFor(userId?: string): string {
  return userId ? folderForKey(userKey(userId)) : ANON_PREFIX;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// 檔名以 ISO 時間開頭，字串反向排序即為由新到舊
function newestFirst<T extends { pathname: string }>(blobs: T[]): T[] {
  return [...blobs].sort((a, b) => (a.pathname < b.pathname ? 1 : -1));
}

// 上傳壓縮後的照片到 Blob，回傳公開網址
export async function saveImage(
  base64: string,
  mediaType: string
): Promise<string> {
  const buffer = Buffer.from(base64, "base64");
  const ext = (mediaType.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const blob = await put(`images/${randomUUID()}.${ext}`, buffer, {
    access: "public",
    contentType: mediaType,
    addRandomSuffix: false,
  });
  return blob.url;
}

// 把一筆分析存進該使用者的資料夾（檔名以 ISO 時間開頭，方便依時間排序）
export async function recordAnalysis(data: {
  petType: "dog" | "cat";
  petName?: string;
  petAge?: string;
  symptoms: string;
  severity: string;
  result: unknown;
  imageUrl?: string;
  userId?: string;
}): Promise<AnalysisRecord> {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const record: AnalysisRecord = { ...data, id, createdAt };
  await put(
    `${folderFor(data.userId)}${createdAt}_${id}.json`,
    JSON.stringify(record),
    {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    }
  );
  return record;
}

// 讀出所有分析紀錄，最新的在最前面（後台用）
//
// 路徑開頭不再是時間（分資料夾了），所以要下載後改用 createdAt 排序。
export async function listAnalyses(limit = 200): Promise<AnalysisRecord[]> {
  const { blobs } = await list({ prefix: PREFIX, limit });
  const records = await Promise.all(
    blobs
      .filter((b) => b.pathname.endsWith(".json"))
      .map((b) => fetchJson<AnalysisRecord>(b.url))
  );
  return records
    .filter((r): r is AnalysisRecord => r !== null)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// 只讀出某個資料夾（＝某位使用者）的紀錄。只下載這一頁需要的那幾筆。
export async function listAnalysesByKey(
  key: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<AnalysisRecord[]> {
  const { limit = 20, offset = 0 } = opts;
  const { blobs } = await list({ prefix: folderForKey(key), limit: 1000 });
  const page = newestFirst(blobs.filter((b) => b.pathname.endsWith(".json")))
    .slice(offset, offset + limit);
  const records = await Promise.all(page.map((b) => fetchJson<AnalysisRecord>(b.url)));
  return records.filter((r): r is AnalysisRecord => r !== null);
}

export async function countAnalysesByKey(key: string): Promise<number> {
  const { blobs } = await list({ prefix: folderForKey(key), limit: 1000 });
  return blobs.filter((b) => b.pathname.endsWith(".json")).length;
}

// 取單一筆紀錄。不在這個資料夾裡（＝不是他的）就回 null。
export async function getAnalysisByKey(
  key: string,
  id: string
): Promise<AnalysisRecord | null> {
  const { blobs } = await list({ prefix: folderForKey(key), limit: 1000 });
  const match = blobs.find((b) => b.pathname.endsWith(`_${id}.json`));
  return match ? await fetchJson<AnalysisRecord>(match.url) : null;
}

export async function listAnalysesByUser(
  userId: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<AnalysisRecord[]> {
  return listAnalysesByKey(userKey(userId), opts);
}

export async function countAnalysesByUser(userId: string): Promise<number> {
  return countAnalysesByKey(userKey(userId));
}

// 一次性搬遷：把舊的平放紀錄（analyses/<時間>_<id>.json）移進使用者資料夾。
// 可重複執行；已搬過的會跳過。
export async function migrateFlatAnalyses(): Promise<{
  moved: number;
  skipped: number;
  failed: number;
}> {
  const { blobs } = await list({ prefix: PREFIX, limit: 1000 });
  const flat = blobs.filter((b) => {
    const rest = b.pathname.slice(PREFIX.length);
    return rest.endsWith(".json") && !rest.includes("/");
  });

  let moved = 0;
  let skipped = 0;
  let failed = 0;

  for (const b of flat) {
    const rec = await fetchJson<AnalysisRecord>(b.url);
    if (!rec) {
      failed++;
      continue;
    }
    const target = `${folderFor(rec.userId)}${rec.createdAt}_${rec.id}.json`;
    const existing = await list({ prefix: target, limit: 1 });
    if (existing.blobs.some((x) => x.pathname === target)) {
      await del(b.url); // 已經搬過，刪掉舊檔避免後台看到兩次
      skipped++;
      continue;
    }
    try {
      await put(target, JSON.stringify(rec), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
      });
      await del(b.url);
      moved++;
    } catch (e) {
      console.error("搬遷失敗", b.pathname, e);
      failed++;
    }
  }

  return { moved, skipped, failed };
}
