import { describe, it, expect } from "vitest";
import { put, debugPaths } from "./fake-blob";
import {
  recordAnalysis,
  listAnalyses,
  listAnalysesByKey,
  listAnalysesByUser,
  countAnalysesByUser,
  getAnalysisByKey,
  migrateFlatAnalyses,
  userKey,
  type AnalysisRecord,
} from "@/lib/store";

const ALICE = "line:UALICE";
const BOB = "105319033436059212";

const tick = () => new Promise((r) => setTimeout(r, 2));

async function add(userId: string | undefined, symptoms: string) {
  const rec = await recordAnalysis({
    petType: "dog",
    symptoms,
    severity: "yellow",
    result: { severity: "yellow", severityLabel: "建議觀察" },
    imageUrl: "https://example.com/x.jpg",
    userId,
  });
  await tick(); // 讓每筆的時間戳不同，排序才有確定的答案
  return rec;
}

describe("分析紀錄的儲存與讀取", () => {
  it("每位使用者的紀錄放在自己的資料夾", async () => {
    await add(ALICE, "食慾不好");
    await add(BOB, "眼睛有分泌物");

    const paths = debugPaths();
    expect(paths.some((p) => p.startsWith(`analyses/u/${userKey(ALICE)}/`))).toBe(true);
    expect(paths.some((p) => p.startsWith(`analyses/u/${userKey(BOB)}/`))).toBe(true);
  });

  it("資料夾名稱看不出是誰", async () => {
    await add(ALICE, "食慾不好");
    for (const p of debugPaths()) expect(p).not.toContain("UALICE");
  });

  it("沒有 userId 的訪客紀錄放 anon", async () => {
    await add(undefined, "訪客測試");
    expect(debugPaths().some((p) => p.startsWith("analyses/anon/"))).toBe(true);
  });

  it("只讀得到自己的紀錄", async () => {
    await add(ALICE, "A 的症狀");
    await add(BOB, "B 的症狀");

    const mine = await listAnalysesByUser(ALICE);
    expect(mine.map((r) => r.symptoms)).toEqual(["A 的症狀"]);
  });

  it("最新的排在最前面", async () => {
    await add(ALICE, "第一筆");
    await add(ALICE, "第二筆");
    await add(ALICE, "第三筆");

    const list = await listAnalysesByUser(ALICE);
    expect(list.map((r) => r.symptoms)).toEqual(["第三筆", "第二筆", "第一筆"]);
  });

  it("limit 與 offset 可以分頁", async () => {
    for (let i = 1; i <= 5; i++) await add(ALICE, `第 ${i} 筆`);

    const page1 = await listAnalysesByUser(ALICE, { limit: 2 });
    const page2 = await listAnalysesByUser(ALICE, { limit: 2, offset: 2 });
    expect(page1.map((r) => r.symptoms)).toEqual(["第 5 筆", "第 4 筆"]);
    expect(page2.map((r) => r.symptoms)).toEqual(["第 3 筆", "第 2 筆"]);
  });

  it("算得出總筆數", async () => {
    for (let i = 0; i < 4; i++) await add(ALICE, `第 ${i}`);
    await add(BOB, "別人的");
    expect(await countAnalysesByUser(ALICE)).toBe(4);
    expect(await countAnalysesByUser(BOB)).toBe(1);
  });

  it("沒有紀錄時回空陣列而不是壞掉", async () => {
    expect(await listAnalysesByUser("line:UNOBODY")).toEqual([]);
    expect(await countAnalysesByUser("line:UNOBODY")).toBe(0);
  });

  it("拿得到自己的單一筆", async () => {
    const rec = await add(ALICE, "想看的那筆");
    const got = await getAnalysisByKey(userKey(ALICE), rec.id);
    expect(got?.symptoms).toBe("想看的那筆");
  });

  it("拿別人的 id 查不到（就算知道 id 也看不到）", async () => {
    const bobRec = await add(BOB, "B 的隱私");
    const got = await getAnalysisByKey(userKey(ALICE), bobRec.id);
    expect(got).toBeNull();
  });

  it("查不存在的 id 回 null", async () => {
    await add(ALICE, "x");
    expect(await getAnalysisByKey(userKey(ALICE), "不存在")).toBeNull();
  });

  it("後台看得到所有人的紀錄，且依時間新到舊", async () => {
    await add(ALICE, "先發生");
    await add(BOB, "後發生");

    const all = await listAnalyses();
    expect(all.map((r) => r.symptoms)).toEqual(["後發生", "先發生"]);
  });
});

describe("既有紀錄搬遷", () => {
  async function putFlat(rec: Partial<AnalysisRecord> & { id: string; createdAt: string }) {
    await put(
      `analyses/${rec.createdAt}_${rec.id}.json`,
      JSON.stringify({
        petType: "dog",
        symptoms: "舊資料",
        severity: "yellow",
        result: {},
        ...rec,
      })
    );
  }

  it("把平放的舊檔移進使用者資料夾並刪掉舊檔", async () => {
    await putFlat({ id: "r1", createdAt: "2026-06-16T05:09:14.801Z", userId: BOB });
    await putFlat({ id: "r2", createdAt: "2026-08-07T06:30:26.756Z", userId: ALICE });

    const result = await migrateFlatAnalyses();
    expect(result).toEqual({ moved: 2, skipped: 0, failed: 0 });

    const paths = debugPaths();
    expect(paths.filter((p) => p.startsWith("analyses/") && !p.slice(9).includes("/"))).toEqual([]);
    expect(await countAnalysesByUser(ALICE)).toBe(1);
    expect(await countAnalysesByUser(BOB)).toBe(1);
  });

  it("搬遷不會弄丟或改動內容", async () => {
    await putFlat({
      id: "r1",
      createdAt: "2026-08-01T06:35:17.497Z",
      userId: BOB,
      symptoms: "耳朵少一隻",
      severity: "yellow",
    });
    const before = await listAnalyses();
    await migrateFlatAnalyses();
    const after = await listAnalyses();

    expect(after).toEqual(before);
  });

  it("沒有 userId 的舊紀錄搬到 anon", async () => {
    await putFlat({ id: "r1", createdAt: "2026-06-10T06:59:00.391Z" });
    await migrateFlatAnalyses();
    expect(debugPaths().some((p) => p.startsWith("analyses/anon/"))).toBe(true);
  });

  it("重複執行不會產生重複紀錄", async () => {
    await putFlat({ id: "r1", createdAt: "2026-08-01T06:35:17.497Z", userId: BOB });
    await migrateFlatAnalyses();
    const second = await migrateFlatAnalyses();

    expect(second).toEqual({ moved: 0, skipped: 0, failed: 0 });
    expect(await countAnalysesByUser(BOB)).toBe(1);
  });

  it("沒有東西可搬時安靜結束", async () => {
    expect(await migrateFlatAnalyses()).toEqual({ moved: 0, skipped: 0, failed: 0 });
  });

  it("搬遷後歷史紀錄讀得到（就是 Jason 那 8 筆的情境）", async () => {
    await putFlat({ id: "r1", createdAt: "2026-08-07T06:30:26.756Z", userId: ALICE });
    await putFlat({ id: "r2", createdAt: "2026-08-07T06:57:01.548Z", userId: ALICE });
    await migrateFlatAnalyses();

    const list = await listAnalysesByKey(userKey(ALICE), { limit: 5 });
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe("r2"); // 新的在前
  });
});
