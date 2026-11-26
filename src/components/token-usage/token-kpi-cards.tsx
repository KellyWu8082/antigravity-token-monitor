"use client";

import { motion } from "framer-motion";
import { Activity, DollarSign, ShieldCheck, Sparkles } from "lucide-react";
import {
  formatCompactTokens,
  formatTokenCount,
  formatUsd,
} from "@/lib/token-format";
import { cn } from "@/lib/utils";
import type { TimeRangeFilter, TokenUsageTotals } from "@/types/token-usage";

interface TokenKpiCardsProps {
  readonly totals: TokenUsageTotals;
  readonly timeRange: TimeRangeFilter;
}

const RANGE_BADGE: Record<TimeRangeFilter, string> = {
  today: "今日",
  "7d": "近 7 天",
  "14d": "近 14 天",
  "30d": "近 30 天",
  all: "全部累计",
};

export function TokenKpiCards({ totals, timeRange }: TokenKpiCardsProps) {
  const tokenDenom = Math.max(1, totals.totalTokens);
  const inputShare = (totals.inputTokens / tokenDenom) * 100;
  const cacheShare = (totals.cacheReadTokens / tokenDenom) * 100;
  const thinkingShare = (totals.thinkingTokens / tokenDenom) * 100;
  const responseShare = Math.max(
    0,
    100 - inputShare - cacheShare - thinkingShare,
  );

  const costDenom = Math.max(1e-9, totals.cost.totalCostUsd);
  const inputCostShare = (totals.cost.inputCostUsd / costDenom) * 100;
  const cacheCostShare = (totals.cost.cacheReadCostUsd / costDenom) * 100;
  const outputCostShare = Math.max(0, 100 - inputCostShare - cacheCostShare);

  const avgTurnsPerSession =
    totals.sessions > 0
      ? Math.round((totals.turns / totals.sessions) * 10) / 10
      : 0;

  const cacheHitClamped = Math.min(100, Math.max(0, totals.cacheHitRate));

  return (
    <section
      aria-label="额度使用汇总"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {/* Card 1: Reference Cost */}
      <motion.article
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0 }}
        className="flex flex-col justify-between rounded-3xl border border-zinc-900/[0.08] bg-white/85 p-5 shadow-glass-light backdrop-blur-md transition-colors duration-200 hover:border-amber-500/25 dark:border-white/[0.07] dark:bg-slate-900/75 dark:shadow-glass-dark dark:hover:border-amber-400/25"
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-slate-400">
                参考费用
              </span>
              <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                {RANGE_BADGE[timeRange]}
              </span>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-600 dark:text-amber-300">
              <DollarSign className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>

          <p className="mt-3 font-mono text-2xl font-bold tracking-tight tabular-nums text-zinc-900 dark:text-white">
            {formatUsd(totals.cost.totalCostUsd)}
          </p>
        </div>

        <div className="mt-3 space-y-2">
          <div
            aria-hidden="true"
            className="flex h-1.5 w-full overflow-hidden rounded-full bg-zinc-900/[0.07] dark:bg-white/10"
          >
            {totals.cost.totalCostUsd > 0 ? (
              <>
                <span
                  className="h-full bg-indigo-500"
                  style={{ width: `${inputCostShare}%` }}
                />
                <span
                  className="h-full bg-cyan-400"
                  style={{ width: `${cacheCostShare}%` }}
                />
                <span
                  className="h-full bg-amber-400"
                  style={{ width: `${outputCostShare}%` }}
                />
              </>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-2 font-mono text-[11px] tabular-nums text-zinc-500 dark:text-slate-400">
            <span className="truncate">
              净消耗 {formatUsd(totals.cost.uncachedCostUsd)}
            </span>
            <a
              href="#pricing"
              className="shrink-0 font-sans text-[11px] font-medium text-indigo-600 transition hover:text-indigo-500 dark:text-cyan-300 dark:hover:text-cyan-200"
            >
              单价说明
            </a>
          </div>
        </div>
      </motion.article>

      {/* Card 2: Total Tokens + Composition */}
      <motion.article
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.04 }}
        className="flex flex-col justify-between rounded-3xl border border-zinc-900/[0.08] bg-white/85 p-5 shadow-glass-light backdrop-blur-md transition-colors duration-200 hover:border-indigo-500/25 dark:border-white/[0.07] dark:bg-slate-900/75 dark:shadow-glass-dark dark:hover:border-cyan-400/25"
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-slate-400">
              Token 消耗
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 text-indigo-600 dark:text-indigo-300">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>

          <p
            title={`${formatTokenCount(totals.totalTokens)} tokens`}
            className="mt-3 font-mono text-2xl font-bold tracking-tight tabular-nums text-zinc-900 dark:text-white"
          >
            {formatCompactTokens(totals.totalTokens)}
          </p>
        </div>

        <div className="mt-3 space-y-2">
          <div
            aria-hidden="true"
            title={`Input ${formatCompactTokens(totals.inputTokens)} · Cache ${formatCompactTokens(totals.cacheReadTokens)} · Thinking ${formatCompactTokens(totals.thinkingTokens)} · Response ${formatCompactTokens(totals.responseTokens)}`}
            className="flex h-1.5 w-full overflow-hidden rounded-full bg-zinc-900/[0.07] dark:bg-white/10"
          >
            {totals.totalTokens > 0 ? (
              <>
                <span
                  className="h-full bg-indigo-500"
                  style={{ width: `${inputShare}%` }}
                />
                <span
                  className="h-full bg-cyan-400"
                  style={{ width: `${cacheShare}%` }}
                />
                <span
                  className="h-full bg-violet-500"
                  style={{ width: `${thinkingShare}%` }}
                />
                <span
                  className="h-full bg-emerald-400"
                  style={{ width: `${responseShare}%` }}
                />
              </>
            ) : null}
          </div>
          <p className="truncate font-mono text-[11px] tabular-nums text-zinc-500 dark:text-slate-400">
            净消耗 {formatCompactTokens(totals.uncachedTotalTokens)} · 输出{" "}
            {formatCompactTokens(totals.outputTokens)}
          </p>
        </div>
      </motion.article>

      {/* Card 3: Prompt Cache Efficiency */}
      <motion.article
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.08 }}
        className="flex flex-col justify-between rounded-3xl border border-zinc-900/[0.08] bg-white/85 p-5 shadow-glass-light backdrop-blur-md transition-colors duration-200 hover:border-cyan-500/25 dark:border-white/[0.07] dark:bg-slate-900/75 dark:shadow-glass-dark dark:hover:border-cyan-400/25"
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-slate-400">
              缓存命中率
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-sky-500/10 text-cyan-600 dark:text-cyan-300">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <p className="font-mono text-2xl font-bold tracking-tight tabular-nums text-zinc-900 dark:text-white">
              {totals.cacheHitRate}%
            </p>
            <span className="font-mono text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              省 {formatUsd(totals.cost.cacheSavingsUsd)}
            </span>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <div
            aria-hidden="true"
            className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-900/[0.07] dark:bg-white/10"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${cacheHitClamped}%` }}
            />
          </div>
          <p className="truncate font-mono text-[11px] tabular-nums text-zinc-500 dark:text-slate-400">
            命中 {formatCompactTokens(totals.cacheReadTokens)} tokens
          </p>
        </div>
      </motion.article>

      {/* Card 4: Sessions & Activity */}
      <motion.article
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.12 }}
        className="flex flex-col justify-between rounded-3xl border border-zinc-900/[0.08] bg-white/85 p-5 shadow-glass-light backdrop-blur-md transition-colors duration-200 hover:border-emerald-500/25 dark:border-white/[0.07] dark:bg-slate-900/75 dark:shadow-glass-dark dark:hover:border-emerald-400/25"
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-slate-400">
              活跃会话
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-300">
              <Activity className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <p className="font-mono text-2xl font-bold tracking-tight tabular-nums text-zinc-900 dark:text-white">
              {formatTokenCount(totals.sessions)}
            </p>
            <span className="font-mono text-xs tabular-nums text-zinc-500 dark:text-slate-400">
              {formatTokenCount(totals.turns)} 轮
            </span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 font-mono text-[10px] tabular-nums">
          <span
            className={cn(
              "rounded-lg bg-zinc-900/[0.05] px-2 py-0.5 text-zinc-600 dark:bg-white/[0.07] dark:text-slate-300",
            )}
          >
            {totals.modelCount} 模型
          </span>
          <span className="rounded-lg bg-zinc-900/[0.05] px-2 py-0.5 text-zinc-600 dark:bg-white/[0.07] dark:text-slate-300">
            {totals.workspaceCount} 项目
          </span>
          <span className="rounded-lg bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
            均 {avgTurnsPerSession} 轮/会话
          </span>
        </div>
      </motion.article>
    </section>
  );
}
