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

// 找出最近一筆「待核帳、末五碼相符」的回報（管理員確認用）
export async function findPendingByLast5(
  last5: string
): Promise<{ url: string; rec: LinePayment } | null> {
  const { blobs } = await list({ prefix: PREFIX, limit: 500 });
  const sorted = [...blobs].sort((a, b) =>
    a.pathname < b.pathname ? 1 : -1
  ); // 新到舊
  for (const b of sorted) {
    try {
      const res = await fetch(b.url, { cache: "no-store" });
      if (!res.ok) continue;
      const rec = (await res.json()) as LinePayment;
      if (rec.status === "pending" && rec.last5 === last5) {
        return { url: b.url, rec };
      }
    } catch {
      // ignore
    }
  }
  return null;
}

// 把一筆回報標記為已確認
export async function markPaymentConfirmed(rec: LinePayment): Promise<void> {
  const updated: LinePayment = {
    ...rec,
    status: "confirmed",
    confirmedAt: new Date().toISOString(),
  };
  await put(`${PREFIX}${rec.submittedAt}_${rec.id}.json`, JSON.stringify(updated), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}
