"use client";

import {
  Cpu,
  Database,
  DollarSign,
  FolderGit2,
  Loader2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useSessionTokenDetailQuery } from "@/hooks/use-token-usage-query";
import {
  attachDialogLightDismissFallback,
  closeDialogWithMotion,
} from "@/lib/dialog-helpers";
import {
  formatCompactTokens,
  formatDateTime,
  formatFileSize,
  formatShortDateTime,
  formatTokenCount,
  formatUsd,
} from "@/lib/token-format";
import type { DataSourceMode } from "@/types/token-usage";

interface SessionDetailDialogProps {
  readonly sessionId: string | null;
  readonly sourceMode: DataSourceMode;
  readonly onClose: () => void;
}

export function SessionDetailDialog({
  sessionId,
  sourceMode,
  onClose,
}: SessionDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const detailQuery = useSessionTokenDetailQuery(sessionId, sourceMode);

  const requestClose = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || !dialog.open) {
      onClose();
      return;
    }
    void closeDialogWithMotion(dialog).then(() => {
      onClose();
    });
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (sessionId) {
      if (!dialog.open) {
        dialog.showModal();
      }
      const detachFallback = attachDialogLightDismissFallback(
        dialog,
        requestClose
      );
      return () => {
        detachFallback();
      };
    }

    if (dialog.open) {
      void closeDialogWithMotion(dialog);
    }
  }, [requestClose, sessionId]);

  const detail = detailQuery.data;

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="session-detail-title"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      className="nx-dialog w-full max-w-5xl rounded-3xl border border-zinc-900/10 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95"
    >
      <div className="flex max-h-[86dvh] flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-900/[0.07] px-6 py-4 dark:border-white/[0.07]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-indigo-500/12 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-indigo-600 dark:bg-cyan-400/15 dark:text-cyan-300">
                SESSION TELEMETRY
              </span>
              {detail ? (
                <span className="font-mono text-[11px] text-zinc-400 dark:text-slate-500">
                  {detail.session.sourceDir} ·{" "}
                  {formatFileSize(detail.session.fileSizeBytes)}
                </span>
              ) : null}
            </div>
            <h2
              id="session-detail-title"
              className="mt-1 truncate text-base font-semibold tracking-tight text-zinc-900 dark:text-white"
            >
              {detail?.session.workspaceName ??
                detail?.session.repoName ??
                "会话 Token 逐轮次明细"}
            </h2>
            {sessionId ? (
              <p className="mt-0.5 truncate font-mono text-xs text-zinc-500 dark:text-slate-400">
                ID: {sessionId}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={requestClose}
            aria-label="关闭会话明细弹窗"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-zinc-900/10 bg-zinc-50 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/10 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 nx-scrollbar">
          {detailQuery.isPending ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-xs text-zinc-500 dark:text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500 dark:text-cyan-400" />
              <span>正在从本地 SQLite 数据库解码逐轮次 Protobuf 明细...</span>
            </div>
          ) : detailQuery.isError ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300">
              {detailQuery.error.message}
            </div>
          ) : detail ? (
            <>
              {/* Metadata Summary */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-zinc-900/[0.07] bg-zinc-50/70 p-3 dark:border-white/[0.07] dark:bg-slate-950/50">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-slate-400">
                    <DollarSign className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                    <span>会话参考费用</span>
                  </div>
                  <p className="mt-1 font-mono text-sm font-semibold text-amber-600 dark:text-amber-300">
                    {formatUsd(detail.session.cost.totalCostUsd)}
                  </p>
                  <p className="font-mono text-[10px] text-zinc-500 dark:text-slate-400">
                    In {formatUsd(detail.session.cost.inputCostUsd)} · Cache{" "}
                    {formatUsd(detail.session.cost.cacheReadCostUsd)} · Out{" "}
                    {formatUsd(detail.session.cost.outputCostUsd)}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-900/[0.07] bg-zinc-50/70 p-3 dark:border-white/[0.07] dark:bg-slate-950/50">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-slate-400">
                    <Database className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>会话总消耗</span>
                  </div>
                  <p className="mt-1 font-mono text-xs font-semibold text-zinc-900 dark:text-white">
                    {formatTokenCount(detail.session.usage.totalTokens)} tokens
                  </p>
                  <p className="font-mono text-[10px] text-zinc-500 dark:text-slate-400">
                    净消耗 {formatCompactTokens(detail.session.usage.uncachedTotalTokens)} · 缓存命中{" "}
                    {detail.session.cacheHitRate}% (省 {formatUsd(detail.session.cost.cacheSavingsUsd)})
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-900/[0.07] bg-zinc-50/70 p-3 dark:border-white/[0.07] dark:bg-slate-950/50">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-slate-400">
                    <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>主力模型</span>
                  </div>
                  <p className="mt-1 truncate text-xs font-semibold text-zinc-900 dark:text-white">
                    {detail.session.primaryModel}
                  </p>
                  <p className="font-mono text-[10px] text-zinc-500 dark:text-slate-400">
                    共 {detail.turns.length} 轮次 · {detail.modelBreakdown.length} 个模型
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-900/[0.07] bg-zinc-50/70 p-3 dark:border-white/[0.07] dark:bg-slate-950/50">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-slate-400">
                    <FolderGit2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>工作区与时间</span>
                  </div>
                  <p
                    title={detail.session.workspacePath ?? undefined}
                    className="mt-1 truncate font-mono text-[11px] font-medium text-zinc-900 dark:text-white"
                  >
                    {detail.session.workspacePath ?? "未绑定路径"}
                  </p>
                  <p className="font-mono text-[10px] text-zinc-500 dark:text-slate-400">
                    {formatDateTime(detail.session.createdAt)} →{" "}
                    {formatShortDateTime(detail.session.updatedAt)}
                  </p>
                </div>
              </div>

              {/* Per-Model Chips inside this session */}
              {detail.modelBreakdown.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {detail.modelBreakdown.map((m) => (
                    <div
                      key={m.modelName}
                      className="rounded-2xl border border-zinc-900/[0.08] bg-white/80 px-3 py-1.5 font-mono text-[11px] dark:border-white/[0.08] dark:bg-slate-950/60"
                    >
                      <span className="font-semibold text-zinc-900 dark:text-white">
                        {m.modelName}
                      </span>
                      <span className="ml-2 font-semibold text-amber-600 dark:text-amber-300">
                        {formatUsd(m.cost.totalCostUsd)}
                      </span>
                      <span className="ml-2 text-zinc-500 dark:text-slate-400">
                        {m.turns} 轮 · In {formatCompactTokens(m.usage.inputTokens)} · Cache{" "}
                        {formatCompactTokens(m.usage.cacheReadTokens)} · Out{" "}
                        {formatCompactTokens(m.usage.outputTokens)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Turn-by-Turn Table */}
              <div
                tabIndex={0}
                role="region"
                aria-label="逐轮次 Token 与费用明细表"
                className="max-h-[380px] overflow-auto rounded-2xl border border-zinc-900/[0.08] nx-scrollbar dark:border-white/[0.08]"
              >
                <table className="w-full min-w-[840px] border-separate border-spacing-0 text-left">
                  <thead className="sticky top-0 z-10 bg-zinc-50/95 backdrop-blur-md dark:bg-slate-900/95">
                    <tr className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                      <th className="border-b border-zinc-900/[0.08] px-3 py-2 dark:border-white/[0.08]">
                        Turn
                      </th>
                      <th className="border-b border-zinc-900/[0.08] px-3 py-2 dark:border-white/[0.08]">
                        时间
                      </th>
                      <th className="border-b border-zinc-900/[0.08] px-3 py-2 dark:border-white/[0.08]">
                        模型
                      </th>
                      <th className="border-b border-zinc-900/[0.08] px-3 py-2 text-right dark:border-white/[0.08]">
                        Input
                      </th>
                      <th className="border-b border-zinc-900/[0.08] px-3 py-2 text-right dark:border-white/[0.08]">
                        Cache Read
                      </th>
                      <th className="border-b border-zinc-900/[0.08] px-3 py-2 text-right dark:border-white/[0.08]">
                        Thinking
                      </th>
                      <th className="border-b border-zinc-900/[0.08] px-3 py-2 text-right dark:border-white/[0.08]">
                        Response
                      </th>
                      <th className="border-b border-zinc-900/[0.08] px-3 py-2 text-right dark:border-white/[0.08]">
                        单轮总计
                      </th>
                      <th className="border-b border-zinc-900/[0.08] px-3 py-2 text-right dark:border-white/[0.08]">
                        费用 (USD)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/[0.05] font-mono text-xs dark:divide-white/[0.05]">
                    {detail.turns.map((turn) => (
                      <tr
                        key={turn.turnIndex}
                        className="hover:bg-indigo-500/[0.03] dark:hover:bg-cyan-400/[0.04]"
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-zinc-500 dark:text-slate-400">
                          #{turn.turnIndex}
                          {turn.stepIndex !== null ? (
                            <span className="ml-1 text-[10px] opacity-60">
                              (step {turn.stepIndex})
                            </span>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-[11px] text-zinc-500 dark:text-slate-400">
                          {formatShortDateTime(turn.timestamp)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-sans text-xs font-medium text-zinc-800 dark:text-slate-200">
                          {turn.modelName}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-indigo-600 dark:text-indigo-300">
                          {formatTokenCount(turn.usage.inputTokens)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-cyan-700 dark:text-cyan-300">
                          {formatTokenCount(turn.usage.cacheReadTokens)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-violet-600 dark:text-violet-300">
                          {formatTokenCount(turn.usage.thinkingTokens)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-emerald-600 dark:text-emerald-300">
                          {formatTokenCount(turn.usage.responseTokens)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-zinc-900 dark:text-white">
                          {formatTokenCount(turn.usage.totalTokens)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-amber-600 dark:text-amber-300">
                          {formatUsd(turn.cost.totalCostUsd, true)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
