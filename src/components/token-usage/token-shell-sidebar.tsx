"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  CalendarRange,
  CheckCircle2,
  Cpu,
  Database,
  DollarSign,
  FolderOpen,
  Laptop,
  LayoutGrid,
  Moon,
  ShieldCheck,
  Sun,
  Table2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAppTheme } from "@/components/providers/app-providers";
import { formatCompactTokens, formatUsd } from "@/lib/token-format";
import { cn } from "@/lib/utils";
import type { ThemePreference } from "@/types/nexus";
import type {
  DataSourceMode,
  DirectoryScanStatus,
  TokenUsageTotals,
} from "@/types/token-usage";

interface TokenShellSidebarProps {
  readonly sourceMode: DataSourceMode;
  readonly onChangeSourceMode: (mode: DataSourceMode) => void;
  readonly directories: readonly DirectoryScanStatus[];
  readonly dedupedDuplicatesCount: number;
  readonly skippedDbCount: number;
  readonly scanDurationMs: number | null;
  readonly totals: TokenUsageTotals | null;
  readonly mobileOpen: boolean;
  readonly onCloseMobile: () => void;
}

const SOURCE_OPTIONS: readonly {
  readonly id: DataSourceMode;
  readonly label: string;
  readonly desc: string;
}[] = [
  {
    id: "deduped",
    label: "合并去重 (推荐)",
    desc: "自动合并多目录并按会话 ID 去重",
  },
  {
    id: "antigravity",
    label: "~/.gemini/antigravity",
    desc: "仅读取新版主会话目录",
  },
  {
    id: "antigravity-ide",
    label: "~/.gemini/antigravity-ide",
    desc: "仅读取 antigravity-ide 目录",
  },
  {
    id: "antigravity-cli",
    label: "~/.gemini/antigravity-cli",
    desc: "仅读取 CLI 会话目录",
  },
];

const SECTION_LINKS = [
  { href: "#overview", label: "核心总览", icon: LayoutGrid },
  { href: "#analytics", label: "趋势与模型", icon: BarChart3 },
  { href: "#activity", label: "热力与项目", icon: CalendarRange },
  { href: "#sessions", label: "会话明细", icon: Table2 },
  { href: "#pricing", label: "参考单价", icon: DollarSign },
] as const;

