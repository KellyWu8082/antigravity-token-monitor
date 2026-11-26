"use client";

import { motion } from "framer-motion";
import { Clock, Cpu, Gauge, Sparkles, Zap } from "lucide-react";
import { useState } from "react";
import { ActivityTimeline } from "@/components/analytics/activity-timeline";
import { AiAdoptionChart } from "@/components/analytics/ai-adoption-chart";
import { ProductivityChart } from "@/components/analytics/productivity-chart";
import { AnalyticsSkeleton } from "@/components/ui/skeleton-loader";
import {
  useActivityTimelineQuery,
  useAnalyticsSnapshotQuery,
} from "@/hooks/use-analytics-query";
import { cn } from "@/lib/utils";
import type { AnalyticsTimeframe } from "@/types/nexus";

interface AnalyticsDashboardProps {
  readonly onOpenTaskByCode: (code: string) => void;
}

export function AnalyticsDashboard({
  onOpenTaskByCode,
}: AnalyticsDashboardProps) {
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>("7d");
  const analyticsQuery = useAnalyticsSnapshotQuery(timeframe);
  const timelineQuery = useActivityTimelineQuery();

  const snapshot = analyticsQuery.data;
  const events = timelineQuery.data ?? [];

  if (analyticsQuery.isPending && !snapshot) {
    return <AnalyticsSkeleton />;
  }

  const kpiCards = snapshot
    ? [
        {
          id: "velocity",
          title: "周期研发吞吐量",
          value: `${snapshot.weeklyVelocity} pts`,
          delta: snapshot.velocityDelta,
          hint: "较上周期净交付提升",
          icon: Gauge,
          accent: "from-indigo-500/20 to-violet-500/10 text-indigo-600 dark:text-indigo-300",
        },
        {
          id: "adoption",
          title: "AI 代码净采纳率",
          value: `${snapshot.aiCodeAdoptionRate}%`,
          delta: snapshot.aiAdoptionDelta,
          hint: "PR 合并前保留率",
          icon: Cpu,
          accent: "from-cyan-500/20 to-sky-500/10 text-cyan-600 dark:text-cyan-300",
        },
        {
          id: "cycle",
          title: "平均流转周期",
          value: `${snapshot.avgCycleHours}h`,
          delta: snapshot.cycleTimeDelta,
          hint: "从待处理到已完成",
          icon: Clock,
          accent: "from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-300",
        },
        {
          id: "saved",
          title: "AI 累计节省工时",
          value: `${snapshot.hoursSavedByAi}h`,
          delta: snapshot.hoursSavedDelta,
          hint: "自动化审查与代码生成",
          icon: Zap,
          accent: "from-fuchsia-500/20 to-indigo-500/10 text-violet-600 dark:text-violet-300",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 to-cyan-400/10 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-cyan-400/20 dark:text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            AI 效能遥测引擎已连接
          </span>
        </div>

        <div
          role="group"
          aria-label="统计时间窗口"
          className="inline-flex items-center rounded-2xl border border-zinc-900/[0.08] bg-white/80 p-1 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/70"
        >
          {(
            [
              { id: "7d", label: "近 7 天" },
              { id: "14d", label: "近 14 天" },
              { id: "30d", label: "近 30 天" },
            ] as const
          ).map((item) => {
            const active = timeframe === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTimeframe(item.id)}
                className={cn(
                  "relative isolate z-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="analyticsTimeframePill"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    className="absolute inset-0 -z-10 rounded-xl bg-zinc-100 shadow-sm dark:bg-slate-800 dark:ring-1 dark:ring-white/10"
                  />
                ) : null}
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: index * 0.05,
              }}
              className="group relative overflow-hidden rounded-3xl border border-zinc-900/[0.07] bg-white/75 p-5 shadow-glass-light backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/30 dark:border-white/5 dark:bg-slate-900/65 dark:shadow-glass-dark dark:hover:border-cyan-400/30"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-zinc-500 dark:text-slate-400">
                  {card.title}
                </span>
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br",
                    card.accent
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-2.5">
                <span className="font-mono text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  {card.value}
                </span>
                <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {card.delta}
                </span>
              </div>

              <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-slate-500">
                {card.hint}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Multi-Dimensional SVG Visualizations */}
      {snapshot ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <ProductivityChart series={snapshot.productivitySeries} />
          </div>
          <div className="lg:col-span-5">
            <AiAdoptionChart
              overallRate={snapshot.aiCodeAdoptionRate}
              breakdown={snapshot.categoryBreakdown}
            />
          </div>
        </div>
      ) : null}

      {/* Streaming Activity Timeline */}
      <ActivityTimeline events={events} onOpenTaskByCode={onOpenTaskByCode} />
    </div>
  );
}

