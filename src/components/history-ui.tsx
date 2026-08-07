import type { AnalyzeResponse } from "@/lib/analyze-core";

const SEVERITY: Record<string, { label: string; cls: string }> = {
  green: { label: "🟢 狀況穩定", cls: "bg-[var(--success)]/15 text-[var(--success)]" },
  yellow: { label: "🟡 建議觀察", cls: "bg-[var(--warning)]/15 text-[var(--warning)]" },
  red: { label: "🔴 建議就醫", cls: "bg-[var(--destructive)]/15 text-[var(--destructive)]" },
};

// 紀錄裡的 result 是 AI 回傳的完整 JSON，存成 unknown，用到時才收斂型別
export function asResult(result: unknown): Partial<AnalyzeResponse> {
  return (result ?? {}) as Partial<AnalyzeResponse>;
}

export function SeverityBadge({
  severity,
  result,
}: {
  severity: string;
  result?: unknown;
}) {
  const base = SEVERITY[severity] ?? {
    label: severity,
    cls: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  };
  const label = asResult(result).severityLabel;
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${base.cls}`}
    >
      {label ? `${base.label.slice(0, 2)} ${label}` : base.label}
    </span>
  );
}

// 簽章連結失效時顯示的畫面
export function LinkProblem({ reason }: { reason: "expired" | "invalid" }) {
  const expired = reason === "expired";
  return (
    <main className="flex flex-1 items-center px-6 py-20">
      <div className="mx-auto max-w-md text-center">
        <p className="text-4xl">{expired ? "⏰" : "🔒"}</p>
        <h1 className="mt-4 text-xl font-semibold">
          {expired ? "這個連結已經過期了" : "無法開啟這個連結"}
        </h1>
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
          {expired
            ? "紀錄還在，只是連結有時效。回到 LINE 點一次「歷史紀錄」就會拿到新的連結 🐾"
            : "連結不完整或不正確。請回到 LINE 點「歷史紀錄」重新開啟 🐾"}
        </p>
      </div>
    </main>
  );
}
