import { redirect } from "next/navigation";
import Image from "next/image";
import { isAuthed } from "@/lib/admin-auth";
import { listAnalyses, type AnalysisRecord } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AnalyzeResult = {
  severity: "green" | "yellow" | "red";
  severityLabel?: string;
  severityReason?: string;
  possibleCauses?: Array<{ name: string; likelihood: string; description: string }>;
  homeCare?: string[];
  vetAdvice?: string;
  dietAdvice?: string;
  warning?: string;
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

function RecordCard({ rec }: { rec: AnalysisRecord }) {
  const result = rec.result as AnalyzeResult | null;
  const sev = SEVERITY_STYLE[rec.severity] ?? {
    label: rec.severity,
    cls: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  };

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold">
              {rec.petName || "（未命名）"}
            </span>
            <span className="text-sm text-[var(--muted-foreground)]">
              {rec.petType === "dog" ? "🐶 狗狗" : "🐱 貓咪"}
              {rec.petAge ? ` · ${rec.petAge}` : ""}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            {formatTime(rec.createdAt)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${sev.cls}`}
        >
          {sev.label}
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[120px_1fr]">
        {rec.imageUrl ? (
          <a href={rec.imageUrl} target="_blank" rel="noreferrer">
            <Image
              src={rec.imageUrl}
              alt="使用者上傳的照片"
              width={120}
              height={120}
              className="h-28 w-28 rounded-xl object-cover"
              unoptimized
            />
          </a>
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-xl bg-[var(--muted)] text-xs text-[var(--muted-foreground)]">
            無照片
          </div>
        )}

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs font-medium text-[var(--muted-foreground)]">
              飼主描述的症狀
            </p>
            <p className="mt-0.5 whitespace-pre-wrap">{rec.symptoms}</p>
          </div>

          {result?.severityReason && (
            <div>
              <p className="text-xs font-medium text-[var(--muted-foreground)]">
                AI 判斷
              </p>
              <p className="mt-0.5">{result.severityReason}</p>
            </div>
          )}

          {result?.possibleCauses && result.possibleCauses.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[var(--muted-foreground)]">
                可能原因
              </p>
              <ul className="mt-0.5 list-disc space-y-0.5 pl-4">
                {result.possibleCauses.map((c, i) => (
                  <li key={i}>
                    <span className="font-medium">{c.name}</span>
                    <span className="text-[var(--muted-foreground)]">
                      （{c.likelihood}）— {c.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result?.vetAdvice && (
            <div>
              <p className="text-xs font-medium text-[var(--muted-foreground)]">
                就醫建議
              </p>
              <p className="mt-0.5">{result.vetAdvice}</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default async function AdminPage() {
  if (!(await isAuthed())) {
    redirect("/admin/login");
  }

  const records = await listAnalyses();

  return (
    <main className="flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">分析紀錄後台</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              共 {records.length} 筆紀錄（最新在最上面）
            </p>
          </div>
          <a
            href="/api/admin/logout"
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            登出
          </a>
        </div>

        {records.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted-foreground)]">
            目前還沒有任何分析紀錄。等使用者開始使用後，紀錄會出現在這裡。
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {records.map((rec) => (
              <RecordCard key={rec.id} rec={rec} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
