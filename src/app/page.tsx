import AnalyzeForm from "@/components/AnalyzeForm";

// 主站首頁 = 會員分析工具（需 Google 登入，每會員 3 次免費）
export default function HomePage() {
  return <AnalyzeForm endpoint="/api/analyze" showAuth showBack={false} />;
}
