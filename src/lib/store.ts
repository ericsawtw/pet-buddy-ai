import { put, list } from "@vercel/blob";
import { randomUUID } from "crypto";

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
  userId?: string; // 提交者的 Google 帳號 ID（會員制）
};

const PREFIX = "analyses/";

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

// 把一筆分析存進 Blob（檔名以 ISO 時間開頭，方便依時間排序）
export async function recordAnalysis(data: {
  petType: "dog" | "cat";
  petName?: string;
  petAge?: string;
  symptoms: string;
  severity: string;
  result: unknown;
  imageUrl?: string;
  userId?: string;
}): Promise<void> {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const record: AnalysisRecord = { ...data, id, createdAt };
  await put(`${PREFIX}${createdAt}_${id}.json`, JSON.stringify(record), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

// 讀出所有分析紀錄，最新的在最前面
export async function listAnalyses(limit = 200): Promise<AnalysisRecord[]> {
  const { blobs } = await list({ prefix: PREFIX, limit });
  // 檔名以 ISO 時間開頭，字串反向排序即為由新到舊
  const sorted = [...blobs].sort((a, b) =>
    a.pathname < b.pathname ? 1 : -1
  );
  const records = await Promise.all(
    sorted.map(async (b) => {
      try {
        const res = await fetch(b.url, { cache: "no-store" });
        if (!res.ok) return null;
        return (await res.json()) as AnalysisRecord;
      } catch {
        return null;
      }
    })
  );
  return records.filter((r): r is AnalysisRecord => r !== null);
}

// 只讀出某個會員自己的分析紀錄
export async function listAnalysesByUser(
  userId: string,
  limit = 200
): Promise<AnalysisRecord[]> {
  const all = await listAnalyses(limit);
  return all.filter((r) => r.userId === userId);
}
