import { describe, it, expect } from "vitest";
import { put, list, debugPaths } from "./fake-blob";
import {
  getLineUser,
  setLinePending,
  consumeCredit,
  addPaidCredits,
  listLineUsers,
  remainingCredits,
} from "@/lib/line-users";
import { createHmac } from "crypto";

const UID = "U2bfe11707a6f879c4a19325e4ff146f6";

function legacyPath(lineUserId: string): string {
  const h = createHmac("sha256", process.env.SESSION_SECRET as string)
    .update("line:" + lineUserId)
    .digest("hex");
  return `line-users/${h}.json`;
}

describe("LINE 使用者資料（CDN 快取下仍要讀到最新）", () => {
  it("存了待分析照片之後，立刻重讀要看得到", async () => {
    // 這是 Jason 回報的原始症狀：傳完照片馬上打字，卻被要求重新傳照片。
    await getLineUser(UID); // 先讀一次 —— 舊寫法會在這裡把舊內容存進 CDN
    await setLinePending(UID, {
      imageUrl: "https://example.com/dog.jpg",
      mediaType: "image/jpeg",
    });

    const u = await getLineUser(UID);
    expect(u.pending?.imageUrl).toBe("https://example.com/dog.jpg");
  });

  it("連續換照片，讀到的一定是最後一張", async () => {
    for (let i = 1; i <= 5; i++) {
      await setLinePending(UID, {
        imageUrl: `https://example.com/${i}.jpg`,
        mediaType: "image/jpeg",
      });
      const u = await getLineUser(UID);
      expect(u.pending?.imageUrl).toBe(`https://example.com/${i}.jpg`);
    }
  });

  it("扣次數後回傳的剩餘數字是扣完的，不是扣之前的", async () => {
    // 原本 bot 回報「剩餘 4 次」但實際只剩 3 次，就是這裡讀到舊值。
    const before = await getLineUser(UID);
    expect(remainingCredits(before)).toBe(3);

    const after = await consumeCredit(UID);
    expect(after).not.toBeNull();
    expect(remainingCredits(after!)).toBe(2);

    const reread = await getLineUser(UID);
    expect(remainingCredits(reread)).toBe(2);
    expect(reread.pending).toBeNull();
  });

  it("先扣免費、免費用完才扣付費", async () => {
    await addPaidCredits(UID, 2);
    const seen: string[] = [];
    for (let i = 0; i < 5; i++) {
      const u = await consumeCredit(UID);
      seen.push(`${u!.freeUsesRemaining}+${u!.paidCredits}`);
    }
    expect(seen).toEqual(["2+2", "1+2", "0+2", "0+1", "0+0"]);
  });

  it("沒有次數就扣不動", async () => {
    for (let i = 0; i < 3; i++) await consumeCredit(UID);
    expect(await consumeCredit(UID)).toBeNull();
  });

  it("加值後立刻查詢，數字要正確", async () => {
    await getLineUser(UID);
    const added = await addPaidCredits(UID, 3);
    const queried = await getLineUser(UID);
    expect(remainingCredits(queried)).toBe(remainingCredits(added));
    expect(remainingCredits(queried)).toBe(6);
  });

  it("舊格式單一檔案會原樣升級，付費次數不會弄丟", async () => {
    await put(
      legacyPath(UID),
      JSON.stringify({
        lineUserId: UID,
        freeUsesRemaining: 2,
        paidCredits: 1,
        createdAt: "2026-08-02T08:49:36.837Z",
        pending: null,
      })
    );

    const u = await getLineUser(UID);
    expect(u.freeUsesRemaining).toBe(2);
    expect(u.paidCredits).toBe(1);
    expect(u.createdAt).toBe("2026-08-02T08:49:36.837Z");

    // 再讀一次不會重複升級或歸零
    const again = await getLineUser(UID);
    expect(again.paidCredits).toBe(1);
    expect(again.freeUsesRemaining).toBe(2);
  });

  it("舊資料沒有 paidCredits 欄位也不會壞", async () => {
    await put(
      legacyPath(UID),
      JSON.stringify({
        lineUserId: UID,
        freeUsesRemaining: 3,
        createdAt: "2026-06-01T00:00:00.000Z",
      })
    );
    const u = await getLineUser(UID);
    expect(u.paidCredits).toBe(0);
    expect(remainingCredits(u)).toBe(3);
  });

  it("舊版本會被清掉，不會無限累積", async () => {
    for (let i = 0; i < 8; i++) await setLinePending(UID, null);
    const versions = debugPaths().filter(
      (p) => p.startsWith("line-users/") && p.slice("line-users/".length).includes("/")
    );
    expect(versions.length).toBeLessThanOrEqual(3);
  });

  it("後台列表每位使用者只出現一次", async () => {
    await addPaidCredits("UAAA", 1);
    await addPaidCredits("UBBB", 2);
    await setLinePending("UAAA", null);
    await consumeCredit("UBBB");

    const users = await listLineUsers();
    expect(users.map((u) => u.lineUserId).sort()).toEqual(["UAAA", "UBBB"]);
  });

  it("後台列表也看得到還沒升級的舊格式使用者", async () => {
    await put(
      legacyPath("UOLD"),
      JSON.stringify({
        lineUserId: "UOLD",
        freeUsesRemaining: 1,
        paidCredits: 0,
        createdAt: "2026-06-01T00:00:00.000Z",
      })
    );
    await addPaidCredits("UNEW", 1);

    const users = await listLineUsers();
    expect(users.map((u) => u.lineUserId).sort()).toEqual(["UNEW", "UOLD"]);
  });

  it("不同使用者的資料互不干擾", async () => {
    await addPaidCredits("UAAA", 5);
    await consumeCredit("UBBB");
    expect(remainingCredits(await getLineUser("UAAA"))).toBe(8);
    expect(remainingCredits(await getLineUser("UBBB"))).toBe(2);
  });

  it("檔名看不出是誰（不含原始 LINE ID）", async () => {
    await getLineUser(UID);
    const { blobs } = await list({ prefix: "line-users/" });
    expect(blobs.length).toBeGreaterThan(0);
    for (const b of blobs) expect(b.pathname).not.toContain(UID);
  });
});
