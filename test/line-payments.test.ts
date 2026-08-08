import { describe, it, expect } from "vitest";
import { put } from "./fake-blob";
import {
  recordLinePayment,
  findPaymentByLast5,
  markPaymentConfirmed,
  PLANS,
} from "@/lib/line-payments";

async function makePending(last5: string, planKey = "three") {
  return recordLinePayment({
    lineUserId: "U" + last5,
    planKey,
    last5,
    transferAt: "2026-08-07 15:00",
  });
}

describe("匯款開通（不能重複加值）", () => {
  it("剛回報的匯款是待核帳", async () => {
    await makePending("12345");
    const found = await findPaymentByLast5("12345");
    expect(found?.confirmed).toBe(false);
    expect(found?.rec.credits).toBe(3);
  });

  it("標記開通後「立刻」再查，必須是已開通", async () => {
    // 舊寫法是覆寫原紀錄的 status，在 CDN 快取下這裡仍會回 pending，
    // 於是連按兩次「開通」就把同一筆加值兩次。
    const rec = await makePending("12345");
    await findPaymentByLast5("12345"); // 先查一次，讓快取記住舊內容
    await markPaymentConfirmed(rec);

    const again = await findPaymentByLast5("12345");
    expect(again?.confirmed).toBe(true);
  });

  it("連續查十次都是已開通", async () => {
    const rec = await makePending("12345");
    await markPaymentConfirmed(rec);
    for (let i = 0; i < 10; i++) {
      expect((await findPaymentByLast5("12345"))?.confirmed).toBe(true);
    }
  });

  it("重複標記同一筆不會出錯", async () => {
    const rec = await makePending("12345");
    await markPaymentConfirmed(rec);
    await markPaymentConfirmed(rec);
    expect((await findPaymentByLast5("12345"))?.confirmed).toBe(true);
  });

  it("同一組末五碼有新的待核帳時，優先回待核帳那筆", async () => {
    const old = await makePending("12345", "single");
    await markPaymentConfirmed(old);
    await new Promise((r) => setTimeout(r, 2));
    const fresh = await makePending("12345", "ten");

    const found = await findPaymentByLast5("12345");
    expect(found?.confirmed).toBe(false);
    expect(found?.rec.id).toBe(fresh.id);
    expect(found?.rec.credits).toBe(PLANS.ten.credits);
  });

  it("舊資料只有 status=confirmed、沒有標記檔，也算已開通", async () => {
    const submittedAt = "2026-07-01T02:00:00.000Z";
    await put(
      `line-payments/${submittedAt}_old-id.json`,
      JSON.stringify({
        id: "old-id",
        lineUserId: "UOLD",
        planKey: "single",
        planLabel: "單次",
        amount: 59,
        credits: 1,
        last5: "99999",
        transferAt: "2026-07-01 10:00",
        status: "confirmed",
        submittedAt,
        confirmedAt: submittedAt,
      })
    );
    const found = await findPaymentByLast5("99999");
    expect(found?.confirmed).toBe(true);
  });

  it("查無此末五碼回 null", async () => {
    await makePending("12345");
    expect(await findPaymentByLast5("00000")).toBeNull();
  });

  it("不同末五碼互不影響", async () => {
    const a = await makePending("11111", "single");
    await makePending("22222", "ten");
    await markPaymentConfirmed(a);

    expect((await findPaymentByLast5("11111"))?.confirmed).toBe(true);
    expect((await findPaymentByLast5("22222"))?.confirmed).toBe(false);
  });

  it("方案的次數與金額對得上", async () => {
    expect(PLANS.single).toMatchObject({ amount: 59, credits: 1 });
    expect(PLANS.three).toMatchObject({ amount: 149, credits: 3 });
    expect(PLANS.ten).toMatchObject({ amount: 399, credits: 10 });
  });

  it("未知方案會被擋下", async () => {
    await expect(
      recordLinePayment({
        lineUserId: "U1",
        planKey: "免費送",
        last5: "12345",
        transferAt: "now",
      })
    ).rejects.toThrow();
  });
});
