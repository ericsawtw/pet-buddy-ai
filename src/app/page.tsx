import AnalyzeForm from "@/components/AnalyzeForm";
import LoginGate from "@/components/LoginGate";
import { getSessionGoogleId } from "@/lib/session";
import { getUser } from "@/lib/users";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 主站首頁：強制 Google 登入。未登入只看到登入畫面，登入後才是會員分析工具
export default async function HomePage() {
  const googleId = await getSessionGoogleId();
  const user = googleId ? await getUser(googleId) : null;

  if (!user) {
    return <LoginGate />;
  }

  return <AnalyzeForm endpoint="/api/analyze" showAuth showBack={false} />;
}
