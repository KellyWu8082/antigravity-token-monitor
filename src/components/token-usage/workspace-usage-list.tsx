"use client";

import { Check, Filter, FolderOpen } from "lucide-react";
import { useMemo, useState } from "react";
import {
  formatCompactTokens,
  formatTokenCount,
  formatUsd,
} from "@/lib/token-format";
import { cn } from "@/lib/utils";
import { workspaceSelectionKey } from "@/lib/workspace-key";
import type { WorkspaceUsageSummary } from "@/types/token-usage";

interface WorkspaceUsageListProps {
  readonly workspaces: readonly WorkspaceUsageSummary[];
  readonly selectedWorkspace: string | null;
  readonly onSelectWorkspace: (workspaceKey: string | null) => void;
}

type WorkspaceSortBy = "cost" | "tokens";

export function WorkspaceUsageList({
  workspaces,
  selectedWorkspace,
  onSelectWorkspace,
}: WorkspaceUsageListProps) {
  const [sortBy, setSortBy] = useState<WorkspaceSortBy>("cost");

  const sortedWorkspaces = useMemo(() => {
    const copy = [...workspaces];
    copy.sort((left, right) =>
      sortBy === "cost"
        ? right.cost.totalCostUsd - left.cost.totalCostUsd
        : right.usage.totalTokens - left.usage.totalTokens,
    );
    return copy;
  }, [sortBy, workspaces]);

  const leaderValue =
    sortBy === "cost"
      ? (sortedWorkspaces[0]?.cost.totalCostUsd ?? 0)
      : (sortedWorkspaces[0]?.usage.totalTokens ?? 0);

  return (
    <section
      aria-label="按项目消耗"
      className="flex h-full flex-col rounded-3xl border border-zinc-900/[0.08] bg-white/85 p-5 shadow-glass-light backdrop-blur-md dark:border-white/[0.07] dark:bg-slate-900/75 dark:shadow-glass-dark"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FolderOpen
            className="h-4 w-4 text-indigo-500 dark:text-cyan-400"
            aria-hidden="true"
          />
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">
            项目分布
          </h2>
          <span className="font-mono text-[11px] tabular-nums text-zinc-400 dark:text-slate-500">
            {sortedWorkspaces.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {selectedWorkspace ? (
            <button
              type="button"
              onClick={() => onSelectWorkspace(null)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-indigo-500/12 px-2 py-0.5 text-[11px] font-medium text-indigo-600 transition hover:bg-indigo-500/20 dark:bg-cyan-400/15 dark:text-cyan-300"
            >
              <Filter className="h-3 w-3" aria-hidden="true" />
              清除
            </button>
          ) : null}

          <div
            role="group"
            aria-label="项目分布排序口径"
            className="inline-flex items-center rounded-xl border border-zinc-900/[0.08] bg-zinc-100/85 p-0.5 text-[11px] dark:border-white/10 dark:bg-slate-950/60"
          >
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
          </div>
        </div>
      </div>

      <ol className="mt-4 max-h-[240px] flex-1 space-y-1.5 overflow-y-auto pr-1 nx-scrollbar">
        {sortedWorkspaces.length === 0 ? (
          <li className="flex h-36 items-center justify-center rounded-2xl border border-dashed border-zinc-900/10 text-xs text-zinc-500 dark:border-white/10 dark:text-slate-400">
            当前范围内没有项目消耗
          </li>
        ) : (
          sortedWorkspaces.map((workspace) => {
            const key = workspaceSelectionKey(workspace);
            const selected = selectedWorkspace === key;
            const currentVal =
              sortBy === "cost"
                ? workspace.cost.totalCostUsd
                : workspace.usage.totalTokens;
            const width =
              leaderValue > 0
                ? Math.max(4, (currentVal / leaderValue) * 100)
                : 0;
            return (
              <li key={key}>
                <button
                  type="button"
                  aria-pressed={selected}
                  title={workspace.workspacePath ?? workspace.workspaceName}
                  onClick={() => onSelectWorkspace(selected ? null : key)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2.5 rounded-2xl border px-3 py-2 text-left transition-colors duration-150",
                    selected
                      ? "border-indigo-500/60 bg-indigo-500/[0.08] ring-1 ring-indigo-500/25 dark:border-cyan-400/60 dark:bg-cyan-400/[0.09] dark:ring-cyan-400/25"
                      : "border-transparent bg-zinc-50/60 hover:border-zinc-900/10 hover:bg-white dark:bg-slate-950/35 dark:hover:border-white/10 dark:hover:bg-slate-900/70",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg",
                      selected
                        ? "bg-indigo-600 text-white dark:bg-cyan-400 dark:text-slate-950"
                        : "bg-zinc-900/[0.05] text-zinc-500 dark:bg-white/[0.07] dark:text-slate-400",
                    )}
                    aria-hidden="true"
                  >
                    {selected ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <FolderOpen className="h-3.5 w-3.5" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-zinc-900 dark:text-white">
                        {workspace.workspaceName}
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
                          ? formatUsd(workspace.cost.totalCostUsd)
                          : formatCompactTokens(workspace.usage.totalTokens)}
                      </span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-900/[0.07] dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px] tabular-nums text-zinc-500 dark:text-slate-400">
                      <span className="truncate">
                        {workspace.sharePct}% · {workspace.sessionCount} 会话 ·{" "}
                        {formatTokenCount(workspace.turns)} 轮
                      </span>
                      <span className="shrink-0 text-zinc-500 dark:text-slate-400">
                        {sortBy === "cost"
                          ? formatCompactTokens(workspace.usage.totalTokens)
                          : formatUsd(workspace.cost.totalCostUsd)}
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
        点击项目可联动筛选下方会话明细
      </p>
    </section>
  );
}
