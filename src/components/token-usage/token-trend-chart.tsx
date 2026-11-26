"use client";

import { motion } from "framer-motion";
import { BarChart3, Pin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatCompactTokens, formatUsd } from "@/lib/token-format";
import { cn } from "@/lib/utils";
import type { DailyUsagePoint, TrendGranularity } from "@/types/token-usage";

interface TokenTrendChartProps {
  readonly dailyTrend: readonly DailyUsagePoint[];
  readonly granularity: TrendGranularity;
}

function formatTrendBucketLabel(
  bucket: string,
  granularity: TrendGranularity,
): string {
  if (granularity !== "hour") return bucket;
  const matched = /(\d{2}:00)$/.exec(bucket);
  return matched?.[1] ?? bucket;
}

type TrendMetricMode = "usd" | "all" | "uncached";

const METRIC_TABS = [
  { id: "usd", label: "费用" },
  { id: "all", label: "全量" },
  { id: "uncached", label: "净消耗" },
] as const;

export function TokenTrendChart({
  dailyTrend,
  granularity,
}: TokenTrendChartProps) {
  const isHourly = granularity === "hour";
  const [metricMode, setMetricMode] = useState<TrendMetricMode>("usd");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [pinnedDate, setPinnedDate] = useState<string | null>(null);

  useEffect(() => {
    setHoverIndex(null);
    setPinnedDate(null);
  }, [dailyTrend, granularity]);

  const visiblePoints = useMemo(
    () => (dailyTrend.length > 30 ? dailyTrend.slice(-30) : dailyTrend),
    [dailyTrend],
  );

  const { maxBarValue, peakLabel } = useMemo(() => {
    let peak = 0;
    for (const pt of visiblePoints) {
      const value =
        metricMode === "usd"
          ? pt.cost.totalCostUsd
          : metricMode === "all"
            ? pt.usage.totalTokens
            : pt.usage.uncachedTotalTokens;
      if (value > peak) peak = value;
    }
    const safeMax = Math.max(metricMode === "usd" ? 0.01 : 1, peak);
    return {
      maxBarValue: safeMax,
      peakLabel:
        peak <= 0
          ? null
          : metricMode === "usd"
            ? formatUsd(peak)
            : formatCompactTokens(peak),
    };
  }, [metricMode, visiblePoints]);

  const activePoint = useMemo(() => {
    if (hoverIndex !== null && visiblePoints[hoverIndex]) {
      return visiblePoints[hoverIndex];
    }
    if (pinnedDate) {
      const found = visiblePoints.find((pt) => pt.date === pinnedDate);
      if (found) return found;
    }
    return visiblePoints[visiblePoints.length - 1] ?? null;
  }, [hoverIndex, pinnedDate, visiblePoints]);

  const showPermanentBarLabels = visiblePoints.length <= 12;

  const formatMetric = (value: number) =>
    metricMode === "usd" ? formatUsd(value) : formatCompactTokens(value);

  const activeValue = activePoint
    ? formatMetric(
        metricMode === "usd"
          ? activePoint.cost.totalCostUsd
          : metricMode === "uncached"
            ? activePoint.usage.uncachedTotalTokens
            : activePoint.usage.totalTokens,
      )
    : null;

  const isPinnedActive =
    hoverIndex === null &&
    pinnedDate !== null &&
    activePoint?.date === pinnedDate;

  const halfTickLabel = formatMetric(maxBarValue / 2);
  const topTickLabel = formatMetric(maxBarValue);

  return (
    <section
      aria-label={isHourly ? "今日额度趋势" : "每日额度趋势"}
      className="flex h-full flex-col justify-between rounded-3xl border border-zinc-900/[0.08] bg-white/85 p-5 shadow-glass-light backdrop-blur-md dark:border-white/[0.07] dark:bg-slate-900/75 dark:shadow-glass-dark"
    >
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3
              className="h-4 w-4 text-indigo-500 dark:text-cyan-400"
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">
              {isHourly ? "今日分时趋势" : "每日消耗趋势"}
            </h2>
            {peakLabel ? (
              <span className="hidden rounded-full bg-zinc-900/[0.05] px-2 py-0.5 font-mono text-[10px] tabular-nums text-zinc-500 dark:bg-white/[0.07] dark:text-slate-400 sm:inline-flex">
                峰值 {peakLabel}
              </span>
            ) : null}
          </div>

          <div
            role="group"
            aria-label="趋势口径切换"
            className="inline-flex items-center rounded-2xl border border-zinc-900/[0.08] bg-zinc-100/85 p-1 dark:border-white/10 dark:bg-slate-950/60"
          >
            {METRIC_TABS.map((tab) => {
              const active = metricMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMetricMode(tab.id)}
                  className={cn(
                    "relative isolate z-0 cursor-pointer rounded-xl px-2.5 py-1 text-xs font-medium transition-colors",
                    active
                      ? "text-zinc-900 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-slate-400 dark:hover:text-slate-200",
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="trendMetricModePill"
                      transition={{
                        type: "spring",
                        stiffness: 450,
                        damping: 32,
                      }}
                      className="absolute inset-0 -z-10 rounded-xl bg-white shadow-sm dark:bg-slate-800 dark:ring-1 dark:ring-white/10"
                    />
                  ) : null}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active bucket breakdown ribbon */}
        {activePoint && activeValue ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-900/[0.06] bg-zinc-50/80 px-3 py-2 font-mono text-[11px] tabular-nums dark:border-white/[0.06] dark:bg-slate-950/50">
            <div className="flex flex-wrap items-center gap-1.5 text-zinc-600 dark:text-slate-300">
              <span className="font-semibold text-zinc-900 dark:text-white">
                {formatTrendBucketLabel(activePoint.date, granularity)}
              </span>
              {isPinnedActive ? (
                <span className="inline-flex items-center gap-0.5 rounded bg-indigo-500/12 px-1.5 py-0.5 font-sans text-[10px] font-medium text-indigo-600 dark:bg-cyan-400/15 dark:text-cyan-300">
                  <Pin className="h-2.5 w-2.5" aria-hidden="true" />
                  已钉选
                </span>
              ) : null}
              <span className="text-zinc-300 dark:text-slate-600">·</span>
              <span>
                {activePoint.sessionCount} 会话 / {activePoint.turns} 轮
              </span>
              <span className="text-zinc-300 dark:text-slate-600">·</span>
              <span className="font-semibold text-amber-600 dark:text-amber-300">
                {activeValue}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-zinc-500 dark:text-slate-400">
              <span>
                In{" "}
                <strong className="font-medium text-indigo-600 dark:text-indigo-300">
                  {metricMode === "usd"
                    ? formatUsd(activePoint.cost.inputCostUsd)
                    : formatCompactTokens(activePoint.usage.inputTokens)}
                </strong>
              </span>
              {metricMode !== "uncached" ? (
                <span>
                  Cache{" "}
                  <strong className="font-medium text-cyan-700 dark:text-cyan-300">
                    {metricMode === "usd"
                      ? formatUsd(activePoint.cost.cacheReadCostUsd)
                      : formatCompactTokens(activePoint.usage.cacheReadTokens)}
                  </strong>
                </span>
              ) : null}
              <span>
                Think{" "}
                <strong className="font-medium text-violet-600 dark:text-violet-300">
                  {metricMode === "usd"
                    ? formatUsd(activePoint.cost.thinkingCostUsd)
                    : formatCompactTokens(activePoint.usage.thinkingTokens)}
                </strong>
              </span>
              <span>
                Resp{" "}
                <strong className="font-medium text-emerald-600 dark:text-emerald-300">
                  {metricMode === "usd"
                    ? formatUsd(activePoint.cost.responseCostUsd)
                    : formatCompactTokens(activePoint.usage.responseTokens)}
                </strong>
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {visiblePoints.length === 0 ? (
        <div className="mt-5 flex h-52 items-center justify-center rounded-2xl border border-dashed border-zinc-900/10 text-xs text-zinc-500 dark:border-white/10 dark:text-slate-400">
          当前范围内暂无消耗
        </div>
      ) : (
        <div className="mt-4">
          {/* Chart grid area with horizontal reference lines */}
          <div className="relative pt-5">
            {/* Background reference lines */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 top-5 flex flex-col justify-between"
            >
              <div className="flex items-center gap-2 border-t border-dashed border-zinc-900/[0.08] dark:border-white/[0.08]">
                <span className="-mt-2.5 bg-white/80 pr-1 font-mono text-[9px] tabular-nums text-zinc-400 dark:bg-slate-900/80 dark:text-slate-500">
                  {topTickLabel}
                </span>
              </div>
              <div className="flex items-center gap-2 border-t border-dashed border-zinc-900/[0.06] dark:border-white/[0.06]">
                <span className="-mt-2.5 bg-white/80 pr-1 font-mono text-[9px] tabular-nums text-zinc-400 dark:bg-slate-900/80 dark:text-slate-500">
                  {halfTickLabel}
                </span>
              </div>
              <div className="border-t border-zinc-900/[0.1] dark:border-white/[0.1]" />
            </div>

            <div className="relative z-10 flex h-52 items-end gap-1 pl-10 sm:gap-1.5 sm:pl-12">
              {visiblePoints.map((pt, idx) => {
                const barValue =
                  metricMode === "usd"
                    ? pt.cost.totalCostUsd
                    : metricMode === "all"
                      ? pt.usage.totalTokens
                      : pt.usage.uncachedTotalTokens;
                const barHeightPct =
                  barValue <= 0
                    ? 0
                    : Math.max(4, (barValue / maxBarValue) * 100);
                const denom = Math.max(1e-9, barValue);
                const cachePct =
                  metricMode === "usd"
                    ? (pt.cost.cacheReadCostUsd / denom) * 100
                    : metricMode === "all"
                      ? (pt.usage.cacheReadTokens / denom) * 100
                      : 0;
                const inputPct =
                  metricMode === "usd"
                    ? (pt.cost.inputCostUsd / denom) * 100
                    : (pt.usage.inputTokens / denom) * 100;
                const thinkingPct =
                  metricMode === "usd"
                    ? (pt.cost.thinkingCostUsd / denom) * 100
                    : (pt.usage.thinkingTokens / denom) * 100;
                const responsePct = Math.max(
                  0,
                  100 - cachePct - inputPct - thinkingPct,
                );
                const isFocused =
                  hoverIndex === idx ||
                  (hoverIndex === null && activePoint?.date === pt.date);
                const labelText = formatMetric(barValue);

                return (
                  <button
                    key={pt.date}
                    type="button"
                    onMouseEnter={() => setHoverIndex(idx)}
                    onFocus={() => setHoverIndex(idx)}
                    onMouseLeave={() => setHoverIndex(null)}
                    onClick={() =>
                      setPinnedDate((prev) =>
                        prev === pt.date ? null : pt.date,
                      )
                    }
                    aria-pressed={pinnedDate === pt.date}
                    aria-label={`${formatTrendBucketLabel(pt.date, granularity)} ${labelText}`}
                    className={cn(
                      "group relative flex h-full min-w-0 flex-1 cursor-pointer flex-col items-center justify-end rounded-t-xl px-0.5 transition-colors focus:outline-none",
                      isFocused
                        ? "bg-indigo-500/[0.06] dark:bg-cyan-400/[0.07]"
                        : "hover:bg-zinc-900/[0.03] dark:hover:bg-white/[0.03]",
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none absolute -top-4 whitespace-nowrap font-mono text-[10px] leading-none tabular-nums transition-opacity",
                        barValue <= 0 && !isFocused && "invisible",
                        isFocused
                          ? "z-20 font-semibold text-indigo-600 opacity-100 dark:text-cyan-300"
                          : showPermanentBarLabels
                            ? "hidden text-zinc-500 opacity-80 sm:block dark:text-slate-400"
                            : "opacity-0 group-hover:opacity-100",
                      )}
                    >
                      {labelText}
                    </span>
                    <div
                      className={cn(
                        "flex w-full max-w-[28px] flex-col-reverse overflow-hidden rounded-t-md transition-all duration-200",
                        isFocused
                          ? "ring-2 ring-indigo-500/75 dark:ring-cyan-400/75"
                          : "opacity-85 group-hover:opacity-100",
                      )}
                      style={{ height: `${barHeightPct}%` }}
                    >
                      <div
                        className="w-full bg-indigo-500"
                        style={{ height: `${inputPct}%` }}
                      />
                      {metricMode !== "uncached" ? (
                        <div
                          className="w-full bg-cyan-400/90"
                          style={{ height: `${cachePct}%` }}
                        />
                      ) : null}
                      <div
                        className="w-full bg-violet-500"
                        style={{ height: `${thinkingPct}%` }}
                      />
                      <div
                        className="w-full bg-emerald-400"
                        style={{ height: `${responsePct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* X-Axis Labels */}
          {isHourly ? (
            <div className="mt-1.5 flex items-center gap-1 pl-10 sm:gap-1.5 sm:pl-12">
              {visiblePoints.map((pt, index) => {
                const hourStr = formatTrendBucketLabel(pt.date, "hour").slice(
                  0,
                  2,
                );
                const showTick =
                  index % 2 === 0 || index === visiblePoints.length - 1;
                return (
                  <span
                    key={pt.date}
                    className={cn(
                      "min-w-0 flex-1 truncate text-center font-mono text-[9px] tabular-nums text-zinc-400 dark:text-slate-500",
                      !showTick && "hidden sm:inline",
                    )}
                  >
                    {hourStr}
                  </span>
                );
              })}
            </div>
          ) : (
            <div className="mt-2 flex items-center justify-between pl-10 font-mono text-[10px] tabular-nums text-zinc-400 dark:text-slate-500 sm:pl-12">
              <span>{visiblePoints[0]?.date ?? ""}</span>
              {visiblePoints.length >= 5 ? (
                <span className="hidden sm:inline">
                  {visiblePoints[Math.floor(visiblePoints.length / 2)]?.date ??
                    ""}
                </span>
              ) : null}
              <span>{visiblePoints[visiblePoints.length - 1]?.date ?? ""}</span>
            </div>
          )}

          {/* Legend & interaction hint */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-900/[0.06] pt-3 text-[11px] text-zinc-500 dark:border-white/[0.06] dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                Input
              </span>
              {metricMode !== "uncached" ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  Cache
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-violet-500" />
                Thinking
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Response
              </span>
            </div>
            <span className="hidden text-[10px] text-zinc-400 dark:text-slate-500 sm:inline">
              点击柱子可钉选明细
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
