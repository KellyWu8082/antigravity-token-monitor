import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Noto_Sans_SC } from "next/font/google";
import type { ReactNode } from "react";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansSc = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-sc",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Antigravity IDE Token Telemetry · 本机 Token 使用明细",
  description:
    "实时只读解析本机 Antigravity IDE 会话数据库，提供模型分布、工作区消耗、每日趋势及逐轮次 Token 明细。",
};

const COLOR_SCHEME_BOOTSTRAP =
  "try{var s=localStorage.getItem('color-scheme');var m=document.querySelector('meta[name=color-scheme]');if(m&&(s==='light'||s==='dark')){m.content=s;}}catch(e){}";

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${inter.variable} ${notoSansSc.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <meta name="color-scheme" content="light dark" />
        <script>{COLOR_SCHEME_BOOTSTRAP}</script>
      </head>
      <body className="min-h-dvh bg-zinc-50 font-sans text-zinc-900 antialiased selection:bg-indigo-500/20 selection:text-indigo-700 dark:bg-obsidian-950 dark:text-slate-100 dark:selection:bg-cyan-400/25 dark:selection:text-cyan-200">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
