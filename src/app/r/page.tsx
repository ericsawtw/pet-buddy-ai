import Image from "next/image";
import { verifyHistoryLink, historyRecordUrl } from "@/lib/history-link";
import { listAnalysesByKey, countAnalysesByKey, type AnalysisRecord } from "@/lib/store";
import { formatTaipei } from "@/lib/line-history";
import { LinkProblem, SeverityBadge } from "@/components/history-ui";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAGE_SIZE = 20;

export default async function HistoryListPage({
  searchParams,
}: {
  searchParams: Promise<{ k?: string; e?: string; s?: string; p?: string }>;
}) {
  const sp = await searchParams;
  const check = verifyHistoryLink({ key: sp.k, exp: sp.e, sig: sp.s });
  if (!check.ok) return <LinkProblem reason={check.reason} />;

  const key = sp.k as string;
  const page = Math.max(1, Number(sp.p) || 1);
  const [records, total] = await Promise.all([
    listAnalysesByKey(key, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countAnalysesByKey(key),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold">📖 我的健檢紀錄</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          共 {total} 筆{pages > 1 ? ` · 第 ${page} / ${pages} 頁` : ""}
        </p>

        {records.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted-foreground)]">
            這一頁沒有紀錄。
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {records.map((rec) => (
              <RowCard key={rec.id} rec={rec} href={historyRecordUrl(key, rec.id)} />
            ))}
          </div>
        )}

        {pages > 1 && (
          <nav className="mt-8 flex items-center justify-between text-sm">
            {page > 1 ? (
              <a className="underline" href={pageHref(sp, page - 1)}>
                ← 上一頁
              </a>
            ) : (
              <span />
            )}
            {page < pages ? (
              <a className="underline" href={pageHref(sp, page + 1)}>
                下一頁 →
              </a>
            ) : (
              <span />
            )}
          </nav>
        )}

        <p className="mt-10 text-center text-xs text-[var(--muted-foreground)]">
          本結果為健康參考，非獸醫診斷。
        </p>
      </div>
    </main>
  );
}

function pageHref(
  sp: { k?: string; e?: string; s?: string },
  p: number
): string {
  const q = new URLSearchParams({
    k: sp.k ?? "",
    e: sp.e ?? "",
    s: sp.s ?? "",
    p: String(p),
  });
  return `/r?${q}`;
}

function RowCard({ rec, href }: { rec: AnalysisRecord; href: string }) {
  return (
    <a
      href={href}
      className="flex gap-4 rounded-2xl border border-[var(--border)] bg-white p-4 transition-colors hover:border-[var(--muted-foreground)]"
    >
      {rec.imageUrl ? (
        <Image
          src={rec.imageUrl}
          alt=""
          width={72}
          height={72}
          className="h-18 w-18 shrink-0 rounded-xl object-cover"
          style={{ width: 72, height: 72 }}
          unoptimized
        />
      ) : (
        <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-xl bg-[var(--muted)] text-xs text-[var(--muted-foreground)]" style={{ width: 72, height: 72 }}>
          無照片
        </div>
      )}
      <div className="min-w-0 flex-1">
        <SeverityBadge severity={rec.severity} result={rec.result} />
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          {formatTaipei(rec.createdAt)} ·{" "}
          {rec.petType === "cat" ? "🐱 貓咪" : "🐶 狗狗"}
        </p>
        <p className="mt-2 line-clamp-2 text-sm">{rec.symptoms}</p>
      </div>
    </a>
  );
}
