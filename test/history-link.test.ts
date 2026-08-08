import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import {
  historyListUrl,
  historyRecordUrl,
  verifyHistoryLink,
} from "@/lib/history-link";

const KEY = "a".repeat(64);
const q = (url: string) => Object.fromEntries(new URL(url).searchParams);

describe("簽章連結", () => {
  it("正確的列表連結通得過", () => {
    const p = q(historyListUrl(KEY));
    expect(verifyHistoryLink({ key: p.k, exp: p.e, sig: p.s }).ok).toBe(true);
  });

  it("正確的單筆連結通得過", () => {
    const p = q(historyRecordUrl(KEY, "rec-1"));
    expect(verifyHistoryLink({ key: p.k, id: "rec-1", exp: p.e, sig: p.s }).ok).toBe(true);
  });

  it("網址不含原始 LINE ID，只有雜湊過的資料夾名稱", () => {
    const url = historyRecordUrl(KEY, "rec-1");
    expect(url).toContain(KEY);
    expect(url.startsWith("https://")).toBe(true);
  });

  it("改掉簽章就不通過", () => {
    const p = q(historyListUrl(KEY));
    const tampered = p.s.slice(0, -1) + (p.s.endsWith("A") ? "B" : "A");
    expect(verifyHistoryLink({ key: p.k, exp: p.e, sig: tampered }).ok).toBe(false);
  });

  it("換成別人的資料夾就不通過", () => {
    const p = q(historyListUrl(KEY));
    expect(verifyHistoryLink({ key: "b".repeat(64), exp: p.e, sig: p.s }).ok).toBe(false);
  });

  it("自己延長有效期不通過", () => {
    const p = q(historyListUrl(KEY));
    const later = String(Number(p.e) + 365 * 24 * 3600 * 1000);
    expect(verifyHistoryLink({ key: p.k, exp: later, sig: p.s }).ok).toBe(false);
  });

  it("拿某一筆的簽章去看另一筆不通過", () => {
    const p = q(historyRecordUrl(KEY, "rec-1"));
    expect(verifyHistoryLink({ key: p.k, id: "rec-2", exp: p.e, sig: p.s }).ok).toBe(false);
  });

  it("列表的簽章不能拿來看單筆", () => {
    const p = q(historyListUrl(KEY));
    expect(verifyHistoryLink({ key: p.k, id: "rec-1", exp: p.e, sig: p.s }).ok).toBe(false);
  });

  it("缺少任何一個參數都不通過", () => {
    const p = q(historyListUrl(KEY));
    expect(verifyHistoryLink({ key: undefined, exp: p.e, sig: p.s }).ok).toBe(false);
    expect(verifyHistoryLink({ key: p.k, exp: undefined, sig: p.s }).ok).toBe(false);
    expect(verifyHistoryLink({ key: p.k, exp: p.e, sig: undefined }).ok).toBe(false);
  });

  it("簽章正確但已過期，回報 expired 而不是 invalid", () => {
    // 過期要跟偽造分開，過期的人才看得到「回 LINE 重新取得連結」的指引
    const exp = "1";
    const sig = createHmac("sha256", process.env.SESSION_SECRET as string)
      .update(`${KEY}..${exp}`)
      .digest("base64url");
    const result = verifyHistoryLink({ key: KEY, exp, sig });
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("亂填的有效期不通過", () => {
    const sig = createHmac("sha256", process.env.SESSION_SECRET as string)
      .update(`${KEY}..abc`)
      .digest("base64url");
    expect(verifyHistoryLink({ key: KEY, exp: "abc", sig }).ok).toBe(false);
  });

  it("有效期是 30 天左右", () => {
    const p = q(historyListUrl(KEY));
    const days = (Number(p.e) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
  });
});
