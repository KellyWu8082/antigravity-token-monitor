"use client";

import { motion } from "framer-motion";
import { Cpu, Sparkles } from "lucide-react";
import { useId } from "react";
import type { AiCategoryBreakdown } from "@/types/nexus";

interface AiAdoptionChartProps {
  readonly overallRate: number;
  readonly breakdown: readonly AiCategoryBreakdown[];
}

export function AiAdoptionChart({
  overallRate,
  breakdown,
}: AiAdoptionChartProps) {
  const ringGradId = useId();
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const clampedRate = Math.max(0, Math.min(100, overallRate));
  const strokeDashoffset =
    circumference - (clampedRate / 100) * circumference;

  return (
    <section
      aria-label="AI 代码采纳率与效能分布"
      className="flex flex-col justify-between rounded-3xl border border-zinc-900/[0.07] bg-white/75 p-5 shadow-glass-light backdrop-blur-md dark:border-white/5 dark:bg-slate-900/65 dark:shadow-glass-dark sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-400/20 text-indigo-600 dark:text-cyan-300">
              <Cpu className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-white">
              AI 代码采纳率分布
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-slate-400">
            各研发域 Copilot 生成代码净采纳比例与交付提速倍率
          </p>
        </div>

        {/* SVG Radial Gauge */}
        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
          <svg
            viewBox="0 0 120 120"
            className="-rotate-90 h-28 w-28"
            role="img"
            aria-label={`总体 AI 代码采纳率 ${clampedRate}%`}
          >
            <defs>
              <linearGradient id={ringGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            <circle
              cx={60}
              cy={60}
              r={radius}
              fill="none"
              strokeWidth={10}
              className="stroke-zinc-900/[0.08] dark:stroke-white/[0.07]"
            />
            <motion.circle
              cx={60}
              cy={60}
              r={radius}
              fill="none"
              strokeWidth={10}
              strokeLinecap="round"
              stroke={`url(#${ringGradId})`}
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-mono text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
              {clampedRate}%
            </span>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-indigo-600 dark:text-cyan-300">
              <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
              综合采纳
            </span>
          </div>
        </div>
      </div>

      {/* Category Breakdown Animated Bars */}
      <div className="mt-5 space-y-3.5">
        {breakdown.map((item, idx) => (
          <div key={item.id} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium text-zinc-700 dark:text-slate-200">
                {item.category}
              </span>
              <div className="flex shrink-0 items-center gap-2 font-mono text-[11px]">
                <span className="rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-indigo-600 dark:bg-cyan-400/10 dark:text-cyan-300">
                  {item.speedupFactor}
                </span>
                <span className="text-zinc-500 dark:text-slate-400">
                  {item.acceptedSuggestions} 条
                </span>
                <span className="w-9 text-right font-semibold text-zinc-900 dark:text-white">
                  {item.adoptionRate}%
                </span>
              </div>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-900/[0.06] dark:bg-white/[0.06]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.adoptionRate}%` }}
                transition={{
                  duration: 0.7,
                  delay: idx * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

