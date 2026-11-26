"use client";

import { Check, Filter, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { formatCompactTokens, formatUsd } from "@/lib/token-format";
import { cn } from "@/lib/utils";
import type { ModelUsageSummary } from "@/types/token-usage";

interface ModelTokenRankingPanelProps {
  readonly models: readonly ModelUsageSummary[];
  readonly selectedModel: string | null;
  readonly onSelectModel: (modelName: string | null) => void;
}

type RankingSortBy = "tokens" | "cost";

const RANK_BADGE_CLASS: readonly string[] = [
  "bg-amber-400 text-amber-950 shadow-sm shadow-amber-500/30",
  "bg-zinc-300 text-zinc-800 dark:bg-slate-300 dark:text-slate-900",
  "bg-orange-300 text-orange-950",
];

export function ModelTokenRankingPanel({
  models,
  selectedModel,
  onSelectModel,
}: ModelTokenRankingPanelProps) {
  const [sortBy, setSortBy] = useState<RankingSortBy>("tokens");

  const rankedModels = useMemo(() => {
    const copy = [...models];
    copy.sort((left, right) =>
      sortBy === "cost"
        ? right.cost.totalCostUsd - left.cost.totalCostUsd
        : right.usage.totalTokens - left.usage.totalTokens,
    );
    return copy;
  }, [models, sortBy]);

  const leaderValue =
    sortBy === "cost"
      ? (rankedModels[0]?.cost.totalCostUsd ?? 0)
      : (rankedModels[0]?.usage.totalTokens ?? 0);

  return (
    <section
      aria-label="按模型 Token 消耗排行"
      className="flex h-full flex-col rounded-3xl border border-zinc-900/[0.08] bg-white/85 p-5 shadow-glass-light backdrop-blur-md dark:border-white/[0.07] dark:bg-slate-900/75 dark:shadow-glass-dark"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Trophy
            className="h-4 w-4 text-amber-500 dark:text-amber-300"
            aria-hidden="true"
          />
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">
            模型排行
          </h2>
          <span className="font-mono text-[11px] tabular-nums text-zinc-400 dark:text-slate-500">
            {rankedModels.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {selectedModel ? (
            <button
              type="button"
              onClick={() => onSelectModel(null)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-indigo-500/12 px-2 py-0.5 text-[11px] font-medium text-indigo-600 transition hover:bg-indigo-500/20 dark:bg-cyan-400/15 dark:text-cyan-300"
            >
              <Filter className="h-3 w-3" aria-hidden="true" />
              清除
            </button>
          ) : null}

          <div
            role="group"
            aria-label="模型排行排序口径"
            className="inline-flex items-center rounded-xl border border-zinc-900/[0.08] bg-zinc-100/85 p-0.5 text-[11px] dark:border-white/10 dark:bg-slate-950/60"
          >
            <button
              type="button"
              aria-pressed={sortBy === "tokens"}
              onClick={() => setSortBy("tokens")}
              className={cn(
                "cursor-pointer rounded-lg px-2 py-0.5 font-medium transition-colors",
                sortBy === "tokens"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-slate-400 dark:hover:text-slate-200",
              )}
            >
              Token
            </button>
            <button
              type="button"
              aria-pressed={sortBy === "cost"}
              onClick={() => setSortBy("cost")}
              className={cn(
                "cursor-pointer rounded-lg px-2 py-0.5 font-medium transition-colors",
                sortBy === "cost"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-slate-400 dark:hover:text-slate-200",
              )}
            >
              费用
            </button>
          </div>
        </div>
      </div>

      <ol className="mt-4 max-h-[312px] flex-1 space-y-2 overflow-y-auto pr-1 nx-scrollbar">
        {rankedModels.length === 0 ? (
          <li className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-zinc-900/10 text-xs text-zinc-500 dark:border-white/10 dark:text-slate-400">
            当前时间范围内暂无模型消耗
          </li>
        ) : (
          rankedModels.map((item, index) => {
            const rank = index + 1;
            const isSelected = selectedModel === item.modelName;
            const currentVal =
              sortBy === "cost"
                ? item.cost.totalCostUsd
                : item.usage.totalTokens;
            const barWidth =
              leaderValue > 0
                ? Math.max(4, (currentVal / leaderValue) * 100)
                : 0;
            const sharePct =
              sortBy === "cost" ? item.costSharePct : item.sharePct;

            return (
              <li key={item.modelName}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() =>
                    onSelectModel(isSelected ? null : item.modelName)
                  }
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors duration-150",
                    isSelected
                      ? "border-indigo-500/60 bg-indigo-500/[0.08] ring-1 ring-indigo-500/25 dark:border-cyan-400/60 dark:bg-cyan-400/[0.09] dark:ring-cyan-400/25"
                      : "border-zinc-900/[0.06] bg-zinc-50/75 hover:border-indigo-500/25 hover:bg-white dark:border-white/[0.06] dark:bg-slate-950/45 dark:hover:border-white/15 dark:hover:bg-slate-900/80",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold",
                      isSelected
                        ? "bg-indigo-600 text-white dark:bg-cyan-400 dark:text-slate-950"
                        : (RANK_BADGE_CLASS[index] ??
                            "bg-zinc-900/[0.06] text-zinc-500 dark:bg-white/10 dark:text-slate-300"),
                    )}
                    aria-hidden="true"
                  >
                    {isSelected ? <Check className="h-3.5 w-3.5" /> : rank}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-zinc-900 dark:text-white">
                        {item.modelName}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 font-mono text-xs font-semibold tabular-nums",
                          sortBy === "cost"
                            ? "text-amber-600 dark:text-amber-300"
                            : "text-zinc-900 dark:text-slate-100",
                        )}
                      >
                        {sortBy === "cost"
                          ? formatUsd(item.cost.totalCostUsd)
                          : formatCompactTokens(item.usage.totalTokens)}
                      </span>
                    </div>

                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-900/[0.07] dark:bg-white/10">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          sortBy === "cost"
                            ? "bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400"
                            : "bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400",
                        )}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>

                    <div className="mt-1.5 flex items-center justify-between gap-2 font-mono text-[10px] tabular-nums text-zinc-500 dark:text-slate-400">
                      <span className="truncate">
                        {sharePct}% · {item.sessionCount} 会话 · 命中{" "}
                        {item.cacheHitRate}%
                      </span>
                      <span className="shrink-0 text-zinc-600 dark:text-slate-300">
                        {sortBy === "cost"
                          ? formatCompactTokens(item.usage.totalTokens)
                          : formatUsd(item.cost.totalCostUsd)}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            );
          })
        )}
      </ol>

      <p className="mt-3 border-t border-zinc-900/[0.06] pt-2.5 text-[10px] text-zinc-400 dark:border-white/[0.06] dark:text-slate-500">
        点击任意模型可联动筛选下方会话明细
      </p>
    </section>
  );
}
