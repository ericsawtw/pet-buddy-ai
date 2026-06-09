import { LogIn } from "lucide-react";

const LOGIN_URL = "/api/auth/google/login";

function LoginButton({ label }: { label: string }) {
  return (
    <a
      href={LOGIN_URL}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-[var(--primary)]/30 transition-transform hover:scale-[1.02]"
    >
      <LogIn className="h-5 w-5" />
      {label}
    </a>
  );
}

// 登入前的首頁：介紹服務價值、使用方式、範例，引導登入
export default function LoginGate() {
  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="px-5 pt-12 pb-10 text-center sm:pt-16">
        <div className="mx-auto max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-[var(--primary)]">
            🐾 AI 守護你的毛孩 24 小時
          </span>
          <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">
            毛孩管家
            <br />
            <span className="text-[var(--primary)]">你的寵物 AI 健康助手</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-[var(--foreground)]/80">
            毛孩不舒服卻不會說？<strong>拍張照、講一下狀況</strong>，AI 30 秒內給你
            <strong>紅黃綠燈</strong>判斷，告訴你該怎麼處理、要不要送醫。
          </p>
          <div className="mt-8">
            <LoginButton label="用 Google 登入，免費試 3 次" />
          </div>
          <p className="mt-3 text-xs text-[var(--muted-foreground)]">
            🐶 支援狗狗 · 🐱 支援貓咪 · 登入即用，免下載
          </p>
        </div>
      </section>

      {/* 三步驟 */}
      <section className="bg-[var(--muted)]/60 px-5 py-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold">怎麼用？三步驟</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {[
              { n: "1", icon: "📸", t: "拍照 + 講症狀", d: "拍下毛孩不舒服的地方，用打字描述狀況（越詳細越準）。" },
              { n: "2", icon: "🤖", t: "AI 分析 30 秒", d: "AI 看照片＋讀症狀，立刻給出初步健康分析。" },
              { n: "3", icon: "🚦", t: "紅黃綠燈建議", d: "一看就懂的嚴重程度、可能原因、居家照護與就醫建議。" },
            ].map((s) => (
              <div
                key={s.n}
                className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-[var(--border)]"
              >
                <div className="text-4xl">{s.icon}</div>
                <h3 className="mt-3 font-bold">
                  {s.n}. {s.t}
                </h3>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 範例結果 */}
      <section className="px-5 py-12">
        <div className="mx-auto max-w-md">
          <h2 className="text-center text-2xl font-bold">分析結果長這樣</h2>
          <p className="mt-2 text-center text-sm text-[var(--muted-foreground)]">
            （以下為示意範例）
          </p>
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-semibold text-amber-800">🟡 黃燈 · 建議近期就醫</p>
              <p className="mt-1 text-lg font-bold text-amber-900">波比的初步分析</p>
              <p className="mt-2 text-sm text-amber-800">
                老年犬眼睛混濁多與白內障有關，雖非急症，但建議近期讓獸醫檢查視力與眼壓。
              </p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[var(--border)]">
              <p className="font-bold">🔍 可能原因</p>
              <p className="mt-2 text-sm">
                <span className="font-medium">白內障</span>
                <span className="text-[var(--muted-foreground)]">（可能性高）— 高齡犬常見的水晶體混濁</span>
              </p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--muted)] p-5">
              <p className="font-bold">🩺 就醫建議</p>
              <p className="mt-2 text-sm">
                近期預約眼科檢查，並告訴醫生混濁出現多久、有沒有撞到東西。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 能判斷什麼 */}
      <section className="bg-[var(--muted)]/60 px-5 py-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold">這些狀況都能先問問看</h2>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ["🩹", "皮膚 / 掉毛異常"],
              ["🤮", "嘔吐 / 拉肚子"],
              ["🍽️", "食慾不振"],
              ["🦴", "走路一跛一跛"],
              ["👁️", "眼睛紅 / 混濁"],
              ["👂", "一直抓耳朵"],
              ["😴", "精神不好 / 嗜睡"],
              ["🦷", "口臭 / 牙齒"],
              ["❓", "其他說不上來的怪怪的"],
            ].map(([icon, label]) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-xl bg-white px-3 py-3 text-sm font-medium shadow-sm ring-1 ring-[var(--border)]"
              >
                <span className="text-lg">{icon}</span>
                {label}
              </div>
            ))}
          </div>
          <p className="mt-5 text-center text-xs text-[var(--muted-foreground)]">
            ⚠️ 提供的是參考建議，不是醫療診斷；緊急狀況請立即送醫。
          </p>
        </div>
      </section>

      {/* 為什麼用 */}
      <section className="px-5 py-12">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-2xl font-bold">為什麼飼主都在用？</h2>
          <ul className="mt-8 space-y-4">
            {[
              ["🌙", "半夜也能問", "獸醫沒開門、又擔心得睡不著？先問毛孩管家，心裡有個底。"],
              ["⏱️", "30 秒有方向", "馬上知道是「在家觀察」還是「該衝急診」，不再乾著急。"],
              ["🚦", "紅黃綠燈最好懂", "不用看一堆專業術語，顏色一看就知道嚴不嚴重。"],
              ["💝", "溫暖又貼心", "用台灣用語、像朋友一樣陪你，給你安心感。"],
            ].map(([icon, t, d]) => (
              <li key={t} className="flex items-start gap-4">
                <span className="text-2xl">{icon}</span>
                <div>
                  <p className="font-bold">{t}</p>
                  <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 最終 CTA */}
      <section className="px-5 pb-16 text-center">
        <div className="mx-auto max-w-xl rounded-3xl bg-[var(--primary)] px-6 py-12 text-white">
          <h2 className="text-2xl font-black sm:text-3xl">現在就幫毛孩做一次健康檢查</h2>
          <p className="mt-3 text-white/90">用 Google 登入，新會員免費試用 3 次</p>
          <div className="mt-7">
            <a
              href={LOGIN_URL}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-semibold text-[var(--primary)] shadow-lg transition-transform hover:scale-[1.02]"
            >
              <LogIn className="h-5 w-5" />
              用 Google 登入，免費試 3 次
            </a>
          </div>
        </div>
      </section>

      {/* 頁尾 */}
      <footer className="border-t border-[var(--border)] px-5 py-8 text-center text-sm text-[var(--muted-foreground)]">
        <p className="font-medium text-[var(--foreground)]">毛孩管家 PetBuddy AI</p>
        <p className="mt-1">
          <a href="https://careyourpet.net" className="text-[var(--primary)] hover:underline">
            careyourpet.net
          </a>
        </p>
        <p className="mt-3 text-xs">
          ⚠️ 本服務提供的健康建議僅供參考，不構成醫療診斷。如有緊急狀況請立即就醫。
        </p>
      </footer>
    </main>
  );
}
