"use client";

import { motion } from "framer-motion";
import { Menu, Moon, RefreshCw, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppTheme } from "@/components/providers/app-providers";
import { cn } from "@/lib/utils";
import type { DataSourceMode, TimeRangeFilter } from "@/types/token-usage";

interface TokenShellTopbarProps {
  readonly sourceMode: DataSourceMode;
  readonly timeRange: TimeRangeFilter;
  readonly onChangeTimeRange: (range: TimeRangeFilter) => void;
  readonly onRefresh: () => void;
  readonly onOpenMobileSidebar: () => void;
  readonly isRefreshing: boolean;
  readonly lastGeneratedAt: string | null;
  readonly activeFilterCount: number;
}

const TIME_RANGES: readonly {
  readonly id: TimeRangeFilter;
  readonly label: string;
}[] = [
  { id: "today", label: "今日" },
  { id: "7d", label: "近 7 天" },
  { id: "14d", label: "近 14 天" },
  { id: "30d", label: "近 30 天" },
  { id: "all", label: "全部" },
];

const SOURCE_LABELS: Record<DataSourceMode, string> = {
  deduped: "合并去重",
  antigravity: "antigravity",
  "antigravity-ide": "antigravity-ide",
  "antigravity-cli": "antigravity-cli",
};

export function TokenShellTopbar({
  sourceMode,
  timeRange,
  onChangeTimeRange,
  onRefresh,
  onOpenMobileSidebar,
  isRefreshing,
  lastGeneratedAt,
  activeFilterCount,
}: TokenShellTopbarProps) {
  const { resolvedTheme, toggleQuickTheme } = useAppTheme();
  const [isMacDesktop, setIsMacDesktop] = useState(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.antigravityDesktop?.platform === "darwin"
    ) {
      setIsMacDesktop(true);
    }
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b",
        "border-zinc-900/[0.07] bg-white/80 backdrop-blur-md",
        "dark:border-white/5 dark:bg-slate-900/75",
        isMacDesktop && "nx-drag-region",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 sm:flex-nowrap sm:px-6",
          isMacDesktop && "pl-20 lg:pl-6",
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            aria-label="打开导航菜单"
            onClick={onOpenMobileSidebar}
            className="nx-no-drag inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white/85 text-zinc-700 transition hover:bg-zinc-100 dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold tracking-tight text-zinc-900 dark:text-white">
                Token 用量总览
              </h1>
              <span className="hidden items-center gap-1.5 rounded-full border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 to-cyan-400/10 px-2 py-0.5 text-[11px] font-medium text-indigo-600 dark:border-cyan-400/20 dark:text-cyan-300 sm:inline-flex">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isRefreshing
                      ? "animate-pulse bg-amber-400"
                      : "bg-emerald-400",
                  )}
                />
                {isRefreshing ? "扫描中" : SOURCE_LABELS[sourceMode]}
              </span>
              {activeFilterCount > 0 ? (
                <a
                  href="#sessions"
                  className="hidden items-center rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-700 transition hover:bg-amber-500/25 dark:text-amber-300 md:inline-flex"
                >
                  {activeFilterCount} 项筛选
                </a>
              ) : null}
            </div>
            <p className="hidden truncate font-mono text-[11px] tabular-nums text-zinc-500 dark:text-slate-400 md:block">
              {lastGeneratedAt
                ? `同步于 ${new Date(lastGeneratedAt).toLocaleTimeString("zh-CN", { hour12: false })} · 本地只读 SQLite 遥测`
                : "正在连接本机 Antigravity 会话库..."}
            </p>
          </div>
        </div>

        <div className="nx-no-drag flex items-center justify-end gap-2">
          {/* Time Range Switcher */}
          <div
            role="group"
            aria-label="统计时间范围"
            className="inline-flex max-w-full items-center overflow-x-auto rounded-2xl border border-zinc-900/[0.08] bg-zinc-100/85 p-1 dark:border-white/10 dark:bg-slate-950/60"
          >
            {TIME_RANGES.map((item) => {
              const active = timeRange === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChangeTimeRange(item.id)}
                  className={cn(
                    "relative isolate z-0 shrink-0 cursor-pointer rounded-xl px-2.5 py-1 text-xs font-medium tracking-tight transition-colors",
                    active
                      ? "text-zinc-900 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-slate-400 dark:hover:text-slate-200",
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="topbarTimeRangePill"
                      transition={{
                        type: "spring",
                        stiffness: 440,
                        damping: 32,
                      }}
                      className="absolute inset-0 -z-10 rounded-xl bg-white shadow-sm dark:bg-slate-800 dark:ring-1 dark:ring-white/10"
                    />
                  ) : null}
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            title="重新扫描本地 Antigravity 数据库"
            aria-label="刷新 Token 用量数据"
            className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-2xl border border-zinc-900/10 bg-white/85 px-3 text-xs font-medium text-zinc-700 transition-colors duration-200 hover:border-indigo-500/35 hover:bg-white hover:text-zinc-900 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:border-cyan-400/35 dark:hover:bg-slate-900 dark:hover:text-white"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">刷新</span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleQuickTheme}
            title={
              resolvedTheme === "dark" ? "切换至明亮模式" : "切换至暗黑模式"
            }
            aria-label={
              resolvedTheme === "dark" ? "切换至明亮模式" : "切换至暗黑模式"
            }
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-zinc-900/10 bg-white/85 text-zinc-600 transition-colors duration-200 hover:border-indigo-500/30 hover:bg-white hover:text-zinc-900 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-slate-900 dark:hover:text-white"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-300" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-600" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
