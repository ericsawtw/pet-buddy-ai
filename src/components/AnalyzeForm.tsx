"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import AuthStatus from "@/components/AuthStatus";
import {
  Camera,
  Upload,
  X,
  Loader2,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  Heart,
  Home as HomeIcon,
} from "lucide-react";

type AnalyzeResult = {
  severity: "green" | "yellow" | "red";
  severityLabel: string;
  severityReason: string;
  possibleCauses: Array<{
    name: string;
    likelihood: "高" | "中" | "低";
    description: string;
  }>;
  homeCare: string[];
  vetAdvice: string;
  dietAdvice?: string;
  warning?: string;
};

export default function AnalyzeForm({
  endpoint = "/api/analyze",
  showAuth = true,
  showBack = true,
}: {
  endpoint?: string;
  showAuth?: boolean;
  showBack?: boolean;
}) {
  const [petType, setPetType] = useState<"dog" | "cat">("dog");
  const [petName, setPetName] = useState("");
  const [petAge, setPetAge] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("請選擇圖片檔");
      return;
    }
    // 原始檔上限放寬到 20MB（手機高畫質照片很大），實際上傳的是壓縮後的版本
    if (file.size > 20 * 1024 * 1024) {
      setError("照片不能超過 20MB");
      return;
    }
    setError(null);
    try {
      // 縮圖 + 壓縮後再轉 base64，避免超過伺服器請求大小上限
      const compressed = await compressImage(file);
      setImageFile(file);
      setImagePreview(compressed);
    } catch {
      setError("照片處理失敗，請換一張試試");
    }
  }

  // 將圖片縮到最長邊 1024px 並以 JPEG 壓縮，回傳 data URL
  async function compressImage(file: File): Promise<string> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(file);
    });
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = document.createElement("img");
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("decode failed"));
      image.src = dataUrl;
    });

    const maxDim = 1024;
    let { width, height } = img;
    if (width > maxDim || height > maxDim) {
      if (width >= height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas context");
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.8);
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedLogin(false);
    setResult(null);

    if (symptoms.trim().length < 2) {
      setError("請描述毛孩的症狀");
      return;
    }

    setLoading(true);

    try {
      let imageBase64: string | undefined;
      let imageMediaType: string | undefined;

      if (imageFile && imagePreview) {
        const commaIdx = imagePreview.indexOf(",");
        imageBase64 = imagePreview.slice(commaIdx + 1);
        // 壓縮後的 preview 一律是 JPEG，從 data URL 前綴取得實際 MIME
        const mimeMatch = imagePreview.match(/^data:(image\/[a-z]+);base64,/);
        imageMediaType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petType,
          petName: petName.trim() || undefined,
          petAge: petAge.trim() || undefined,
          symptoms: symptoms.trim(),
          imageBase64,
          imageMediaType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "分析失敗，請稍後再試");
        setNeedLogin(Boolean(data.needLogin));
        return;
      }

      setResult(data);
      // 滾動到結果區
      setTimeout(() => {
        document.getElementById("result-section")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      setError("網路連線出現問題，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl">
        {/* 頂部列：返回 + 登入狀態 */}
        <div className="flex items-center justify-between gap-3">
          {showBack ? (
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              回首頁
            </Link>
          ) : (
            <span className="text-sm font-semibold">🐾 毛孩管家</span>
          )}
          {showAuth && <AuthStatus />}
        </div>

        {/* 標題 */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-[var(--primary)]">
            <Stethoscope className="h-4 w-4" />
            AI 寵物健康分析
          </div>
          <h1 className="mt-4 text-3xl font-black sm:text-4xl">
            我的毛孩怎麼了？
          </h1>
          <p className="mt-3 text-[var(--muted-foreground)]">
            填寫下方資訊，AI 30 秒內給你分析
          </p>
        </div>

        {/* 使用說明 */}
        <div className="mt-8 rounded-2xl bg-[var(--muted)]/60 p-5 ring-1 ring-[var(--border)]">
          <p className="font-bold">📋 怎麼用（30 秒）</p>
          <ol className="mt-3 space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="font-semibold text-[var(--primary)]">1.</span>
              選狗狗或貓咪，填上名字、年齡（選填）。
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-[var(--primary)]">2.</span>
              拍張照或從相簿選一張不舒服的地方（選填，有照片更準）。
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-[var(--primary)]">3.</span>
              用打字描述症狀，<strong>越詳細越準</strong>（什麼時候開始、有沒有食慾、精神如何）。
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-[var(--primary)]">4.</span>
              按「開始分析」，AI 會給你 <strong>🚦 紅黃綠燈</strong>、可能原因、居家照護與就醫建議。
            </li>
          </ol>
          <p className="mt-3 text-xs text-[var(--muted-foreground)]">
            ⚠️ 分析僅供參考，不是醫療診斷；緊急狀況（出血、抽搐、無法呼吸等）請立即送醫。
          </p>
        </div>

        {/* 表單 */}
        <form onSubmit={handleSubmit} className="mt-10 space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[var(--border)] sm:p-8">
          {/* 寵物類型 */}
          <div>
            <label className="block text-sm font-semibold mb-3">
              你的毛孩是？ <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPetType("dog")}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 py-4 text-lg font-medium transition-all ${
                  petType === "dog"
                    ? "border-[var(--primary)] bg-[var(--accent)] text-[var(--foreground)]"
                    : "border-[var(--border)] hover:border-[var(--primary)]/40"
                }`}
              >
                <span className="text-2xl">🐶</span>
                狗狗
              </button>
              <button
                type="button"
                onClick={() => setPetType("cat")}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 py-4 text-lg font-medium transition-all ${
                  petType === "cat"
                    ? "border-[var(--primary)] bg-[var(--accent)] text-[var(--foreground)]"
                    : "border-[var(--border)] hover:border-[var(--primary)]/40"
                }`}
              >
                <span className="text-2xl">🐱</span>
                貓咪
              </button>
            </div>
          </div>

          {/* 名字 + 年齡 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                名字 <span className="text-[var(--muted-foreground)] font-normal">(選填)</span>
              </label>
              <input
                type="text"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="例：小白"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-base focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">
                年齡 <span className="text-[var(--muted-foreground)] font-normal">(選填)</span>
              </label>
              <input
                type="text"
                value={petAge}
                onChange={(e) => setPetAge(e.target.value)}
                placeholder="例：3 歲"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-base focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
          </div>

          {/* 上傳照片 */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              上傳照片 <span className="text-[var(--muted-foreground)] font-normal">(選填，有照片分析更準確)</span>
            </label>
            {imagePreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="預覽"
                  className="w-full max-h-80 rounded-xl object-cover border border-[var(--border)]"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-3 right-3 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 手機優先：兩個明顯的大按鈕 */}
                <div className="grid grid-cols-2 gap-3">
                  <label
                    htmlFor="photo-camera"
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-[var(--primary)]/30 bg-[var(--accent)]/40 py-6 cursor-pointer hover:bg-[var(--accent)]/70 active:scale-95 transition-all"
                  >
                    <Camera className="h-8 w-8 text-[var(--primary)]" />
                    <span className="text-sm font-semibold">拍照</span>
                    <input
                      id="photo-camera"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  <label
                    htmlFor="photo-library"
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-[var(--border)] bg-[var(--muted)]/40 py-6 cursor-pointer hover:bg-[var(--muted)]/70 active:scale-95 transition-all"
                  >
                    <Upload className="h-8 w-8 text-[var(--muted-foreground)]" />
                    <span className="text-sm font-semibold">從相簿選</span>
                    <input
                      ref={fileInputRef}
                      id="photo-library"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-center text-xs text-[var(--muted-foreground)]">
                  📸 拍照功能會啟動手機相機 · 最大 5MB
                </p>
              </div>
            )}
          </div>

          {/* 症狀描述 */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              描述症狀 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder={
                petType === "dog"
                  ? "例：從昨晚開始一直舔右後腳，走路有點跛，沒有食慾，看起來悶悶的..."
                  : "例：從昨天開始一直吐，不太喝水，躲在床底下不出來..."
              }
              rows={5}
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-base focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none"
            />
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              💡 描述越詳細，AI 分析越準確
            </p>
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
              {needLogin && (
                <a
                  href="/api/auth/google/login"
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white"
                >
                  用 Google 登入
                </a>
              )}
            </div>
          )}

          {/* 送出按鈕 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[var(--primary)] py-4 text-lg font-semibold text-white shadow-lg shadow-[var(--primary)]/30 transition-all hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                AI 分析中... 約 20-30 秒
              </>
            ) : (
              <>
                <Camera className="h-5 w-5" />
                開始分析
              </>
            )}
          </button>

          <p className="text-center text-xs text-[var(--muted-foreground)]">
            ⚠️ 分析結果僅供參考，緊急狀況請立即送醫
          </p>
        </form>

        {/* 結果 */}
        {result && (
          <div id="result-section" className="mt-10 animate-fade-in">
            <ResultDisplay result={result} petName={petName || (petType === "dog" ? "你家狗狗" : "你家貓咪")} />
          </div>
        )}
      </div>
    </main>
  );
}

