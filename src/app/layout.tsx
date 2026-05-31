import type { Metadata, Viewport } from "next";
import { Noto_Sans_TC } from "next/font/google";
import "./globals.css";

const notoSansTC = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#e89b6c",
};

export const metadata: Metadata = {
  title: "毛孩管家 PetBuddy AI｜寵物健康 AI 助手",
  description: "拍張照片、描述症狀，AI 立刻幫你判斷毛孩狀況。專為台灣飼主打造的 AI 寵物健康助手，狗貓都適用。",
  keywords: ["寵物健康", "AI 獸醫", "狗狗症狀", "貓咪健康", "毛孩管家", "寵物 AI"],
  appleWebApp: {
    capable: true,
    title: "毛孩管家",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "毛孩管家 PetBuddy AI",
    description: "讓 AI 成為你毛孩的健康守護者",
    locale: "zh_TW",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className={`${notoSansTC.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
