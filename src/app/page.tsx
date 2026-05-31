import Link from "next/link";
import { Camera, Heart, Shield, Sparkles, Clock, Stethoscope } from "lucide-react";

export default function Home() {
  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-20 sm:py-32">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[var(--muted)] via-[var(--background)] to-[var(--accent)] opacity-60" />

        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-sm font-medium text-[var(--primary)] shadow-sm ring-1 ring-[var(--border)] animate-fade-in">
            <Sparkles className="h-4 w-4" />
            <span>AI 守護你的毛孩 24 小時</span>
          </div>

          <h1 className="text-4xl font-black tracking-tight text-[var(--foreground)] sm:text-6xl md:text-7xl animate-fade-in">
            毛孩管家
            <span className="block mt-2 bg-gradient-to-r from-[var(--primary)] to-[#d97a4a] bg-clip-text text-transparent">
              你的寵物 AI 健康助手
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--muted-foreground)] sm:text-xl animate-fade-in">
            毛孩不舒服卻不會說？<br />
            <span className="font-medium text-[var(--foreground)]">拍張照、講一下狀況</span>，
            AI 立刻分析給你看，告訴你該怎麼處理、要不要送醫。
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in">
            <Link
              href="/analyze"
              className="group inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-[var(--primary)]/30 transition-all hover:scale-105 hover:shadow-xl"
            >
              <Camera className="h-5 w-5" />
              免費試試看
            </Link>
            <Link
              href="#features"
              className="rounded-full border border-[var(--border)] bg-white/80 px-8 py-4 text-lg font-medium text-[var(--foreground)] backdrop-blur transition-colors hover:bg-white"
            >
              了解更多 ↓
            </Link>
          </div>

          <p className="mt-6 text-sm text-[var(--muted-foreground)]">
            🐾 無需註冊 · 30 秒得到結果 · 支援狗 + 貓
          </p>
        </div>

        {/* 漂浮的可愛元素 */}
        <div className="pointer-events-none absolute top-20 left-10 hidden lg:block animate-float">
          <div className="text-6xl">🐶</div>
        </div>
        <div className="pointer-events-none absolute top-32 right-12 hidden lg:block animate-float" style={{ animationDelay: "1s" }}>
          <div className="text-6xl">🐱</div>
        </div>
      </section>

      {/* 特色介紹 */}
      <section id="features" className="px-6 py-20 bg-white">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              為什麼飼主都在用
            </h2>
            <p className="mt-4 text-[var(--muted-foreground)]">
              你最關心的，我們都幫你想好了
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <FeatureCard
              icon={<Camera className="h-7 w-7" />}
              title="拍照 + 描述 = 分析"
              description="不用打一堆字。拍張毛孩的照片，講一下狀況（例如：「一直舔腳」「沒精神」），AI 馬上告訴你可能是什麼問題。"
              color="bg-orange-100 text-orange-600"
            />
            <FeatureCard
              icon={<Stethoscope className="h-7 w-7" />}
              title="嚴重程度紅綠燈"
              description="輕微（綠）／觀察（黃）／立刻就醫（紅）。 AI 幫你判斷現在要不要衝醫院，半夜不再瞎猜。"
              color="bg-green-100 text-green-600"
            />
            <FeatureCard
              icon={<Heart className="h-7 w-7" />}
              title="飲食 / 行為建議"
              description="不只看症狀，還會給你飲食、照顧建議。每隻毛孩都有專屬的健康紀錄，趨勢一目了然。"
              color="bg-pink-100 text-pink-600"
            />
            <FeatureCard
              icon={<Clock className="h-7 w-7" />}
              title="疫苗 / 體檢提醒"
              description="再也不會錯過打針時間。系統會根據毛孩年齡、品種，提前提醒你該做的健康檢查。"
              color="bg-blue-100 text-blue-600"
            />
            <FeatureCard
              icon={<Sparkles className="h-7 w-7" />}
              title="24/7 隨時可問"
              description="半夜兩點突然不對勁？不用等診所開門。AI 助手永遠在線，第一時間給你建議。"
              color="bg-purple-100 text-purple-600"
            />
            <FeatureCard
              icon={<Shield className="h-7 w-7" />}
              title="安心使用"
              description="所有資料加密儲存，不會外洩。AI 建議僅供參考，緊急狀況系統會直接建議你立刻就醫。"
              color="bg-amber-100 text-amber-600"
            />
          </div>
        </div>
      </section>

      {/* 訂閱方案 */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">選擇適合你的方案</h2>
            <p className="mt-4 text-[var(--muted-foreground)]">
              先免費試用 · 隨時可取消
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <PricingCard
              name="免費版"
              price="NT$ 0"
              period="/ 永久免費"
              description="先試試看，無壓力"
              features={[
                "1 隻寵物檔案",
                "每月 3 次 AI 分析",
                "基礎健康紀錄",
                "疫苗提醒",
              ]}
              cta="立即開始"
              href="/analyze"
            />
            <PricingCard
              name="毛孩會員"
              price="NT$ 149"
              period="/ 每月"
              description="最受飼主歡迎"
              features={[
                "最多 5 隻寵物",
                "無限次 AI 分析",
                "客製飲食建議",
                "完整健康趨勢報告",
                "緊急就醫判斷",
              ]}
              cta="升級會員"
              href="/analyze"
              highlighted
            />
            <PricingCard
              name="進階會員"
              price="NT$ 449"
              period="/ 每月"
              description="專業級照護"
              features={[
                "以上全部功能",
                "24/7 AI 即時諮詢",
                "鄰近寵物醫院推薦",
                "未來：真人獸醫線上諮詢",
                "優先客服支援",
              ]}
              cta="升級進階"
              href="/analyze"
            />
          </div>
        </div>
      </section>

      {/* CTA 區塊 */}
      <section className="px-6 py-20 bg-gradient-to-br from-[var(--accent)] to-[var(--muted)]">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            你的毛孩值得最好的照顧
          </h2>
          <p className="mt-4 text-lg text-[var(--muted-foreground)]">
            現在就試試看，30 秒就能得到專業 AI 分析
          </p>
          <Link
            href="/analyze"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-10 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:scale-105"
          >
            <Camera className="h-5 w-5" />
            免費開始分析
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-white px-6 py-10">
        <div className="mx-auto max-w-6xl text-center text-sm text-[var(--muted-foreground)]">
          <p className="font-medium text-[var(--foreground)]">毛孩管家 PetBuddy AI</p>
          <p className="mt-2">© 2026 毛孩管家. 用 AI 守護台灣每一隻毛孩 🐾</p>
          <p className="mt-3 text-xs">
            ⚠️ 本服務提供的健康建議僅供參考，不構成醫療診斷。如有緊急狀況請立即就醫。
          </p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="group rounded-2xl border border-[var(--border)] bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-lg">
      <div className={`inline-flex h-14 w-14 items-center justify-center rounded-xl ${color}`}>
        {icon}
      </div>
      <h3 className="mt-5 text-xl font-bold">{title}</h3>
      <p className="mt-3 text-[var(--muted-foreground)] leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  cta,
  href,
  highlighted = false,
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl p-8 ${
        highlighted
          ? "border-2 border-[var(--primary)] bg-white shadow-xl shadow-[var(--primary)]/10 md:scale-105"
          : "border border-[var(--border)] bg-white"
      }`}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--primary)] px-4 py-1 text-xs font-semibold text-white">
          ⭐ 最受歡迎
        </div>
      )}
      <h3 className="text-xl font-bold">{name}</h3>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">{description}</p>
      <div className="mt-6">
        <span className="text-4xl font-black">{price}</span>
        <span className="text-[var(--muted-foreground)]">{period}</span>
      </div>
      <ul className="mt-6 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--secondary)]/30 text-[var(--secondary)]">
              ✓
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className={`mt-8 block rounded-full px-6 py-3 text-center font-semibold transition-all ${
          highlighted
            ? "bg-[var(--primary)] text-white hover:opacity-90"
            : "border border-[var(--border)] hover:bg-[var(--muted)]"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
