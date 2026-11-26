"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowDown, Filter, RefreshCw, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useToast } from "@/components/providers/app-providers";
import { ActivityHeatmap } from "@/components/token-usage/activity-heatmap";
import { ModelTokenRankingPanel } from "@/components/token-usage/model-token-ranking-panel";
import { ScriptAuditBanner } from "@/components/token-usage/script-audit-banner";
import { SessionDetailDialog } from "@/components/token-usage/session-detail-dialog";
import { SessionsUsageTable } from "@/components/token-usage/sessions-usage-table";
import { TokenKpiCards } from "@/components/token-usage/token-kpi-cards";
import { TokenShellSidebar } from "@/components/token-usage/token-shell-sidebar";
import { TokenShellTopbar } from "@/components/token-usage/token-shell-topbar";
import { TokenTrendChart } from "@/components/token-usage/token-trend-chart";
import { WorkspaceUsageList } from "@/components/token-usage/workspace-usage-list";
import { AnalyticsSkeleton } from "@/components/ui/skeleton-loader";
import {
  TOKEN_USAGE_QUERY_KEY,
  useTokenUsageQuery,
} from "@/hooks/use-token-usage-query";
import { workspaceSelectionKey } from "@/lib/workspace-key";
import type { DataSourceMode, TimeRangeFilter } from "@/types/token-usage";

