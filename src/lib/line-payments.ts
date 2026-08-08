import { put, list } from "@vercel/blob";
import { randomUUID } from "crypto";

// 方案定義（B2C 定價）
export const PLANS: Record<
  string,
  { label: string; amount: number; credits: number }
> = {
  single: { label: "單次", amount: 59, credits: 1 },
  three: { label: "3 次", amount: 149, credits: 3 },
  ten: { label: "10 次", amount: 399, credits: 10 },
};

export type LinePayment = {
  id: string;
  lineUserId: string;
  planKey: string;
  planLabel: string;
  amount: number;
  credits: number;
  last5: string;
  transferAt: string;
  status: "pending" | "confirmed";
  submittedAt: string;
  confirmedAt?: string;
};

const PREFIX = "line-payments/";
// 「已開通」用另一個資料夾的空白標記檔表示，檔名就是匯款單 id。
//
// 為什麼不直接改原本那筆的 status：Blob 公開網址帶 30 天 CDN 快取，覆寫後
// 短時間內仍可能讀到舊的 "pending"。那會讓同一筆匯款被開通兩次、重複加值。
// 標記檔是全新路徑，而且只要「列檔名」就知道有沒有開通過，連下載都不用，
// 完全繞開快取。
const CONFIRMED_PREFIX = "line-payments-confirmed/";

// 建立一筆「待核帳」匯款回報
export async function recordLinePayment(data: {
  lineUserId: string;
  planKey: string;
  last5: string;
  transferAt: string;
}): Promise<LinePayment> {
  const plan = PLANS[data.planKey];
  if (!plan) throw new Error("未知方案");
  const id = randomUUID();
  const submittedAt = new Date().toISOString();
  const rec: LinePayment = {
    id,
    lineUserId: data.lineUserId,
    planKey: data.planKey,
    planLabel: plan.label,
    amount: plan.amount,
    credits: plan.credits,
    last5: data.last5,
    transferAt: data.transferAt,
    status: "pending",
    submittedAt,
  };
  await put(`${PREFIX}${submittedAt}_${id}.json`, JSON.stringify(rec), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
  return rec;
}

// 已開通的匯款單 id。檔名即 id，不必下載內容。
async function confirmedIds(): Promise<Set<string>> {
  const { blobs } = await list({ prefix: CONFIRMED_PREFIX, limit: 1000 });
  return new Set(
    blobs
      .map((b) => b.pathname.slice(CONFIRMED_PREFIX.length))
      .filter((n) => n.endsWith(".json"))
      .map((n) => n.slice(0, -5))
  );
}

export type PaymentLookup = { rec: LinePayment; confirmed: boolean };

// 依末五碼找最近一筆匯款回報，並一併回報它開通過了沒有。
// 找不到回 null；已開通的也會回傳（讓呼叫端能說「這筆已經開通過」）。
export async function findPaymentByLast5(
  last5: string
): Promise<PaymentLookup | null> {
  const [{ blobs }, done] = await Promise.all([
    list({ prefix: PREFIX, limit: 500 }),
    confirmedIds(),
  ]);
  const sorted = [...blobs].sort((a, b) => (a.pathname < b.pathname ? 1 : -1)); // 新到舊

  let confirmedHit: PaymentLookup | null = null;
  for (const b of sorted) {
    try {
      const res = await fetch(b.url, { cache: "no-store" });
      if (!res.ok) continue;
      const rec = (await res.json()) as LinePayment;
      if (rec.last5 !== last5) continue;

      // status 是舊資料的判斷方式，標記檔是新的，兩個都算數
      const isConfirmed = done.has(rec.id) || rec.status === "confirmed";
      if (!isConfirmed) return { rec, confirmed: false }; // 待核帳的優先
      confirmedHit ??= { rec, confirmed: true };
    } catch {
      // 讀不到就跳過這筆
    }
  }
  return confirmedHit;
}

// 標記為已開通。重複呼叫同一筆不會有副作用（同名檔案覆寫成一樣的內容）。
export async function markPaymentConfirmed(rec: LinePayment): Promise<void> {
  await put(
    `${CONFIRMED_PREFIX}${rec.id}.json`,
    JSON.stringify({ id: rec.id, confirmedAt: new Date().toISOString() }),
    {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    }
  );
}
