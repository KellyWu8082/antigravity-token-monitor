"use client";

import { motion } from "framer-motion";
import {
  Command,
  KanbanSquare,
  ListTree,
  Menu,
  Moon,
  Plus,
  RefreshCw,
  Sparkles,
  Sun,
} from "lucide-react";
import { useAppTheme } from "@/components/providers/app-providers";
import { cn } from "@/lib/utils";
import type { AppSection, ViewMode } from "@/types/nexus";

interface AppTopbarProps {
  readonly activeSection: AppSection;
  readonly viewMode: ViewMode;
  readonly onChangeViewMode: (mode: ViewMode) => void;
  readonly onOpenCommandPalette: () => void;
  readonly onOpenCreateModal: () => void;
  readonly onSimulateSync: () => void;
  readonly onOpenMobileSidebar: () => void;
  readonly isSyncing: boolean;
}

export function AppTopbar({
  activeSection,
  viewMode,
  onChangeViewMode,
  onOpenCommandPalette,
  onOpenCreateModal,
  onSimulateSync,
  onOpenMobileSidebar,
  isSyncing,
}: AppTopbarProps) {
  const { resolvedTheme, toggleQuickTheme } = useAppTheme();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b",
        "border-zinc-900/[0.07] bg-white bg-opacity-70 backdrop-blur-md",
        "dark:border-white/5 dark:bg-slate-900 dark:bg-opacity-70"
      )}
    >
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Left: Mobile Trigger + Context Heading */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="打开导航菜单"
            onClick={onOpenMobileSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-900/10 bg-white/80 text-zinc-700 transition hover:bg-zinc-100 dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-lg">
                {activeSection === "workspace"
                  ? "智能任务协同工作台"
                  : "AI 效能分析仪表盘"}
              </h1>
              <span className="hidden items-center gap-1 rounded-full border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 to-cyan-400/10 px-2 py-0.5 text-[11px] font-medium text-indigo-600 dark:border-cyan-400/20 dark:text-cyan-300 sm:inline-flex">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isSyncing
                      ? "bg-amber-400 animate-pulse"
                      : "bg-emerald-400"
                  )}
                />
                {isSyncing ? "TanStack 同步中" : "实时乐观缓存"}
              </span>
            </div>
            <p className="hidden truncate text-xs text-zinc-500 dark:text-slate-400 md:block">
              {activeSection === "workspace"
                ? "支持物理动效跨列拖拽、TanStack Query 乐观更新与 Cmd+K 自然语言调度"
                : "多维度团队研发速率曲线、AI 代码采纳度与实时事件脉冲流"}
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {activeSection === "workspace" ? (
            <div
              role="tablist"
              aria-label="工作台视图模式"
              className="inline-flex items-center rounded-2xl border border-zinc-900/[0.08] bg-zinc-100/80 p-1 dark:border-white/10 dark:bg-slate-950/60"
            >
              {(
                [
                  { id: "kanban", label: "看板", icon: KanbanSquare },
                  { id: "list", label: "列表", icon: ListTree },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = viewMode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onChangeViewMode(tab.id)}
                    className={cn(
                      "relative isolate z-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium tracking-tight transition-colors",
                      active
                        ? "text-zinc-900 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-800 dark:text-slate-400 dark:hover:text-slate-200"
                    )}
                  >
                    {active ? (
                      <motion.span
                        layoutId="viewModePill"
                        transition={{
                          type: "spring",
                          stiffness: 440,
                          damping: 32,
                        }}
                        className="absolute inset-0 -z-10 rounded-xl bg-white shadow-sm dark:bg-slate-800 dark:ring-1 dark:ring-white/10"
                      />
                    ) : null}
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Command Palette Trigger */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className={cn(
              "group hidden items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-medium transition-all duration-200 sm:inline-flex",
              "hover:-translate-y-0.5 hover:shadow-glow-cyan",
              "border-zinc-900/10 bg-white/80 text-zinc-600 hover:border-indigo-500/35 hover:text-zinc-900",
              "dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:border-cyan-400/40 dark:hover:text-white"
            )}
          >
            <Sparkles
              className="h-3.5 w-3.5 text-indigo-500 transition-transform group-hover:scale-110 dark:text-cyan-400"
              aria-hidden="true"
            />
            <span className="hidden md:inline">AI 命令台</span>
            <kbd className="inline-flex items-center gap-0.5 rounded-md border border-zinc-900/10 bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300">
              <Command className="h-2.5 w-2.5" aria-hidden="true" />K
            </kbd>
          </button>

          {/* Simulate Skeleton Sync Button */}
          <button
            type="button"
            onClick={onSimulateSync}
            title="强制重新拉取并展示骨架屏呼吸动效"
            aria-label="刷新并演示骨架屏加载状态"
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-900/10 bg-white/80 text-zinc-600 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/30 hover:text-zinc-900 hover:shadow-sm dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-white"
          >
            <RefreshCw
              className={cn("h-4 w-4", isSyncing && "animate-spin")}
              aria-hidden="true"
            />
          </button>

          {/* Quick Theme Toggle */}
          <button
            type="button"
            onClick={toggleQuickTheme}
            title={
              resolvedTheme === "dark" ? "切换至明亮模式" : "切换至暗黑模式"
            }
            aria-label={
              resolvedTheme === "dark" ? "切换至明亮模式" : "切换至暗黑模式"
            }
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-900/10 bg-white/80 text-zinc-600 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/30 hover:text-zinc-900 hover:shadow-sm dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-white"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-300" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-600" aria-hidden="true" />
            )}
          </button>

          {/* Primary Create Task CTA with gradient + Y-lift + glow */}
          <button
            type="button"
            onClick={onOpenCreateModal}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-semibold tracking-tight text-white transition-all duration-200",
              "bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 bg-[length:140%_140%] bg-left",
              "hover:-translate-y-0.5 hover:bg-right hover:shadow-glow-indigo active:translate-y-0 active:scale-[0.98]"
            )}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">新建任务</span>
          </button>
        </div>
      </div>
    </header>
  );
}