export function TokenUsageDashboard() {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [sourceMode, setSourceMode] = useState<DataSourceMode>("deduped");
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>("today");
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(
    null,
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const usageQuery = useTokenUsageQuery(sourceMode, timeRange);
  const data = usageQuery.data ?? null;

  const handleRefresh = useCallback(() => {
    void queryClient
      .invalidateQueries({ queryKey: TOKEN_USAGE_QUERY_KEY })
      .then(() => {
        pushToast({
          title: "已重新扫描本机 Antigravity 数据库",
          description: "SQLite 只读查询与 Protobuf 用量聚合已更新",
          variant: "success",
        });
      });
  }, [pushToast, queryClient]);

  const handleChangeSourceMode = useCallback((mode: DataSourceMode) => {
    setSourceMode(mode);
    setSelectedModel(null);
    setSelectedWorkspace(null);
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setSelectedModel(null);
    setSelectedWorkspace(null);
  }, []);

  const selectedWorkspaceName = useMemo(() => {
    if (!selectedWorkspace || !data) return null;
    return (
      data.workspaceBreakdown.find(
        (workspace) => workspaceSelectionKey(workspace) === selectedWorkspace,
      )?.workspaceName ?? "未绑定工作区"
    );
  }, [data, selectedWorkspace]);

  const activeFilterCount =
    (selectedModel ? 1 : 0) + (selectedWorkspace ? 1 : 0);

  return (
    <div className="relative flex min-h-dvh w-full overflow-x-clip bg-zinc-50 text-zinc-900 dark:bg-obsidian-950 dark:text-slate-100">
      {/* Ambient Aurora Radial Glow & Architectural Grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 nx-bg-grid"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-40 -top-40 h-[460px] w-[460px] rounded-full bg-indigo-500/12 blur-[120px] dark:bg-indigo-500/18"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-48 right-0 h-[500px] w-[500px] rounded-full bg-cyan-400/12 blur-[130px] dark:bg-cyan-400/14"
      />

      <TokenShellSidebar
        sourceMode={sourceMode}
        onChangeSourceMode={handleChangeSourceMode}
        directories={data?.directories ?? []}
        dedupedDuplicatesCount={data?.dedupedDuplicatesCount ?? 0}
        skippedDbCount={data?.skippedDbCount ?? 0}
        scanDurationMs={data?.scanDurationMs ?? null}
        totals={data?.totals ?? null}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <TokenShellTopbar
          sourceMode={sourceMode}
          timeRange={timeRange}
          onChangeTimeRange={setTimeRange}
          onRefresh={handleRefresh}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          isRefreshing={usageQuery.isFetching}
          lastGeneratedAt={data?.generatedAt ?? null}
          activeFilterCount={activeFilterCount}
        />

        <main className="mx-auto w-full max-w-[1600px] flex-1 space-y-5 px-4 py-5 sm:px-6 sm:py-6">
          {usageQuery.isPending && !data ? (
            <AnalyticsSkeleton />
          ) : usageQuery.isError ? (
            <div className="rounded-3xl border border-rose-500/25 bg-rose-500/10 p-6 text-sm text-rose-700 dark:text-rose-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="space-y-2">
                  <h2 className="font-semibold">
                    读取本机 Antigravity Token 数据库失败
                  </h2>
                  <p className="text-xs opacity-90">
                    {usageQuery.error.message}
                  </p>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-500"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    重试扫描
                  </button>
                </div>
              </div>
            </div>
          ) : data ? (
            <>
              {/* Overview KPI Bento */}
              <div id="overview" className="nx-anchor-section">
                <TokenKpiCards totals={data.totals} timeRange={timeRange} />
              </div>

              {/* Active Cross-Filter Banner (only visible when model or workspace filter is active) */}
              {activeFilterCount > 0 ? (
                <div
                  role="status"
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-indigo-500/25 bg-indigo-500/[0.06] px-4 py-2.5 text-xs dark:border-cyan-400/25 dark:bg-cyan-400/[0.06]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 font-medium text-indigo-700 dark:text-cyan-300">
                      <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                      已筛选会话明细
                    </span>
                    {selectedModel ? (
                      <button
                        type="button"
                        onClick={() => setSelectedModel(null)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-indigo-500/25 bg-white/85 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700 transition hover:bg-white dark:border-cyan-400/30 dark:bg-slate-900/80 dark:text-cyan-200"
                      >
                        <span>模型: {selectedModel}</span>
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    ) : null}
                    {selectedWorkspace ? (
                      <button
                        type="button"
                        onClick={() => setSelectedWorkspace(null)}
                        className="inline-flex max-w-[240px] cursor-pointer items-center gap-1 rounded-full border border-indigo-500/25 bg-white/85 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700 transition hover:bg-white dark:border-cyan-400/30 dark:bg-slate-900/80 dark:text-cyan-200"
                      >
                        <span className="truncate">
                          项目: {selectedWorkspaceName}
                        </span>
                        <X className="h-3 w-3 shrink-0" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href="#sessions"
                      className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-medium text-indigo-700 transition hover:bg-indigo-500/10 dark:text-cyan-300 dark:hover:bg-cyan-400/10"
                    >
                      <span>查看明细</span>
                      <ArrowDown className="h-3 w-3" aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      onClick={handleClearAllFilters}
                      className="cursor-pointer rounded-xl px-2 py-1 text-[11px] font-medium text-zinc-600 transition hover:bg-zinc-900/[0.06] hover:text-zinc-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      清除全部
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Primary Analytics Row: Trend Chart + Model Ranking */}
              <div
                id="analytics"
                className="nx-anchor-section grid gap-5 xl:grid-cols-12"
              >
                <div className="min-w-0 xl:col-span-7 2xl:col-span-8">
                  <TokenTrendChart
                    dailyTrend={data.dailyTrend}
                    granularity={data.trendGranularity}
                  />
                </div>
                <div className="min-w-0 xl:col-span-5 2xl:col-span-4">
                  <ModelTokenRankingPanel
                    models={data.modelBreakdown}
                    selectedModel={selectedModel}
                    onSelectModel={setSelectedModel}
                  />
                </div>
              </div>

              {/* Secondary Analytics Row: Yearly Activity Heatmap + Workspace Breakdown */}
              <div
                id="activity"
                className="nx-anchor-section grid gap-5 xl:grid-cols-12"
              >
                <div className="min-w-0 xl:col-span-7 2xl:col-span-8">
                  <ActivityHeatmap days={data.activityCalendar} />
                </div>
                <div className="min-w-0 xl:col-span-5 2xl:col-span-4">
                  <WorkspaceUsageList
                    workspaces={data.workspaceBreakdown}
                    selectedWorkspace={selectedWorkspace}
                    onSelectWorkspace={setSelectedWorkspace}
                  />
                </div>
              </div>

              {/* Drill-down Sessions Table */}
              <div id="sessions" className="nx-anchor-section">
                <SessionsUsageTable
                  sessions={data.sessions}
                  selectedModel={selectedModel}
                  selectedWorkspace={selectedWorkspace}
                  selectedWorkspaceName={selectedWorkspaceName}
                  onClearModel={() => setSelectedModel(null)}
                  onClearWorkspace={() => setSelectedWorkspace(null)}
                  onOpenSession={setActiveSessionId}
                />
              </div>

              {/* Secondary Reference: Pricing Disclosure Footer */}
              <div id="pricing" className="nx-anchor-section">
                <ScriptAuditBanner data={data} />
              </div>
            </>
          ) : null}
        </main>
      </div>

      <SessionDetailDialog
        sessionId={activeSessionId}
        sourceMode={sourceMode}
        onClose={() => setActiveSessionId(null)}
      />
    </div>
  );
}
