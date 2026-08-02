import { Suspense } from "react";
import ReportForm from "./ReportForm";

export const dynamic = "force-dynamic";

export default function LineReportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">載入中…</div>}>
      <ReportForm />
    </Suspense>
  );
}