export function TokenShellSidebar({
  sourceMode,
  onChangeSourceMode,
  directories,
  dedupedDuplicatesCount,
  skippedDbCount,
  scanDurationMs,
  totals,
  mobileOpen,
  onCloseMobile,
}: TokenShellSidebarProps) {
  const { preference, systemTheme, setPreference } = useAppTheme();
  const [desktopPlatform, setDesktopPlatform] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.antigravityDesktop) {
      setDesktopPlatform(window.antigravityDesktop.platform);
    }
  }, []);

  const isMacDesktop = desktopPlatform === "darwin";
  const isDesktop = desktopPlatform !== null;

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseMobile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, onCloseMobile]);

  const themeOptions: readonly {
    readonly id: ThemePreference;
    readonly label: string;
    readonly icon: typeof Sun;
    readonly title: string;
  }[] = [
    {
      id: "system",
      label: "系统",
      icon: Laptop,
      title: `跟随系统 (当前: ${systemTheme === "dark" ? "暗黑" : "明亮"})`,
    },
    {
      id: "light",
      label: "明亮",
      icon: Sun,
      title: "强制使用明亮模式",
    },
    {
      id: "dark",
      label: "暗黑",
      icon: Moon,
      title: "强制使用暗黑模式",
    },
  ];

  const existingKeys = new Set(
    directories.filter((d) => d.exists && d.dbCount > 0).map((d) => d.sourceKey),
  );
  const visibleSourceOptions = SOURCE_OPTIONS.filter(
    (opt) =>
      opt.id === "deduped" ||
      opt.id === "antigravity" ||
      opt.id === "antigravity-ide" ||
      opt.id === sourceMode ||
      existingKeys.has(opt.id),
  );

  const cacheHitRate = totals?.cacheHitRate ?? 0;

  const sidebarContent = (
    <div
      className={cn(
        "flex h-full flex-col justify-between gap-6 p-4",
        isMacDesktop && "pt-10",
      )}
    >
      <div className="space-y-5">
        {/* Brand Header */}
        <div
          className={cn(
            "flex items-center justify-between gap-2 px-1",
            isMacDesktop && "nx-drag-region",
          )}
        >
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400 text-white shadow-glow-indigo">
              <Cpu className="h-4.5 w-4.5" aria-hidden="true" />
              <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/30" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">
                  Antigravity
                </span>
                <span className="rounded-md bg-gradient-to-r from-indigo-500/15 to-cyan-400/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-indigo-600 dark:text-cyan-300">
                  TOKEN
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-slate-400">
                本机用量遥测控制台
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="关闭侧边栏"
            onClick={onCloseMobile}
            className="cursor-pointer rounded-xl p-1.5 text-zinc-500 transition hover:bg-zinc-900/5 hover:text-zinc-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Quick Section Navigation */}
        <nav aria-label="页面区块导航" className="space-y-1">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-slate-500">
            快速跳转
          </p>
          <div className="grid grid-cols-1 gap-0.5">
            {SECTION_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-900/[0.04] hover:text-zinc-900 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-white"
                >
                  <Icon
                    className="h-3.5 w-3.5 text-zinc-400 dark:text-slate-500"
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </div>
        </nav>

        {/* Source Switcher */}
        <div className="space-y-1.5">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-slate-500">
            数据源范围
          </p>
          {visibleSourceOptions.map((opt) => {
            const active = sourceMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  onChangeSourceMode(opt.id);
                  onCloseMobile();
                }}
                className={cn(
                  "group relative isolate z-0 flex w-full cursor-pointer flex-col rounded-2xl px-3 py-2 text-left transition-colors duration-150",
                  active
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-600 hover:bg-zinc-900/[0.04] hover:text-zinc-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-100",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="sidebarSourceNav"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="absolute inset-0 -z-10 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/12 via-violet-500/10 to-cyan-400/10 dark:border-white/10 dark:from-indigo-500/20 dark:via-violet-500/15 dark:to-cyan-400/15"
                  />
                ) : null}
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs font-semibold tracking-tight">
                    <Database
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        active
                          ? "text-indigo-600 dark:text-cyan-300"
                          : "text-zinc-400 dark:text-slate-500",
                      )}
                      aria-hidden="true"
                    />
                    <span className="truncate">{opt.label}</span>
                  </span>
                </div>
                <span className="mt-0.5 pl-5 text-[10px] text-zinc-500 dark:text-slate-400">
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* Cache Efficiency Summary Card */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-900/[0.08] bg-gradient-to-br from-indigo-500/[0.07] via-white/75 to-cyan-400/[0.08] p-3.5 shadow-sm dark:border-white/[0.07] dark:from-indigo-500/15 dark:via-slate-900/75 dark:to-cyan-400/10">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-tight text-zinc-800 dark:text-slate-100">
              <ShieldCheck
                className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400"
                aria-hidden="true"
              />
              Prompt 缓存收益
            </span>
            <span className="font-mono text-xs font-semibold tabular-nums text-indigo-600 dark:text-cyan-300">
              {cacheHitRate}%
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-600 dark:text-slate-400">
            {totals
              ? `命中 ${formatCompactTokens(totals.cacheReadTokens)} tokens，约省 ${formatUsd(totals.cost.cacheSavingsUsd)}。`
              : "正在读取本地会话缓存统计..."}
          </p>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-900/10 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, cacheHitRate))}%` }}
            />
          </div>
        </div>

        {/* Local Directories */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-slate-500">
              本机数据库目录
            </span>
            {scanDurationMs !== null ? (
              <span className="font-mono text-[10px] tabular-nums text-emerald-600 dark:text-emerald-400">
                {scanDurationMs}ms
              </span>
            ) : null}
          </div>
          <div className="space-y-1.5">
            {directories.map((dir) => {
              const canReveal = isDesktop && dir.exists;
              const content = (
                <>
                  <div className="flex min-w-0 items-center gap-2">
                    {dir.exists ? (
                      <CheckCircle2
                        className="h-3.5 w-3.5 shrink-0 text-emerald-500"
                        aria-hidden="true"
                      />
                    ) : (
                      <FolderOpen
                        className="h-3.5 w-3.5 shrink-0 text-zinc-400"
                        aria-hidden="true"
                      />
                    )}
                    <span className="truncate font-mono text-zinc-700 dark:text-slate-300">
                      {dir.sourceKey}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-md bg-zinc-900/[0.05] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-zinc-600 dark:bg-white/10 dark:text-slate-300">
                    {dir.dbCount} .db
                  </span>
                </>
              );

              if (canReveal) {
                return (
                  <button
                    key={dir.sourceKey}
                    type="button"
                    title={`点击打开目录: ${dir.dirPath}`}
                    onClick={() => {
                      void window.antigravityDesktop?.revealDirectory(
                        dir.dirPath,
                      );
                    }}
                    className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-zinc-900/[0.06] bg-white/65 px-2.5 py-1.5 text-left text-[11px] transition-colors hover:border-indigo-500/35 hover:bg-white dark:border-white/[0.06] dark:bg-slate-900/50 dark:hover:border-cyan-400/35 dark:hover:bg-slate-900"
                  >
                    {content}
                  </button>
                );
              }

              return (
                <div
                  key={dir.sourceKey}
                  title={dir.dirPath}
                  className="flex items-center justify-between rounded-xl border border-zinc-900/[0.06] bg-white/65 px-2.5 py-1.5 text-[11px] dark:border-white/[0.06] dark:bg-slate-900/50"
                >
                  {content}
                </div>
              );
            })}
          </div>
          {sourceMode === "deduped" && dedupedDuplicatesCount > 0 ? (
            <p className="px-2 text-[10px] text-zinc-500 dark:text-slate-400">
              已自动合并去重 {dedupedDuplicatesCount} 个跨目录重复会话
            </p>
          ) : null}
          {skippedDbCount > 0 ? (
            <p className="px-2 text-[10px] text-zinc-400 dark:text-slate-500">
              跳过 {skippedDbCount} 个空或不可读数据库文件
            </p>
          ) : null}
        </div>
      </div>

      {/* Footer Theme Switcher */}
      <div className="space-y-2 border-t border-zinc-900/[0.07] pt-4 dark:border-white/5">
        <div className="flex items-center justify-between px-1 text-[11px] text-zinc-500 dark:text-slate-400">
          <span>界面外观</span>
          <span className="font-mono text-[10px]">
            {preference === "system"
              ? `系统 (${systemTheme === "dark" ? "暗黑" : "明亮"})`
              : preference === "dark"
                ? "暗黑锁定"
                : "明亮锁定"}
          </span>
        </div>

        <div
          role="group"
          aria-label="界面主题偏好"
          className="grid grid-cols-3 gap-1 rounded-2xl border border-zinc-900/[0.07] bg-zinc-900/[0.04] p-1 dark:border-white/[0.07] dark:bg-white/[0.04]"
        >
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const selected = preference === option.id;
            return (
              <button
                key={option.id}
                type="button"
                title={option.title}
                aria-pressed={selected}
                onClick={() => setPreference(option.id)}
                className={cn(
                  "relative isolate z-0 flex cursor-pointer items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs font-medium transition-colors",
                  selected
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                {selected ? (
                  <motion.span
                    layoutId="sidebarThemePill"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    className="absolute inset-0 -z-10 rounded-xl bg-white shadow-sm dark:bg-slate-800/90 dark:ring-1 dark:ring-white/10"
                  />
                ) : null}
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside
        aria-label="桌面侧边栏"
        className="hidden w-64 shrink-0 border-r border-zinc-900/[0.07] bg-zinc-50/75 backdrop-blur-md dark:border-white/5 dark:bg-slate-950/75 lg:block xl:w-72"
      >
        <div className="sticky top-0 h-dvh overflow-y-auto nx-scrollbar">
          {sidebarContent}
        </div>
      </aside>

      {mobileOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="移动导航侧边栏"
          className="fixed inset-0 z-40 flex lg:hidden"
        >
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            aria-hidden="true"
          />
          <aside className="relative z-10 h-full w-72 max-w-[85vw] overflow-y-auto border-r border-white/10 bg-zinc-50/95 backdrop-blur-md nx-scrollbar dark:bg-slate-950/95">
            {sidebarContent}
          </aside>
        </div>
      ) : null}
    </>
  );
}
