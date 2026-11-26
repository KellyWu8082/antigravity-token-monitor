"use client";

import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Command,
  KanbanSquare,
  Laptop,
  Moon,
  Sparkles,
  Sun,
  X,
  Zap,
} from "lucide-react";
import { useAppTheme } from "@/components/providers/app-providers";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import { TEAM_MEMBERS } from "@/data/mock-data";
import { cn } from "@/lib/utils";
import type { AppSection, NexusTask, ThemePreference } from "@/types/nexus";

interface AppSidebarProps {
  readonly activeSection: AppSection;
  readonly onSelectSection: (section: AppSection) => void;
  readonly onOpenCommandPalette: () => void;
  readonly tasks: readonly NexusTask[];
  readonly mobileOpen: boolean;
  readonly onCloseMobile: () => void;
}

export function AppSidebar({
  activeSection,
  onSelectSection,
  onOpenCommandPalette,
  tasks,
  mobileOpen,
  onCloseMobile,
}: AppSidebarProps) {
  const { preference, systemTheme, setPreference } = useAppTheme();

  const totalCount = tasks.length;
  const doneCount = tasks.filter((task) => task.status === "done").length;
  const completionPct =
    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const navItems: readonly {
    readonly id: AppSection;
    readonly label: string;
    readonly badge?: string;
    readonly icon: typeof KanbanSquare;
  }[] = [
    {
      id: "workspace",
      label: "主工作台看板",
      badge: `${totalCount}`,
      icon: KanbanSquare,
    },
    {
      id: "analytics",
      label: "AI 效能分析",
      badge: "LIVE",
      icon: BarChart3,
    },
  ];

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

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-4">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400 text-white shadow-glow-indigo">
              <Zap className="h-4.5 w-4.5" aria-hidden="true" />
              <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/30" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">
                  NexusFlow
                </span>
                <span className="rounded-md bg-gradient-to-r from-indigo-500/15 to-cyan-400/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-indigo-600 dark:text-cyan-300">
                  AI 2.4
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-slate-400">
                智能协同任务中枢
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="关闭侧边栏"
            onClick={onCloseMobile}
            className="rounded-xl p-1.5 text-zinc-500 transition hover:bg-zinc-900/5 hover:text-zinc-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav aria-label="主导航" className="space-y-1.5">
          <p className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-slate-500">
            工作空间
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectSection(item.id);
                  onCloseMobile();
                }}
                className={cn(
                  "group relative isolate z-0 flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200",
                  "hover:-translate-y-0.5",
                  isActive
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-600 hover:bg-zinc-900/[0.04] hover:text-zinc-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-100"
                )}
              >
                {isActive ? (
                  <motion.span
                    layoutId="sidebarActiveNav"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="absolute inset-0 -z-10 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/12 via-violet-500/10 to-cyan-400/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] dark:border-white/10 dark:from-indigo-500/20 dark:via-violet-500/15 dark:to-cyan-400/15"
                  />
                ) : null}

                <span className="flex items-center gap-2.5">
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isActive
                        ? "text-indigo-600 dark:text-cyan-300"
                        : "text-zinc-400 group-hover:text-zinc-700 dark:text-slate-500 dark:group-hover:text-slate-300"
                    )}
                    aria-hidden="true"
                  />
                  <span className="tracking-tight">{item.label}</span>
                </span>

                {item.badge ? (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold",
                      item.badge === "LIVE"
                        ? "bg-gradient-to-r from-indigo-500 to-cyan-400 text-white"
                        : "bg-zinc-900/[0.06] text-zinc-600 dark:bg-white/10 dark:text-slate-300"
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              onOpenCommandPalette();
              onCloseMobile();
            }}
            className="group flex w-full items-center justify-between rounded-2xl border border-dashed border-zinc-900/10 bg-zinc-900/[0.02] px-3 py-2.5 text-left text-sm font-medium text-zinc-600 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/35 hover:bg-indigo-500/[0.06] hover:text-zinc-900 hover:shadow-glow-indigo dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-300 dark:hover:border-cyan-400/35 dark:hover:text-white"
          >
            <span className="flex items-center gap-2.5">
              <Command
                className="h-4 w-4 text-indigo-500 dark:text-cyan-400"
                aria-hidden="true"
              />
              <span className="tracking-tight">AI 命令控制台</span>
            </span>
            <kbd className="rounded-md border border-zinc-900/10 bg-white/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-300">
              ⌘K
            </kbd>
          </button>
        </nav>

        {/* Sprint AI Status Card */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-900/[0.08] bg-gradient-to-br from-indigo-500/[0.07] via-white/70 to-cyan-400/[0.08] p-3.5 shadow-sm dark:border-white/[0.07] dark:from-indigo-500/15 dark:via-slate-900/75 dark:to-cyan-400/10">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-tight text-zinc-800 dark:text-slate-100">
              <Sparkles
                className="h-3.5 w-3.5 text-indigo-500 dark:text-cyan-400"
                aria-hidden="true"
              />
              Sprint 14 · 迭代脉冲
            </span>
            <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-cyan-300">
              {completionPct}%
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-600 dark:text-slate-400">
            已完成 {doneCount}/{totalCount} 项核心研发任务，AI 自动审查提速 2.1x。
          </p>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-900/10 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>

        {/* Team Members */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-slate-500">
              在线协作成员
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
              <Activity className="h-3 w-3" aria-hidden="true" />
              {TEAM_MEMBERS.length} 人活跃
            </span>
          </div>
          <div className="space-y-1.5 px-1">
            {TEAM_MEMBERS.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-xl px-2 py-1.5 transition hover:bg-zinc-900/[0.04] dark:hover:bg-white/[0.04]"
              >
                <AvatarBadge member={member} size="sm" showName />
                <span className="truncate text-[10px] text-zinc-400 dark:text-slate-500">
                  {member.aiCopilotEnabled ? "Copilot" : "Infra"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Theme Switcher (3-state: System / Light / Dark) */}
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
                  "relative isolate z-0 flex items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs font-medium transition-colors",
                  selected
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-slate-400 dark:hover:text-slate-200"
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
      {/* Desktop Sticky Frosted Glass Sidebar */}
      <aside
        aria-label="桌面侧边栏"
        className="hidden w-72 shrink-0 border-r border-zinc-900/[0.07] bg-zinc-50 bg-opacity-70 backdrop-blur-md dark:border-white/5 dark:bg-slate-950 dark:bg-opacity-70 lg:block"
      >
        <div className="sticky top-0 h-dvh overflow-y-auto nx-scrollbar">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            aria-hidden="true"
          />
          <aside className="relative z-10 h-full w-72 border-r border-white/10 bg-zinc-50 bg-opacity-90 backdrop-blur-md dark:bg-slate-950 dark:bg-opacity-90">
            {sidebarContent}
          </aside>
        </div>
      ) : null}
    </>
  );
}

