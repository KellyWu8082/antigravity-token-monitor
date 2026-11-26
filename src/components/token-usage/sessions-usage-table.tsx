"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Search,
  Table2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  formatCompactTokens,
  formatDateTime,
  formatRelativeTime,
  formatTokenCount,
  formatUsd,
} from "@/lib/token-format";
import { resolveModelGroup } from "@/lib/token-pricing";
import { cn } from "@/lib/utils";
import { workspaceSelectionKey } from "@/lib/workspace-key";
import type { SessionSummary } from "@/types/token-usage";

type SortColumn =
  | "workspace"
  | "primaryModel"
  | "turns"
  | "totalTokens"
  | "totalCostUsd"
  | "updatedAt";

type SortDirection = "ascending" | "descending";

interface SessionsUsageTableProps {
  readonly sessions: readonly SessionSummary[];
  readonly selectedModel: string | null;
  readonly selectedWorkspace: string | null;
  readonly selectedWorkspaceName: string | null;
  readonly onClearModel: () => void;
  readonly onClearWorkspace: () => void;
  readonly onOpenSession: (sessionId: string) => void;
}

const PAGE_SIZE = 20;
const TEXT_COLLATOR = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

export function SessionsUsageTable({
  sessions,
  selectedModel,
  selectedWorkspace,
  selectedWorkspaceName,
  onClearModel,
  onClearWorkspace,
  onOpenSession,
}: SessionsUsageTableProps) {
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<SortColumn>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDirection>("descending");
  const [page, setPage] = useState(1);
  const [sortAnnouncement, setSortAnnouncement] = useState("");

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions.filter((session) => {
      if (
        selectedModel &&
        !session.models.some(
          (m) => resolveModelGroup(m, m).groupName === selectedModel,
        )
      ) {
        return false;
      }
      if (
        selectedWorkspace &&
        workspaceSelectionKey(session) !== selectedWorkspace
      ) {
        return false;
      }
      if (!q) return true;
      return (
        session.sessionId.toLowerCase().includes(q) ||
        (session.workspaceName ?? "").toLowerCase().includes(q) ||
        (session.workspacePath ?? "").toLowerCase().includes(q) ||
        (session.repoName ?? "").toLowerCase().includes(q) ||
        session.primaryModel.toLowerCase().includes(q) ||
        session.models.some((m) => m.toLowerCase().includes(q))
      );
    });
  }, [search, selectedModel, selectedWorkspace, sessions]);

  const filteredSummary = useMemo(() => {
    let totalTokens = 0;
    let totalCostUsd = 0;
    for (const session of filteredSessions) {
      totalTokens += session.usage.totalTokens;
      totalCostUsd += session.cost.totalCostUsd;
    }
    return { totalTokens, totalCostUsd };
  }, [filteredSessions]);

  const sortedSessions = useMemo(() => {
    const factor = sortDir === "ascending" ? 1 : -1;
    const copy = [...filteredSessions];
    copy.sort((a, b) => {
      switch (sortCol) {
        case "workspace": {
          const wa = a.workspaceName ?? a.repoName ?? a.sessionId;
          const wb = b.workspaceName ?? b.repoName ?? b.sessionId;
          return factor * TEXT_COLLATOR.compare(wa, wb);
        }
        case "primaryModel":
          return factor * TEXT_COLLATOR.compare(a.primaryModel, b.primaryModel);
        case "turns":
          return factor * (a.turns - b.turns);
        case "totalTokens":
          return factor * (a.usage.totalTokens - b.usage.totalTokens);
        case "totalCostUsd":
          return factor * (a.cost.totalCostUsd - b.cost.totalCostUsd);
        case "updatedAt":
        default:
          return factor * (Date.parse(a.updatedAt) - Date.parse(b.updatedAt));
      }
    });
    return copy;
  }, [filteredSessions, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedSessions.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [search, selectedModel, selectedWorkspace, sortCol, sortDir]);

  const clampedPage = Math.min(page, totalPages);
  const pagedSessions = useMemo(() => {
    const start = (clampedPage - 1) * PAGE_SIZE;
    return sortedSessions.slice(start, start + PAGE_SIZE);
  }, [clampedPage, sortedSessions]);

  const hasActiveFilters = Boolean(
    search.trim() || selectedModel || selectedWorkspace,
  );

  const handleResetAll = () => {
    setSearch("");
    if (selectedModel) onClearModel();
    if (selectedWorkspace) onClearWorkspace();
  };

  const handleSort = (col: SortColumn, label: string) => {
    const nextDir: SortDirection =
      sortCol === col
        ? sortDir === "ascending"
          ? "descending"
          : "ascending"
        : col === "workspace" || col === "primaryModel"
          ? "ascending"
          : "descending";
    setSortCol(col);
    setSortDir(nextDir);
    setSortAnnouncement(
      `已按${label}${nextDir === "ascending" ? "升序" : "降序"}排列，共 ${sortedSessions.length} 条会话`,
    );
  };

  const renderSortHeader = (
    col: SortColumn,
    label: string,
    align: "left" | "right" = "right",
  ) => {
    const isSorted = sortCol === col;
    return (
      <th
        scope="col"
        aria-sort={isSorted ? sortDir : undefined}
        className={cn(
          "whitespace-nowrap border-b border-zinc-900/[0.08] bg-zinc-50/95 p-0 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 backdrop-blur-md dark:border-white/[0.08] dark:bg-slate-900/95 dark:text-slate-400",
          align === "right" ? "text-right" : "text-left",
        )}
      >
        <button
          type="button"
          onClick={() => handleSort(col, label)}
          className={cn(
            "inline-flex min-h-[36px] w-full cursor-pointer items-center gap-1 px-3 py-2 transition-colors hover:text-zinc-900 dark:hover:text-white",
            align === "right" ? "justify-end" : "justify-start",
            isSorted && "text-indigo-600 dark:text-cyan-300",
          )}
        >
          <span>{label}</span>
          {isSorted ? (
            sortDir === "ascending" ? (
              <ArrowUp className="h-3 w-3 shrink-0" aria-hidden="true" />
            ) : (
              <ArrowDown className="h-3 w-3 shrink-0" aria-hidden="true" />
            )
          ) : (
            <ArrowUpDown
              className="h-3 w-3 shrink-0 opacity-40"
              aria-hidden="true"
            />
          )}
        </button>
      </th>
    );
  };

  return (
    <section
      aria-label="Antigravity 会话 Token 与费用明细表"
      className="nx-panel-isolated rounded-3xl border border-zinc-900/[0.08] bg-white/85 p-5 shadow-glass-light backdrop-blur-md dark:border-white/[0.07] dark:bg-slate-900/75 dark:shadow-glass-dark"
    >
      {/* Visually hidden live region for screen-reader sort feedback */}
      <div role="status" className="sr-only">
        {sortAnnouncement}
      </div>

      {/* Table Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Table2
              className="h-4 w-4 text-indigo-500 dark:text-cyan-400"
              aria-hidden="true"
            />
            <h2
              id="sessions-table-caption"
              className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white"
            >
              会话明细
            </h2>
          </div>
          <p className="mt-1 font-mono text-[11px] tabular-nums text-zinc-500 dark:text-slate-400">
            共 {filteredSessions.length} 个会话
            <span className="mx-1.5 text-zinc-300 dark:text-slate-600">·</span>
            {formatCompactTokens(filteredSummary.totalTokens)} tokens
            <span className="mx-1.5 text-zinc-300 dark:text-slate-600">·</span>
            <span className="font-semibold text-amber-600 dark:text-amber-300">
              {formatUsd(filteredSummary.totalCostUsd)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedModel ? (
            <button
              type="button"
              onClick={onClearModel}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-500/20 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-300"
            >
              <span>模型: {selectedModel}</span>
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          ) : null}
          {selectedWorkspace ? (
            <button
              type="button"
              onClick={onClearWorkspace}
              className="inline-flex max-w-[220px] cursor-pointer items-center gap-1 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-500/20 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-300"
            >
              <span className="truncate">
                项目: {selectedWorkspaceName ?? "未绑定工作区"}
              </span>
              <X className="h-3 w-3 shrink-0" aria-hidden="true" />
            </button>
          ) : null}

          <div className="relative flex items-center">
            <Search
              className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-zinc-400 dark:text-slate-500"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索会话 ID / 项目 / 模型..."
              aria-label="搜索会话"
              className="h-9 w-56 rounded-2xl border border-zinc-900/10 bg-zinc-50/85 pl-8 pr-8 text-xs text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-indigo-500/50 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-400/50 sm:w-64"
            />
            {search ? (
              <button
                type="button"
                aria-label="清空搜索词"
                onClick={() => setSearch("")}
                className="absolute right-2 inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-200/70 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Scrollable Region */}
      <div
        tabIndex={0}
        role="region"
        aria-labelledby="sessions-table-caption"
        className="mt-4 max-h-[560px] overflow-auto rounded-2xl border border-zinc-900/[0.07] nx-scrollbar dark:border-white/[0.07]"
      >
        <table className="w-full min-w-[740px] border-separate border-spacing-0 text-left">
          <caption className="sr-only">
            本地 Antigravity IDE 会话 Token 与费用消耗明细列表
          </caption>
          <thead className="sticky top-0 z-10">
            <tr>
              {renderSortHeader("workspace", "会话", "left")}
              {renderSortHeader("primaryModel", "模型", "left")}
              {renderSortHeader("turns", "轮次", "right")}
              {renderSortHeader("totalTokens", "Token / 缓存", "right")}
              {renderSortHeader("totalCostUsd", "费用", "right")}
              {renderSortHeader("updatedAt", "最近", "right")}
              <th
                scope="col"
                className="whitespace-nowrap border-b border-zinc-900/[0.08] bg-zinc-50/95 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500 backdrop-blur-md dark:border-white/[0.08] dark:bg-slate-900/95 dark:text-slate-400"
              >
                明细
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/[0.05] dark:divide-white/[0.05]">
            {pagedSessions.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-xs text-zinc-500 dark:text-slate-400"
                >
                  <p>未匹配到符合条件的会话记录</p>
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={handleResetAll}
                      className="mt-2.5 inline-flex cursor-pointer items-center gap-1 rounded-xl border border-zinc-900/10 bg-white px-3 py-1 text-xs font-medium text-zinc-700 transition hover:border-indigo-500/40 hover:text-indigo-600 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-cyan-400/40 dark:hover:text-cyan-300"
                    >
                      重置所有筛选条件
                    </button>
                  ) : null}
                </td>
              </tr>
            ) : (
              pagedSessions.map((session) => (
                <tr
                  key={session.sessionId}
                  onClick={() => onOpenSession(session.sessionId)}
                  className="group cursor-pointer transition-colors hover:bg-indigo-500/[0.045] dark:hover:bg-cyan-400/[0.05]"
                >
                  <th
                    scope="row"
                    className="whitespace-nowrap px-3 py-2.5 text-left font-normal"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="max-w-[200px] truncate text-xs font-semibold text-zinc-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-cyan-300">
                          {session.workspaceName ??
                            session.repoName ??
                            "独立会话"}
                        </span>
                        <span className="rounded bg-zinc-900/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 dark:bg-white/10 dark:text-slate-400">
                          {session.sourceDir}
                        </span>
                      </div>
                      <span
                        title={session.sessionId}
                        className="font-mono text-[11px] text-zinc-400 dark:text-slate-500"
                      >
                        {session.sessionId.slice(0, 12)}…
                        {session.gitBranch ? ` · ${session.gitBranch}` : ""}
                      </span>
                    </div>
                  </th>

                  <td className="whitespace-nowrap px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="max-w-[180px] truncate text-xs font-medium text-zinc-700 dark:text-slate-200">
                        {session.primaryModel}
                      </span>
                      {session.models.length > 1 ? (
                        <span
                          title={session.models.join(", ")}
                          className="rounded-full bg-indigo-500/10 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-indigo-600 dark:bg-cyan-400/15 dark:text-cyan-300"
                        >
                          +{session.models.length - 1}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-xs tabular-nums text-zinc-700 dark:text-slate-300">
                    {formatTokenCount(session.turns)}
                  </td>

                  <td
                    title={`总计 ${formatTokenCount(session.usage.totalTokens)} · In ${formatCompactTokens(session.usage.inputTokens)} · Cache ${formatCompactTokens(session.usage.cacheReadTokens)} · Out ${formatCompactTokens(session.usage.outputTokens)}`}
                    className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-xs font-semibold tabular-nums text-zinc-900 dark:text-white"
                  >
                    <div>{formatCompactTokens(session.usage.totalTokens)}</div>
                    <div className="mt-0.5 flex items-center justify-end gap-1.5 text-[10px] font-normal text-zinc-400 dark:text-slate-500">
                      <span className="inline-block h-1 w-10 overflow-hidden rounded-full bg-zinc-900/10 dark:bg-white/10">
                        <span
                          className="block h-full rounded-full bg-cyan-500 dark:bg-cyan-400"
                          style={{
                            width: `${Math.min(100, Math.max(0, session.cacheHitRate))}%`,
                          }}
                        />
                      </span>
                      <span>{session.cacheHitRate}%</span>
                    </div>
                  </td>

                  <td
                    title={`净消耗 ${formatUsd(session.cost.uncachedCostUsd)} · 缓存 ${formatUsd(session.cost.cacheReadCostUsd)} · 省 ${formatUsd(session.cost.cacheSavingsUsd)}`}
                    className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-xs font-semibold tabular-nums text-amber-600 dark:text-amber-300"
                  >
                    {formatUsd(session.cost.totalCostUsd)}
                  </td>

                  <td
                    title={formatDateTime(session.updatedAt)}
                    className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[11px] tabular-nums text-zinc-500 dark:text-slate-400"
                  >
                    {formatRelativeTime(session.updatedAt)}
                  </td>

                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenSession(session.sessionId);
                      }}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-zinc-900/10 bg-white/85 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:border-indigo-500/40 hover:text-indigo-600 dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:border-cyan-400/40 dark:hover:text-cyan-300"
                    >
                      <span>轮次</span>
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-slate-400">
          <span className="font-mono tabular-nums">
            第 {clampedPage} / {totalPages} 页 · 共 {sortedSessions.length} 条
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={clampedPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-xl border border-zinc-900/10 bg-white/85 px-2.5 font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              上一页
            </button>
            <button
              type="button"
              disabled={clampedPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-xl border border-zinc-900/10 bg-white/85 px-2.5 font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              下一页
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
