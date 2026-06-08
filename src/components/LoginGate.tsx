import { LogIn } from "lucide-react";

// 未登入時顯示的登入門檻畫面
export default function LoginGate() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl">🐾</div>
        <h1 className="mt-4 text-3xl font-black">毛孩管家</h1>
        <p className="mt-1 text-lg font-semibold text-[var(--primary)]">
          你的寵物 AI 健康助手
        </p>
        <p className="mt-5 text-sm leading-relaxed text-[var(--muted-foreground)]">
          拍張照、講一下狀況，AI 立刻分析給你看，
          <br />
          告訴你該怎麼處理、要不要送醫。
        </p>
        <p className="mt-2 text-sm font-medium">
          請先用 Google 登入 · 新會員享 3 次免費分析
        </p>

        <a
          href="/api/auth/google/login"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-[var(--primary)]/30 transition-transform hover:scale-[1.02]"
        >
          <LogIn className="h-5 w-5" />
          用 Google 登入
        </a>

        <p className="mt-8 text-xs text-[var(--muted-foreground)]">
          careyourpet.net
        </p>
      </div>
    </main>
  );
}
