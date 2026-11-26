"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { ProductivityPoint } from "@/types/nexus";

interface ProductivityChartProps {
  readonly series: readonly ProductivityPoint[];
}

interface CoordPoint {
  readonly x: number;
  readonly y: number;
}

function buildSmoothPath(points: readonly CoordPoint[]): string {
  const first = points[0];
  if (!first) return "";
  if (points.length === 1) return `M ${first.x} ${first.y}`;

  let path = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return path;
}

export function ProductivityChart({ series }: ProductivityChartProps) {
  const gradientId = useId();
  const areaGradientId = useId();
  const [activeIndex, setActiveIndex] = useState<number>(
    Math.max(0, series.length - 1)
  );

  const width = 640;
  const height = 250;
  const padLeft = 36;
  const padRight = 18;
  const padTop = 20;
  const padBottom = 34;

  const chartData = useMemo(() => {
    const maxRaw = Math.max(
      10,
      ...series.flatMap((item) => [item.actualPoints, item.aiProjectedPoints])
    );
    const maxValue = Math.ceil(maxRaw / 5) * 5 + 5;
    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;

    const toCoord = (index: number, value: number): CoordPoint => {
      const ratioX = series.length > 1 ? index / (series.length - 1) : 0.5;
      const x = padLeft + ratioX * plotWidth;
      const y = padTop + plotHeight - (value / maxValue) * plotHeight;
      return { x, y };
    };

    const actualCoords = series.map((item, idx) =>
      toCoord(idx, item.actualPoints)
    );
    const baselineCoords = series.map((item, idx) =>
      toCoord(idx, item.aiProjectedPoints)
    );

    const actualLine = buildSmoothPath(actualCoords);
    const baselineLine = buildSmoothPath(baselineCoords);
    const firstCoord = actualCoords[0];
    const lastCoord = actualCoords[actualCoords.length - 1];
    const baselineY = padTop + plotHeight;

    const areaPath =
      firstCoord && lastCoord
        ? `${actualLine} L ${lastCoord.x.toFixed(2)} ${baselineY} L ${firstCoord.x.toFixed(2)} ${baselineY} Z`
        : "";

    const gridTicks = [0.25, 0.5, 0.75, 1].map((fraction) => ({
      y: padTop + plotHeight - fraction * plotHeight,
      label: Math.round(maxValue * fraction),
    }));

    return {
      actualCoords,
      baselineCoords,
      actualLine,
      baselineLine,
      areaPath,
      gridTicks,
      baselineY,
    };
  }, [series]);

  const safeIndex = Math.min(activeIndex, Math.max(0, series.length - 1));
  const activeDatum = series[safeIndex];
  const activeCoord = chartData.actualCoords[safeIndex];

  return (
    <section
      aria-label="团队每周生产力波动图"
      className="relative overflow-hidden rounded-3xl border border-zinc-900/[0.07] bg-white/75 p-5 shadow-glass-light backdrop-blur-md dark:border-white/5 dark:bg-slate-900/65 dark:shadow-glass-dark sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-400/20 text-indigo-600 dark:text-cyan-300">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-white">
              团队生产力波动曲线
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-slate-400">
            实际交付 Story Points 与 AI 预测加速基线对比（悬停或聚焦节点查看明细）
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium text-zinc-700 dark:text-slate-200">
            <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400" />
            实际交付
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-zinc-500 dark:text-slate-400">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-violet-400/80" />
            AI 预测基线
          </span>
        </div>
      </div>

      {/* Interactive SVG Chart */}
      <div className="relative mt-5">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="生产力趋势折线图"
          className="h-60 w-full overflow-visible select-none"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
            <linearGradient id={areaGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.28" />
              <stop offset="55%" stopColor="#22d3ee" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines */}
          {chartData.gridTicks.map((tick) => (
            <g key={tick.label}>
              <line
                x1={padLeft}
                y1={tick.y}
                x2={width - padRight}
                y2={tick.y}
                className="stroke-zinc-900/[0.07] dark:stroke-white/[0.06]"
                strokeDasharray="4 4"
              />
              <text
                x={padLeft - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-zinc-400 font-mono text-[10px] dark:fill-slate-500"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Base Line */}
          <line
            x1={padLeft}
            y1={chartData.baselineY}
            x2={width - padRight}
            y2={chartData.baselineY}
            className="stroke-zinc-900/10 dark:stroke-white/10"
          />

          {/* Area Fill */}
          {chartData.areaPath ? (
            <motion.path
              key={`area-${series.map((s) => s.actualPoints).join("-")}`}
              d={chartData.areaPath}
              fill={`url(#${areaGradientId})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.55 }}
            />
          ) : null}

          {/* AI Baseline Dashed Curve */}
          {chartData.baselineLine ? (
            <motion.path
              key={`base-${series.map((s) => s.aiProjectedPoints).join("-")}`}
              d={chartData.baselineLine}
              fill="none"
              stroke="#a78bfa"
              strokeOpacity={0.65}
              strokeWidth={2}
              strokeDasharray="5 5"
              initial={{ pathLength: 0, opacity: 0.4 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.75, ease: "easeOut" }}
            />
          ) : null}

          {/* Actual Velocity Luminous Curve */}
          {chartData.actualLine ? (
            <motion.path
              key={`actual-${series.map((s) => s.actualPoints).join("-")}`}
              d={chartData.actualLine}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={3}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            />
          ) : null}

          {/* Active Crosshair */}
          {activeCoord ? (
            <line
              x1={activeCoord.x}
              y1={padTop}
              x2={activeCoord.x}
              y2={chartData.baselineY}
              className="stroke-indigo-500/40 dark:stroke-cyan-400/45"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          ) : null}

          {/* Interactive Data Nodes & X-axis labels */}
          {series.map((item, idx) => {
            const coord = chartData.actualCoords[idx];
            if (!coord) return null;
            const isSelected = idx === safeIndex;

            return (
              <g key={item.label}>
                <text
                  x={coord.x}
                  y={height - 10}
                  textAnchor="middle"
                  className={cn(
                    "font-mono text-[11px] transition-colors",
                    isSelected
                      ? "fill-indigo-600 font-semibold dark:fill-cyan-300"
                      : "fill-zinc-400 dark:fill-slate-500"
                  )}
                >
                  {item.label}
                </text>

                {isSelected ? (
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={10}
                    className="fill-indigo-500/15 dark:fill-cyan-400/20"
                  />
                ) : null}

                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={isSelected ? 5 : 3.5}
                  className={cn(
                    "transition-all duration-150",
                    isSelected
                      ? "fill-cyan-400 stroke-white dark:stroke-slate-900"
                      : "fill-indigo-500 stroke-white/80 dark:stroke-slate-900"
                  )}
                  strokeWidth={2}
                />

                {/* Wide Hit Target for smooth hovering & keyboard focus */}
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={22}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${item.label}: 实际 ${item.actualPoints} 点, AI基线 ${item.aiProjectedPoints} 点`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onFocus={() => setActiveIndex(idx)}
                  onClick={() => setActiveIndex(idx)}
                  className="cursor-pointer outline-none"
                />
              </g>
            );
          })}
        </svg>

        {/* Active Node Telemetry Strip */}
        {activeDatum ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-900/[0.06] bg-zinc-50/80 px-4 py-2.5 text-xs dark:border-white/[0.06] dark:bg-slate-950/55">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-400 px-2 py-0.5 font-mono text-[11px] font-semibold text-white">
                {activeDatum.label}
              </span>
              <span className="text-zinc-500 dark:text-slate-400">
                完成{" "}
                <strong className="font-mono text-zinc-900 dark:text-white">
                  {activeDatum.completedTasks}
                </strong>{" "}
                个研发任务
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 font-mono text-[11px]">
              <span className="text-indigo-600 dark:text-cyan-300">
                实际产出: <strong>{activeDatum.actualPoints} pt</strong>
              </span>
              <span className="text-violet-600 dark:text-violet-300">
                AI 预测: <strong>{activeDatum.aiProjectedPoints} pt</strong>
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">
                AI 采纳率: <strong>{activeDatum.aiAdoptionPct}%</strong>
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