function ResultDisplay({ result, petName }: { result: AnalyzeResult; petName: string }) {
  const severityConfig = {
    green: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
      icon: <CheckCircle2 className="h-6 w-6 text-green-600" />,
      label: "綠燈",
    },
    yellow: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-800",
      icon: <AlertTriangle className="h-6 w-6 text-amber-600" />,
      label: "黃燈",
    },
    red: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      icon: <AlertCircle className="h-6 w-6 text-red-600" />,
      label: "紅燈",
    },
  }[result.severity];

  return (
    <div className="space-y-6">
      {/* 嚴重程度 */}
      <div className={`rounded-2xl ${severityConfig.bg} ${severityConfig.border} border-2 p-6`}>
        <div className="flex items-start gap-4">
          {severityConfig.icon}
          <div className="flex-1">
            <p className={`text-sm font-semibold ${severityConfig.text}`}>
              {severityConfig.label} · {result.severityLabel}
            </p>
            <h2 className={`mt-1 text-2xl font-bold ${severityConfig.text}`}>
              {petName} 的初步分析
            </h2>
            <p className={`mt-3 ${severityConfig.text} leading-relaxed`}>
              {result.severityReason}
            </p>
          </div>
        </div>

        {result.warning && (
          <div className="mt-4 rounded-lg bg-white/60 p-3 text-sm font-medium text-red-700">
            🚨 {result.warning}
          </div>
        )}
      </div>

      {/* 可能原因 */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[var(--border)]">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <Stethoscope className="h-5 w-5 text-[var(--primary)]" />
          可能原因
        </h3>
        <div className="mt-4 space-y-3">
          {result.possibleCauses.map((cause, i) => (
            <div key={i} className="rounded-xl bg-[var(--muted)]/50 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{cause.name}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  cause.likelihood === "高"
                    ? "bg-red-100 text-red-700"
                    : cause.likelihood === "中"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-green-100 text-green-700"
                }`}>
                  可能性{cause.likelihood}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {cause.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 居家照護 */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[var(--border)]">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <HomeIcon className="h-5 w-5 text-[var(--primary)]" />
          居家可做的事
        </h3>
        <ul className="mt-4 space-y-2">
          {result.homeCare.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--secondary)]/30 text-xs text-[var(--secondary)]">
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 飲食建議 */}
      {result.dietAdvice && (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[var(--border)]">
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <Heart className="h-5 w-5 text-[var(--primary)]" />
            飲食建議
          </h3>
          <p className="mt-3 text-sm leading-relaxed">{result.dietAdvice}</p>
        </div>
      )}

      {/* 就醫建議 */}
      <div className="rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--muted)] p-6">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <Stethoscope className="h-5 w-5 text-[var(--primary)]" />
          就醫建議
        </h3>
        <p className="mt-3 leading-relaxed">{result.vetAdvice}</p>
      </div>

      {/* 免責聲明 */}
      <p className="text-center text-xs text-[var(--muted-foreground)] px-4">
        ⚠️ 本分析由 AI 提供，僅供參考，不構成醫療診斷。請以執業獸醫師的診斷為準。
      </p>

      {/* 重新分析 */}
      <button
        onClick={() => window.location.reload()}
        className="w-full rounded-full border border-[var(--border)] bg-white py-3 font-medium hover:bg-[var(--muted)] transition-colors"
      >
        重新分析
      </button>
    </div>
  );
}
