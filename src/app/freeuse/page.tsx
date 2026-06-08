import AnalyzeForm from "@/components/AnalyzeForm";

// 夥伴試用頁：免登入，全站每天共 10 次
export default function FreeUsePage() {
  return <AnalyzeForm endpoint="/api/analyze/free" showAuth={false} />;
}
