import { put, list, del } from "@vercel/blob";
import { createHmac, randomUUID } from "crypto";

// 一位 LINE 使用者「待分析」的照片（等他描述症狀）
export type LinePending = {
  imageUrl: string;
  mediaType: "image/jpeg" | "image/png";
};

export type LineUser = {
  lineUserId: string;
  freeUsesRemaining: number;
  paidCredits: number;
  createdAt: string;
  pending?: LinePending | null;
};

// 剩餘可用次數（免費 + 付費）
export function remainingCredits(u: LineUser): number {
  return u.freeUsesRemaining + (u.paidCredits ?? 0);
}

const PREFIX = "line-users/";
const LINE_FREE_QUOTA = 3; // 每個 LINE 用戶的免費次數（之後收費上線可調整）
const KEEP_VERSIONS = 3; // 每位使用者保留幾份歷史版本

// 用 SESSION_SECRET 把 lineUserId 雜湊成 Blob 路徑（隱私，檔名猜不出）
function hashFor(lineUserId: string): string {
  return createHmac("sha256", process.env.SESSION_SECRET || "")
    .update("line:" + lineUserId)
    .digest("hex");
}

// 這位使用者的資料夾。每次存檔都在裡面放一個「新檔案」，不覆寫舊的。
//
// 為什麼不覆寫：Blob 的公開網址帶 30 天 CDN 快取，覆寫後同一個網址可能繼續
// 回舊內容長達一分鐘（實測讀到 61 秒前的資料）。那會讓「剛存的 pending 讀不到」、
// 「扣完次數讀回舊數字」。全新檔案的網址從沒被快取過，讀到的必定是最新的。
function folderFor(lineUserId: string): string {
  return `${PREFIX}${hashFor(lineUserId)}/`;
}

// 舊版路徑（單一檔案覆寫制）。只在使用者還沒有新版檔案時讀一次，用於升級。
function legacyPathFor(lineUserId: string): string {
  return `${PREFIX}${hashFor(lineUserId)}.json`;
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

function normalize(u: LineUser): LineUser {
  u.paidCredits = u.paidCredits ?? 0; // 舊資料相容
  return u;
}

// 檔名以 ISO 時間開頭，字串反向排序即為由新到舊
function newestFirst<T extends { pathname: string }>(blobs: T[]): T[] {
  return [...blobs].sort((a, b) => (a.pathname < b.pathname ? 1 : -1));
}

// 決定新檔名的時間戳，確保一定排在現有最新版本之後。
//
// 直接用 new Date() 的話，同一毫秒內連續存兩次會產生兩個時間戳相同的檔名，
// 先後順序就落到後面那段隨機 UUID 上 —— 讀取時可能挑到舊的那一份，造成
// pending 遺失或次數少扣。同一個請求裡「建立使用者後立刻存檔」就會踩到。
function nextStamp(newestPathname: string | undefined, folder: string): string {
  const now = Date.now();
  if (!newestPathname) return new Date(now).toISOString();
  const name = newestPathname.slice(folder.length);
  const prev = Date.parse(name.slice(0, name.indexOf("_")));
  return new Date(Number.isFinite(prev) && prev >= now ? prev + 1 : now).toISOString();
}

// 存檔：寫一份新版本，再把過舊的版本清掉（清理失敗不影響主流程）
async function save(u: LineUser): Promise<void> {
  const folder = folderFor(u.lineUserId);
  const existing = newestFirst((await list({ prefix: folder, limit: 100 })).blobs);
  const stamp = nextStamp(existing[0]?.pathname, folder);

  await put(`${folder}${stamp}_${randomUUID()}.json`, JSON.stringify(u), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });

  try {
    // 剛寫進去的那份也算一份，所以舊的只留 KEEP_VERSIONS - 1 份
    await Promise.all(existing.slice(KEEP_VERSIONS - 1).map((b) => del(b.url)));
  } catch (e) {
    console.error("清理 line-user 舊版本失敗", e);
  }
}

// 取得（或初次建立）一位 LINE 使用者
export async function getLineUser(lineUserId: string): Promise<LineUser> {
  const folder = folderFor(lineUserId);
  const { blobs } = await list({ prefix: folder, limit: 100 });
  const newest = newestFirst(blobs)[0];
  if (newest) {
    const u = await fetchJson<LineUser>(newest.url);
    if (u) return normalize(u);
  }

  // 還沒有新版檔案 → 看看有沒有舊版單檔，有就原樣升級（次數不能弄丟）
  const legacy = await readLegacy(lineUserId);
  if (legacy) {
    await save(legacy);
    return legacy;
  }

  const fresh: LineUser = {
    lineUserId,
    freeUsesRemaining: LINE_FREE_QUOTA,
    paidCredits: 0,
    createdAt: new Date().toISOString(),
    pending: null,
  };
  await save(fresh);
  return fresh;
}

// 讀舊版單一檔案（升級用）。舊檔保留不刪，萬一要回頭查還在。
async function readLegacy(lineUserId: string): Promise<LineUser | null> {
  const path = legacyPathFor(lineUserId);
  const { blobs } = await list({ prefix: path, limit: 1 });
  const match = blobs.find((b) => b.pathname === path);
  if (!match) return null;
  const u = await fetchJson<LineUser>(match.url);
  return u ? normalize(u) : null;
}

// 加購次數（管理員確認匯款後呼叫）
export async function addPaidCredits(
  lineUserId: string,
  n: number
): Promise<LineUser> {
  const u = await getLineUser(lineUserId);
  u.paidCredits = (u.paidCredits ?? 0) + n;
  await save(u);
  return u;
}

// 列出所有 LINE 用戶（後台用）。路徑是雜湊過的，靠讀 JSON 內容取回 lineUserId
export async function listLineUsers(): Promise<LineUser[]> {
  const { blobs } = await list({ prefix: PREFIX, limit: 1000 });

  // 每位使用者只取最新那份；同時相容還沒升級的舊版單檔
  const newestByUser = new Map<string, string>(); // 雜湊 → blob 網址
  const legacyByUser = new Map<string, string>();
  const newestPath = new Map<string, string>();

  for (const b of blobs) {
    const rest = b.pathname.slice(PREFIX.length);
    const slash = rest.indexOf("/");
    if (slash === -1) {
      if (rest.endsWith(".json")) legacyByUser.set(rest.slice(0, -5), b.url);
      continue;
    }
    const hash = rest.slice(0, slash);
    const prev = newestPath.get(hash);
    if (!prev || prev < b.pathname) {
      newestPath.set(hash, b.pathname);
      newestByUser.set(hash, b.url);
    }
  }
  for (const [hash, url] of legacyByUser) {
    if (!newestByUser.has(hash)) newestByUser.set(hash, url);
  }

  const users = await Promise.all(
    [...newestByUser.values()].map((url) => fetchJson<LineUser>(url))
  );
  return users
    .filter((u): u is LineUser => u !== null)
    .map(normalize)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)); // 新的在前
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

// 扣一次次數（先扣免費、再扣付費）並清掉 pending。
// 回傳扣完後的使用者，呼叫端請直接用它顯示剩餘次數，不要再讀一次。
export async function consumeCredit(
  lineUserId: string
): Promise<LineUser | null> {
  const u = await getLineUser(lineUserId);
  if (remainingCredits(u) <= 0) return null;
  if (u.freeUsesRemaining > 0) u.freeUsesRemaining -= 1;
  else u.paidCredits = (u.paidCredits ?? 0) - 1;
  u.pending = null;
  await save(u);
  return u;
}
