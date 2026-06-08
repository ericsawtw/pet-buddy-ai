import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { getSessionGoogleId } from "@/lib/session";
import { listAnalysesByUser, type AnalysisRecord } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AnalyzeResult = {
  severity: "green" | "yellow" | "red";
  severityReason?: string;
  vetAdvice?: string;
};

const SEVERITY_STYLE: Record<string, { label: string; cls: string }> = {
  green: { label: "綠燈 · 輕微", cls: "bg-[var(--success)]/15 text-[var(--success)]" },
  yellow: { label: "黃燈 · 觀察", cls: "bg-[var(--warning)]/15 text-[var(--warning)]" },
  red: { label: "紅燈 · 緊急", cls: "bg-[var(--destructive)]/15 text-[var(--destructive)]" },
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function Card({ rec }: { rec: AnalysisRecord }) {
  const result = rec.result as AnalyzeResult | null;
  const sev = SEVERITY_STYLE[rec.severity] ?? {
    label: rec.severity,
    cls: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  };
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-base font-semibold">
            {rec.petName || "（未命名）"}
          </span>
          <span className="ml-2 text-sm text-[var(--muted-foreground)]">
            {rec.petType === "dog" ? "🐶 狗狗" : "🐱 貓咪"}
            {rec.petAge ? ` · ${rec.petAge}` : ""}
          </span>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            {formatTime(rec.createdAt)}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${sev.cls}`}>
          {sev.label}
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[100px_1fr]">
        {rec.imageUrl ? (
          <a href={rec.imageUrl} target="_blank" rel="noreferrer">
            <Image
              src={rec.imageUrl}
              alt="上傳的照片"
              width={100}
              height={100}
              className="h-24 w-24 rounded-xl object-cover"
              unoptimized
            />
          </a>
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-[var(--muted)] text-xs text-[var(--muted-foreground)]">
            無照片
          </div>
        )}
        <div className="space-y-2 text-sm">
          <p className="whitespace-pre-wrap">{rec.symptoms}</p>
          {result?.severityReason && (
            <p className="text-[var(--muted-foreground)]">
              AI 判斷：{result.severityReason}
            </p>
          )}
          {result?.vetAdvice && (
            <p className="text-[var(--muted-foreground)]">
              就醫建議：{result.vetAdvice}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export default async function HistoryPage() {
  const googleId = await getSessionGoogleId();
  if (!googleId) {
    redirect("/api/auth/google/login");
  }

  const records = await listAnalysesByUser(googleId);

  return (
    <main className="flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/analyze"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          回分析
        </Link>

        <h1 className="mt-6 text-2xl font-semibold">我的分析紀錄</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          共 {records.length} 筆
        </p>

        {records.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted-foreground)]">
            你還沒有分析紀錄。回去幫毛孩做一次分析吧！
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {records.map((rec) => (
              <Card key={rec.id} rec={rec} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
