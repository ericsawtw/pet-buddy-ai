import { put, list } from "@vercel/blob";

// 記錄哪些 LINE 使用者是「管理員」（收匯款回報通知）
const PATH = "line-config/owners.json";

type OwnersDoc = { owners: string[] };

async function read(): Promise<OwnersDoc> {
  const { blobs } = await list({ prefix: PATH, limit: 1 });
  const match = blobs.find((b) => b.pathname === PATH);
  if (match) {
    try {
      const res = await fetch(match.url, { cache: "no-store" });
      if (res.ok) return (await res.json()) as OwnersDoc;
    } catch {
      // ignore
    }
  }
  return { owners: [] };
}

export async function getOwnerIds(): Promise<string[]> {
  return (await read()).owners;
}

export async function addOwner(lineUserId: string): Promise<void> {
  const doc = await read();
  if (!doc.owners.includes(lineUserId)) doc.owners.push(lineUserId);
  await put(PATH, JSON.stringify(doc), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}
