"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "登入失敗");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("網路連線出現問題，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10 mb-4">
            <Lock className="h-6 w-6 text-[var(--primary)]" />
          </div>
          <h1 className="text-xl font-semibold">後台登入</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            請輸入管理密碼以查看分析紀錄
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="管理密碼"
            autoFocus
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm outline-none focus:border-[var(--primary)] transition-colors"
          />

          {error && (
            <p className="rounded-lg bg-[var(--destructive)]/10 px-4 py-2 text-sm text-[var(--destructive)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || password.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                登入中…
              </>
            ) : (
              "登入"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
