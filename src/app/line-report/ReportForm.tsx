"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const PLANS: Record<string, { label: string; amount: number }> = {
  single: { label: "單次方案", amount: 59 },
  three: { label: "3 次方案", amount: 149 },
  ten: { label: "10 次特價包", amount: 399 },
};

function nowLocal(): string {
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

export default function ReportForm() {
  const params = useSearchParams();
  const u = params.get("u") || "";

  const [plan, setPlan] = useState("single");
  const [last5, setLast5] = useState("");
  const [transferAt, setTransferAt] = useState(nowLocal());
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const amount = useMemo(() => PLANS[plan].amount, [plan]);

  async function submit() {
    setError("");
    if (!u) {
      setError("找不到你的帳號，請從 LINE 的「購買次數」重新進入。");
      return;
    }
    if (!/^\d{5}$/.test(last5)) {
      setError("請填寫匯款帳號後五碼（5 位數字）。");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/line/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ u, plan, last5, transferAt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "送出失敗，請稍後再試。");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError("網路錯誤，請稍後再試。");
      setStatus("error");
    }
  }

  const box = "w-full rounded-xl border border-gray-300 px-4 py-3 text-base";
  const label = "block text-sm font-semibold text-gray-700 mb-1 mt-4";

  if (status === "done") {
    return (
      <main className="min-h-screen bg-[#FDF7EE] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-white p-8 text-center shadow">
          <div className="text-5xl">✅</div>
          <h1 className="mt-3 text-xl font-bold text-gray-800">已送出待核帳款</h1>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            我們收到你的匯款回報了 🐾
            <br />
            人工確認銀行入帳後，會在 LINE 通知你並自動加值次數。
          </p>
          <p className="mt-4 text-xs text-gray-400">你可以關掉這個頁面，回到 LINE。</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDF7EE] p-6">
      <div className="mx-auto max-w-md">
        <h1 className="text-xl font-bold text-gray-800">🐾 毛孩管家 · 匯款回報</h1>
        <p className="mt-1 text-sm text-gray-500">
          已完成銀行轉帳？填一下,我們確認入帳後幫你開通次數。
        </p>

        {/* 收款帳戶 */}
        <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
          <span className="inline-block rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
            收款帳戶
          </span>
          <div className="mt-3 space-y-1 text-sm">
            <p><span className="text-gray-500">銀行　　</span>中國信託銀行</p>
            <p><span className="text-gray-500">銀行代號</span> 822</p>
            <p><span className="text-gray-500">帳號　　</span><span className="font-semibold tracking-wide">314972087423</span></p>
          </div>
        </div>

        {/* 表單 */}
        <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
          <label className={label}>購買方案</label>
          <select className={box} value={plan} onChange={(e) => setPlan(e.target.value)}>
            {Object.entries(PLANS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}｜NT${v.amount}
              </option>
            ))}
          </select>

          <label className={label}>匯款金額</label>
          <input className={`${box} font-semibold text-emerald-600`} value={amount} readOnly />

          <label className={label}>匯款帳號後五碼</label>
          <input
            className={box}
            inputMode="numeric"
            maxLength={5}
            placeholder="例如 12345"
            value={last5}
            onChange={(e) => setLast5(e.target.value.replace(/\D/g, "").slice(0, 5))}
          />

          <label className={label}>轉帳時間</label>
          <input
            type="datetime-local"
            className={box}
            value={transferAt}
            onChange={(e) => setTransferAt(e.target.value)}
          />

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

          <button
            onClick={submit}
            disabled={status === "sending"}
            className="mt-6 w-full rounded-xl bg-emerald-500 py-3.5 text-base font-bold text-white active:scale-[0.98] disabled:opacity-60"
          >
            {status === "sending" ? "送出中…" : "送出待核帳款"}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          直接匯款需人工查帳；回報後只會先進入待核帳,確認入帳前不會自動加次數。
        </p>
      </div>
    </main>
  );
}
