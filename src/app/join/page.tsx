import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "毛孩管家 · 加入 LINE 免費送 3 次 AI 健檢",
  description:
    "毛孩怪怪的?拍張照、說症狀,30 秒 AI 幫你紅黃綠燈分級 + 照護與就醫建議。首次加入 LINE 官方帳號,免費送 3 次!",
  openGraph: {
    title: "毛孩管家 · 加入 LINE 免費送 3 次 AI 健檢",
    description: "拍照就懂毛孩健康。首次加入 LINE 免費送 3 次健檢 🐾",
  },
};

const VIDEO_URL =
  "https://xn8q9yjwnzrmbvwt.public.blob.vercel-storage.com/promo/pet-buddy-final-v2-ZJBUQW7EuAhR5JxKSdM9yysB6IUJxo.mp4";
const LINE_ADD_URL = "https://line.me/R/ti/p/@607qtrns";

export default function JoinPage() {
  return (
    <main className="min-h-screen bg-[#FDF7EE] text-gray-800">
      <div className="mx-auto max-w-md px-5 py-8">
        {/* 品牌 */}
        <div className="text-center">
          <div className="text-4xl">🐾</div>
          <h1 className="mt-1 text-2xl font-extrabold text-emerald-700">毛孩管家</h1>
          <p className="text-sm font-medium text-gray-500">你的寵物 AI 健康助手</p>
        </div>

        {/* 影片 */}
        <div className="mt-6 overflow-hidden rounded-3xl bg-black shadow-lg">
          <video
            src={VIDEO_URL}
            autoPlay
            muted
            loop
            playsInline
            controls
            className="h-full w-full"
          />
        </div>

        {/* 介紹 */}
        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-base leading-relaxed">
            毛孩怪怪的,又不確定要不要看醫生?
            <br />
            <span className="font-semibold text-emerald-700">拍張照 + 說症狀</span>,
            AI 30 秒幫你:
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>🟢🟡🔴 <b>紅黃綠燈</b>健康分級,一眼看懂嚴不嚴重</li>
            <li>🔎 可能原因</li>
            <li>🏠 居家照護建議</li>
            <li>🏥 要不要就醫 · 就醫該說什麼</li>
          </ul>
        </div>

        {/* 首購優惠 */}
        <div className="mt-5 rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50 p-5 text-center">
          <p className="text-lg font-extrabold text-emerald-700">
            🎁 首次加入,免費送 3 次健檢!
          </p>
          <p className="mt-1 text-sm text-emerald-800/80">
            加入 LINE 官方帳號即可開始,不用註冊
          </p>
        </div>

        {/* 加入 LINE 按鈕 */}
        <a
          href={LINE_ADD_URL}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#06C755] py-4 text-lg font-bold text-white shadow-lg active:scale-[0.98]"
        >
          <span className="text-2xl">💬</span> 加入毛孩管家 LINE
        </a>
        <p className="mt-3 text-center text-xs text-gray-400">
          點按鈕會開啟 LINE 加入好友 · 加入後傳一張毛孩照片就能開始 🐾
        </p>

        <p className="mt-8 text-center text-xs text-gray-400">
          careyourpet.net · 本工具為健康參考,不取代獸醫診斷
        </p>
      </div>
    </main>
  );
}
