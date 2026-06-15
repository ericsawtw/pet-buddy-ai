import { put, list } from "@vercel/blob";

// Claude Sonnet 4.6 定價（USD / 每百萬 tokens）
const INPUT_PER_M = 3;
const OUTPUT_PER_M = 15;
const USD_TO_TWD = 32;

const PREFIX = "api-usage/";

type UsageDoc = {
  month: string;
  count: number;
  inputTokens: number;
  outputTokens: number;
};

// 以台灣時間計算當月 YYYY-MM
function monthTaipei(): string {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 7);
}

async function read(month: string): Promise<UsageDoc> {
  const base: UsageDoc = { month, count: 0, inputTokens: 0, outputTokens: 0 };
  const path = `${PREFIX}${month}.json`;
  const { blobs } = await list({ prefix: path, limit: 1 });
  const match = blobs.find((b) => b.pathname === path);
  if (!match) return base;
  try {
    const res = await fetch(match.url, { cache: "no-store" });
    if (!res.ok) return base;
    return { ...base, ...((await res.json()) as Partial<UsageDoc>) };
  } catch {
    return base;
  }
}

// 累計一次分析的實際 token 用量
export async function recordApiUsage(
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  const month = monthTaipei();
  const doc = await read(month);
  doc.count += 1;
  doc.inputTokens += inputTokens;
  doc.outputTokens += outputTokens;
  await put(`${PREFIX}${month}.json`, JSON.stringify(doc), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

// 取得本月用量與花費（給後台顯示）
export async function getMonthUsage(): Promise<{
  month: string;
  count: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  costTwd: number;
}> {
  const month = monthTaipei();
  const doc = await read(month);
  const costUsd =
    (doc.inputTokens / 1_000_000) * INPUT_PER_M +
    (doc.outputTokens / 1_000_000) * OUTPUT_PER_M;
  return {
    ...doc,
    costUsd,
    costTwd: costUsd * USD_TO_TWD,
  };
}
