import { describe, it, expect } from "vitest";
import { buildHistoryMessages, formatTaipei } from "@/lib/line-history";
import { verifyHistoryLink } from "@/lib/history-link";
import type { AnalysisRecord } from "@/lib/store";

const KEY = "c".repeat(64);

function rec(over: Partial<AnalysisRecord> = {}): AnalysisRecord {
  return {
    id: "rec-1",
    createdAt: "2026-08-07T06:30:26.756Z",
    petType: "dog",
    symptoms: "消化不好食欲變差",
    severity: "yellow",
    result: { severity: "yellow", severityLabel: "建議就醫" },
    imageUrl: "https://example.com/dog.jpg",
    userId: "line:UALICE",
    ...over,
  };
}

type FlexMsg = {
  type: string;
  altText?: string;
  text?: string;
  contents?: { type: string; contents: Array<Record<string, unknown>> };
};

const build = (recs: AnalysisRecord[], total: number) =>
  buildHistoryMessages(recs, total, KEY) as FlexMsg[];

function collectUris(msg: unknown): string[] {
  const out: string[] = [];
  JSON.stringify(msg, (k, v) => {
    if (k === "uri") out.push(v as string);
    return v;
  });
  return out;
}

describe("LINE 歷史紀錄卡片", () => {
  it("沒有紀錄時回引導文字，不是空白", () => {
    const msgs = build([], 0);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].type).toBe("text");
    expect(msgs[0].text).toContain("還沒有健檢紀錄");
  });

  it("有紀錄時回 carousel", () => {
    const msgs = build([rec()], 1);
    expect(msgs[0].type).toBe("flex");
    expect(msgs[0].contents?.type).toBe("carousel");
    expect(msgs[0].contents?.contents).toHaveLength(1);
  });

  it("紀錄比顯示的多時，多一張「看全部」卡片", () => {
    const five = Array.from({ length: 5 }, (_, i) => rec({ id: `rec-${i}` }));
    expect(build(five, 12)[0].contents?.contents).toHaveLength(6);
  });

  it("剛好全部顯示完就不加「看全部」", () => {
    const three = Array.from({ length: 3 }, (_, i) => rec({ id: `rec-${i}` }));
    expect(build(three, 3)[0].contents?.contents).toHaveLength(3);
  });

  it("卡片數不超過 LINE 的 12 張上限", () => {
    const many = Array.from({ length: 11 }, (_, i) => rec({ id: `rec-${i}` }));
    expect(build(many, 99)[0].contents?.contents?.length).toBeLessThanOrEqual(12);
  });

  it("訊息大小在 LINE 的 50KB 限制內", () => {
    const five = Array.from({ length: 5 }, (_, i) =>
      rec({ id: `rec-${i}`, symptoms: "很長的症狀描述".repeat(50) })
    );
    const size = Buffer.byteLength(JSON.stringify(build(five, 99)[0]));
    expect(size).toBeLessThan(50_000);
  });

  it("altText 不超過 400 字", () => {
    expect((build([rec()], 1)[0].altText ?? "").length).toBeLessThanOrEqual(400);
  });

  it("每個按鈕連結都是 https 且簽章驗得過", () => {
    const uris = collectUris(build([rec({ id: "abc" })], 9));
    expect(uris.length).toBe(2); // 一張紀錄卡 + 一張看全部

    for (const u of uris) {
      expect(u.startsWith("https://")).toBe(true);
      const url = new URL(u);
      const p = Object.fromEntries(url.searchParams);
      const id = url.pathname.match(/^\/r\/(.+)$/)?.[1];
      expect(verifyHistoryLink({ key: p.k, id, exp: p.e, sig: p.s }).ok).toBe(true);
    }
  });

  it("沒有照片的紀錄不會產生空的 hero", () => {
    const bubble = build([rec({ imageUrl: undefined })], 1)[0].contents?.contents[0];
    expect(bubble).not.toHaveProperty("hero");
  });

  it("有照片就帶 hero 圖", () => {
    const bubble = build([rec()], 1)[0].contents?.contents[0] as {
      hero?: { url: string };
    };
    expect(bubble.hero?.url).toBe("https://example.com/dog.jpg");
  });

  it("很長的症狀會被截短，卡片不會爆版", () => {
    const long = "痛".repeat(200);
    const json = JSON.stringify(build([rec({ symptoms: long })], 1));
    expect(json).not.toContain(long);
    expect(json).toContain("…");
  });

  it("沒填症狀也不會產生空字串（LINE 會拒收空文字）", () => {
    const json = JSON.stringify(build([rec({ symptoms: "   " })], 1));
    expect(json).toContain("未填症狀");
    const texts: string[] = [];
    JSON.parse(json, (k, v) => {
      if (k === "text") texts.push(v as string);
      return v;
    });
    for (const t of texts) expect(t.trim().length).toBeGreaterThan(0);
  });

  it("紅黃綠燈都有對應顏色", () => {
    for (const s of ["green", "yellow", "red"]) {
      const json = JSON.stringify(build([rec({ severity: s, result: {} })], 1));
      expect(json).toMatch(/#[0-9A-Fa-f]{6}/);
    }
  });

  it("時間用台灣時區顯示", () => {
    // 06:30 UTC = 台灣時間 14:30
    expect(formatTaipei("2026-08-07T06:30:26.756Z")).toContain("14:30");
  });
});
