import Image from "next/image";
import { verifyHistoryLink, historyListUrl } from "@/lib/history-link";
import { getAnalysisByKey } from "@/lib/store";
import { formatTaipei } from "@/lib/line-history";
import { LinkProblem, SeverityBadge, asResult } from "@/components/history-ui";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ k?: string; e?: string; s?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const check = verifyHistoryLink({ key: sp.k, id, exp: sp.e, sig: sp.s });
  if (!check.ok) return <LinkProblem reason={check.reason} />;

  const key = sp.k as string;
  const rec = await getAnalysisByKey(key, id);
  if (!rec) {
    return (
      <main className="flex flex-1 items-center px-6 py-20">
        <div className="mx-auto max-w-md text-center">
          <p className="text-4xl">🔍</p>
          <h1 className="mt-4 text-xl font-semibold">找不到這筆紀錄</h1>
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            它可能已經被移除了。回 LINE 點「歷史紀錄」看看其他紀錄 🐾
          </p>
        </div>
      </main>
    );
  }

  const r = asResult(rec.result);

  return (
    <main className="flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <article className="mx-auto max-w-2xl">
        <a
          href={historyListUrl(key)}
          className="text-sm text-[var(--muted-foreground)] underline"
        >
          ← 全部紀錄
        </a>

        <header className="mt-6">
          <SeverityBadge severity={rec.severity} result={rec.result} />
          <h1 className="mt-3 text-xl font-semibold">
            {rec.petName || (rec.petType === "cat" ? "貓咪" : "狗狗")} 的健檢報告
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {formatTaipei(rec.createdAt)}
            {rec.petAge ? ` · ${rec.petAge}` : ""}
          </p>
        </header>

        {rec.imageUrl && (
          <Image
            src={rec.imageUrl}
            alt="健檢當時的照片"
            width={800}
            height={600}
            className="mt-6 w-full rounded-2xl object-cover"
            unoptimized
          />
        )}

        <Section title="當時描述的症狀">
          <p className="whitespace-pre-wrap">{rec.symptoms}</p>
        </Section>

        {r.severityReason && (
          <Section title="AI 判斷理由">
            <p>{r.severityReason}</p>
          </Section>
        )}

        {r.possibleCauses && r.possibleCauses.length > 0 && (
          <Section title="可能原因">
            <ul className="space-y-3">
              {r.possibleCauses.map((c, i) => (
                <li key={i}>
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                    可能性 {c.likelihood}
                  </span>
                  <p className="mt-0.5 text-[var(--muted-foreground)]">
                    {c.description}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {r.homeCare && r.homeCare.length > 0 && (
          <Section title="居家照護">
            <ul className="list-disc space-y-1 pl-5">
              {r.homeCare.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </Section>
        )}

        {r.vetAdvice && (
          <Section title="就醫建議">
            <p className="whitespace-pre-wrap">{r.vetAdvice}</p>
          </Section>
        )}

        {r.dietAdvice && (
          <Section title="飲食建議">
            <p className="whitespace-pre-wrap">{r.dietAdvice}</p>
          </Section>
        )}

        {r.warning && (
          <div className="mt-6 rounded-2xl border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 p-5 text-sm">
            <p className="font-medium">⚠️ 請特別注意</p>
            <p className="mt-1 whitespace-pre-wrap">{r.warning}</p>
          </div>
        )}

        <p className="mt-10 text-center text-xs text-[var(--muted-foreground)]">
          本結果為健康參考，非獸醫診斷。如有疑慮請諮詢獸醫師。
        </p>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-[var(--border)] bg-white p-5">
      <h2 className="text-sm font-semibold text-[var(--muted-foreground)]">
        {title}
      </h2>
      <div className="mt-2 text-sm">{children}</div>
    </section>
  );
}
