"use client";

import { CalendarRange, Flame } from "lucide-react";
import { useMemo, useState } from "react";
import {
  formatCompactTokens,
  formatTokenCount,
  formatUsd,
} from "@/lib/token-format";
import { cn } from "@/lib/utils";
import type { ActivityDay } from "@/types/token-usage";

interface ActivityHeatmapProps {
  readonly days: readonly ActivityDay[];
}

interface HeatCell {
  readonly date: string;
  readonly day: ActivityDay | null;
}

const WEEKDAY_LABELS = ["", "一", "", "三", "", "五", ""];

function parseLocalDate(value: string): Date {
  const [yearText, monthText, dayText] = value.split("-");
  return new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function heatLevel(
  tokens: number,
  quartiles: readonly [number, number, number],
): number {
  if (tokens <= 0) return 0;
  if (tokens <= quartiles[0]) return 1;
  if (tokens <= quartiles[1]) return 2;
  if (tokens <= quartiles[2]) return 3;
  return 4;
}

const LEVEL_CLASS = [
  "bg-zinc-900/[0.06] dark:bg-white/[0.06]",
  "bg-emerald-200 dark:bg-emerald-900/90",
  "bg-emerald-400/80 dark:bg-emerald-700",
  "bg-emerald-500 dark:bg-emerald-500",
  "bg-emerald-700 dark:bg-emerald-300",
] as const;

export function ActivityHeatmap({ days }: ActivityHeatmapProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [pinnedDate, setPinnedDate] = useState<string | null>(null);

  const model = useMemo(() => {
    const byDate = new Map(days.map((day) => [day.date, day]));
    const positive = days
      .map((day) => day.totalTokens)
      .filter((tokens) => tokens > 0)
      .sort((left, right) => left - right);
    const quartileAt = (ratio: number): number => {
      if (positive.length === 0) return 0;
      const index = Math.min(
        positive.length - 1,
        Math.floor((positive.length - 1) * ratio),
      );
      return positive[index] ?? 0;
    };
    const quartiles: [number, number, number] = [
      quartileAt(0.25),
      quartileAt(0.5),
      quartileAt(0.75),
    ];

    const first = days[0] ? parseLocalDate(days[0].date) : new Date();
    const last = days.at(-1) ? parseLocalDate(days.at(-1)!.date) : first;
    const cursor = new Date(first);
    cursor.setDate(cursor.getDate() - cursor.getDay());

    const columns: HeatCell[][] = [];
    while (cursor <= last) {
      const week: HeatCell[] = [];
      for (let weekday = 0; weekday < 7; weekday += 1) {
        const key = formatLocalDate(cursor);
        const inRange = cursor >= first && cursor <= last;
        week.push({
          date: key,
          day: inRange ? (byDate.get(key) ?? null) : null,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      columns.push(week);
    }

    const monthLabels = columns.map((week, index) => {
      const anchor = week.find((cell) => cell.day);
      if (!anchor) return "";
      const month = parseLocalDate(anchor.date).getMonth();
      const previous = columns[index - 1]?.find((cell) => cell.day);
      const previousMonth = previous
        ? parseLocalDate(previous.date).getMonth()
        : -1;
      return month === previousMonth ? "" : `${month + 1}月`;
    });

    let peak = days[0] ?? null;
    let totalTokens = 0;
    let activeDays = 0;
    for (const day of days) {
      totalTokens += day.totalTokens;
      if (day.turns > 0) activeDays += 1;
      if (!peak || day.totalTokens > peak.totalTokens) peak = day;
    }

    const todayKey = formatLocalDate(new Date());
    const streakCursor = parseLocalDate(todayKey);
    if ((byDate.get(todayKey)?.totalTokens ?? 0) <= 0) {
      streakCursor.setDate(streakCursor.getDate() - 1);
    }
    let streak = 0;
    while (
      (byDate.get(formatLocalDate(streakCursor))?.totalTokens ?? 0) > 0
    ) {
      streak += 1;
      streakCursor.setDate(streakCursor.getDate() - 1);
    }

    return {
      byDate,
      columns,
      monthLabels,
      quartiles,
      todayKey,
      activeDays,
      attendancePct:
        days.length > 0 ? Math.round((activeDays / days.length) * 1000) / 10 : 0,
      peak,
      streak,
      totalTokens,
    };
  }, [days]);

  const activeDate = hoveredDate ?? pinnedDate;
  const activeDay = activeDate ? (model.byDate.get(activeDate) ?? null) : null;

  return (
    <section
      aria-label="近一年消耗热力图"
      className="nx-panel-isolated flex h-full flex-col justify-between rounded-3xl border border-zinc-900/[0.08] bg-white/85 p-5 shadow-glass-light backdrop-blur-md dark:border-white/[0.07] dark:bg-slate-900/75 dark:shadow-glass-dark"
    >
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarRange
              className="h-4 w-4 text-emerald-500 dark:text-emerald-400"
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">
              近一年活跃热力
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] tabular-nums">
            <span className="rounded-lg bg-zinc-900/[0.05] px-2 py-0.5 text-zinc-600 dark:bg-white/[0.07] dark:text-slate-300">
              活跃 {model.activeDays} 天 ({model.attendancePct}%)
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
              <Flame className="h-3 w-3" aria-hidden="true" />
              连击 {model.streak} 天
            </span>
            {model.peak && model.peak.totalTokens > 0 ? (
              <span className="hidden rounded-lg bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300 sm:inline-flex">
                峰值 {model.peak.date.slice(5)}{" "}
                {formatCompactTokens(model.peak.totalTokens)}
              </span>
            ) : null}
            <span className="hidden rounded-lg bg-zinc-900/[0.05] px-2 py-0.5 text-zinc-600 dark:bg-white/[0.07] dark:text-slate-300 md:inline-flex">
              年累计 {formatCompactTokens(model.totalTokens)}
            </span>
          </div>
        </div>

        {/* Scrollable wrapper on narrow screens so cells never crush into 2px */}
        <div className="mt-4 overflow-x-auto pb-1 nx-scrollbar">
          <div
            className="grid min-w-[560px] gap-[3px]"
            style={{
              gridTemplateColumns: `14px repeat(${model.columns.length}, minmax(0, 1fr))`,
            }}
          >
            <span />
            {model.monthLabels.map((label, index) => (
              <span
                key={`month-${index}`}
                className="overflow-visible whitespace-nowrap text-[9px] leading-4 text-zinc-400 dark:text-slate-500"
              >
                {label}
              </span>
            ))}
            {WEEKDAY_LABELS.map((label, rowIndex) => (
              <span
                key={`weekday-${rowIndex}`}
                className="self-center text-[9px] leading-none text-zinc-400 dark:text-slate-500"
                style={{ gridColumn: 1, gridRow: rowIndex + 2 }}
              >
                {label}
              </span>
            ))}
            {model.columns.map((week, weekIndex) =>
              week.map((cell, rowIndex) => {
                const column = weekIndex + 2;
                const row = rowIndex + 2;
                if (!cell.day) {
                  return (
                    <span
                      key={cell.date}
                      aria-hidden="true"
                      className="aspect-square"
                      style={{ gridColumn: column, gridRow: row }}
                    />
                  );
                }
                const level = heatLevel(cell.day.totalTokens, model.quartiles);
                const isToday = cell.date === model.todayKey;
                const isSelected = activeDate === cell.date;
                return (
                  <button
                    key={cell.date}
                    type="button"
                    onMouseEnter={() => setHoveredDate(cell.date)}
                    onFocus={() => setHoveredDate(cell.date)}
                    onMouseLeave={() => setHoveredDate(null)}
                    onClick={() =>
                      setPinnedDate((prev) =>
                        prev === cell.date ? null : cell.date,
                      )
                    }
                    aria-pressed={pinnedDate === cell.date}
                    aria-label={`${cell.date} ${formatTokenCount(cell.day.totalTokens)} tokens`}
                    className={cn(
                      "aspect-square w-full cursor-pointer rounded-[3px] transition-opacity duration-150",
                      LEVEL_CLASS[level],
                      isToday && "ring-1 ring-cyan-400",
                      isSelected &&
                        "ring-2 ring-indigo-500 dark:ring-cyan-300",
                    )}
                    style={{ gridColumn: column, gridRow: row }}
                  />
                );
              }),
            )}
          </div>
        </div>
      </div>

      {/* Footer inspection line + legend */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-900/[0.06] pt-2.5 dark:border-white/[0.06]">
        <p className="min-h-4 font-mono text-[11px] tabular-nums text-zinc-600 dark:text-slate-300">
          {activeDay ? (
            <>
              <span className="font-semibold text-zinc-900 dark:text-white">
                {activeDay.date}
              </span>
              <span className="mx-1.5 text-zinc-300 dark:text-slate-600">·</span>
              {formatTokenCount(activeDay.turns)} 轮
              <span className="mx-1.5 text-zinc-300 dark:text-slate-600">·</span>
              {formatCompactTokens(activeDay.totalTokens)}
              <span className="mx-1.5 text-zinc-300 dark:text-slate-600">·</span>
              <span className="font-semibold text-amber-600 dark:text-amber-300">
                {formatUsd(activeDay.totalCostUsd)}
              </span>
            </>
          ) : (
            <span className="font-sans text-[11px] text-zinc-400 dark:text-slate-500">
              悬停或点击任意日期查看当日消耗明细
            </span>
          )}
        </p>

        <div
          aria-hidden="true"
          className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-slate-500"
        >
          <span>少</span>
          {LEVEL_CLASS.map((cls, idx) => (
            <span
              key={idx}
              className={cn("h-2.5 w-2.5 rounded-[2px]", cls)}
            />
          ))}
          <span>多</span>
        </div>
      </div>
    </section>
  );
}
