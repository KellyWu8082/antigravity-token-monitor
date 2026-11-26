"use client";

import {
  CheckSquare,
  Sparkles,
  Square,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { AiProgressBar } from "@/components/ui/ai-progress-bar";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import { KANBAN_COLUMNS, TEAM_MEMBERS } from "@/data/mock-data";
import {
  attachDialogLightDismissFallback,
  closeDialogWithMotion,
} from "@/lib/dialog-helpers";
import {
  cn,
  findMemberById,
  formatRelativeTime,
  PRIORITY_META,
} from "@/lib/utils";
import type {
  NexusTask,
  TaskPriority,
  TaskStatus,
  UpdateTaskPayload,
} from "@/types/nexus";

interface TaskDetailModalProps {
  readonly task: NexusTask | null;
  readonly onClose: () => void;
  readonly onUpdate: (payload: UpdateTaskPayload) => void;
  readonly onDelete: (taskId: string) => void;
}

export function TaskDetailModal({
  task,
  onClose,
  onUpdate,
  onDelete,
}: TaskDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const isOpen = task !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      void closeDialogWithMotion(dialog);
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };

    const handleClose = () => {
      dialog.returnValue = "";
      onClose();
    };

    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("close", handleClose);
    const detachFallback = attachDialogLightDismissFallback(dialog, onClose);

    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleClose);
      detachFallback();
    };
  }, [onClose]);

  const member = task ? findMemberById(TEAM_MEMBERS, task.assigneeId) : null;
  const priorityMeta = task ? PRIORITY_META[task.priority] : null;

  const handleToggleSubtask = (subtaskId: string) => {
    if (!task) return;
    const nextSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    const doneCount = nextSubtasks.filter((st) => st.completed).length;
    const derivedProgress =
      nextSubtasks.length > 0
        ? Math.round((doneCount / nextSubtasks.length) * 100)
        : task.aiProgress;

    onUpdate({
      taskId: task.id,
      patch: {
        subtasks: nextSubtasks,
        aiProgress: Math.max(task.aiProgress === 100 ? 100 : 10, derivedProgress),
      },
    });
  };

  const handleAiBoost = () => {
    if (!task) return;
    const nextProgress = Math.min(100, task.aiProgress + 15);
    onUpdate({
      taskId: task.id,
      patch: {
        aiProgress: nextProgress,
        aiEstimateLabel:
          nextProgress >= 100
            ? "AI 自动验证 · 已达交付标准"
            : "AI 已重估 · 路径已收敛提速",
      },
    });
  };

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby={titleId}
      className="nx-dialog w-full max-w-2xl"
    >
      {task && member && priorityMeta ? (
        <div
          className={cn(
            "relative overflow-hidden rounded-3xl border p-6 shadow-2xl",
            "bg-white bg-opacity-90 backdrop-blur-xl dark:bg-slate-900 dark:bg-opacity-90",
            "border-zinc-900/10 dark:border-white/10"
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg border border-zinc-900/10 bg-zinc-100 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-600 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300">
                  {task.code}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                    priorityMeta.badgeClass
                  )}
                >
                  <span
                    className={cn("h-1.5 w-1.5 rounded-full", priorityMeta.dotClass)}
                  />
                  {priorityMeta.label}
                </span>
                <span className="text-xs text-zinc-400 dark:text-slate-500">
                  更新于 {formatRelativeTime(task.updatedAt)}
                </span>
              </div>

              <h2
                id={titleId}
                className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-xl"
              >
                {task.title}
              </h2>
            </div>

            <button
              type="button"
              aria-label="关闭任务详情"
              onClick={onClose}
              className="rounded-xl border border-zinc-900/10 bg-white/80 p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Description */}
          <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-slate-300">
            {task.description}
          </p>

          {/* Selectors Grid */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-900/[0.07] bg-zinc-50/80 p-3 dark:border-white/[0.06] dark:bg-slate-950/50">
              <label
                htmlFor="detail-status-select"
                className="block text-[11px] font-medium text-zinc-500 dark:text-slate-400"
              >
                流转状态
              </label>
              <select
                id="detail-status-select"
                value={task.status}
                onChange={(e) =>
                  onUpdate({
                    taskId: task.id,
                    patch: { status: e.target.value as TaskStatus },
                  })
                }
                className="mt-1.5 w-full rounded-xl border border-zinc-900/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
              >
                {KANBAN_COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-zinc-900/[0.07] bg-zinc-50/80 p-3 dark:border-white/[0.06] dark:bg-slate-950/50">
              <label
                htmlFor="detail-priority-select"
                className="block text-[11px] font-medium text-zinc-500 dark:text-slate-400"
              >
                紧急程度
              </label>
              <select
                id="detail-priority-select"
                value={task.priority}
                onChange={(e) =>
                  onUpdate({
                    taskId: task.id,
                    patch: { priority: e.target.value as TaskPriority },
                  })
                }
                className="mt-1.5 w-full rounded-xl border border-zinc-900/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="urgent">紧急 (Urgent)</option>
                <option value="high">高 (High)</option>
                <option value="medium">中 (Medium)</option>
                <option value="low">低 (Low)</option>
              </select>
            </div>

            <div className="rounded-2xl border border-zinc-900/[0.07] bg-zinc-50/80 p-3 dark:border-white/[0.06] dark:bg-slate-950/50">
              <label
                htmlFor="detail-assignee-select"
                className="block text-[11px] font-medium text-zinc-500 dark:text-slate-400"
              >
                当前执行人
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <AvatarBadge member={member} size="sm" />
                <select
                  id="detail-assignee-select"
                  value={task.assigneeId}
                  onChange={(e) =>
                    onUpdate({
                      taskId: task.id,
                      patch: { assigneeId: e.target.value },
                    })
                  }
                  className="w-full rounded-xl border border-zinc-900/10 bg-white px-2 py-1.5 text-xs font-semibold text-zinc-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                >
                  {TEAM_MEMBERS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* AI Progress Calibration */}
          <div className="mt-4 rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.07] via-transparent to-cyan-400/[0.07] p-4 dark:border-cyan-400/20">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-slate-100">
                <Sparkles
                  className="h-3.5 w-3.5 text-indigo-500 dark:text-cyan-400"
                  aria-hidden="true"
                />
                AI 智能进度遥测 · 置信度 {task.aiConfidence}%
              </span>
              <button
                type="button"
                onClick={handleAiBoost}
                className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-glow-indigo"
              >
                <Wand2 className="h-3 w-3" aria-hidden="true" />
                AI 校准推进 +15%
              </button>
            </div>
            <AiProgressBar
              value={task.aiProgress}
              label={task.aiEstimateLabel}
            />
          </div>

          {/* Subtasks */}
          <div className="mt-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
              AI 拆解子任务 ({task.subtasks.filter((s) => s.completed).length}/
              {task.subtasks.length})
            </h3>
            {task.subtasks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-900/10 px-3 py-2 text-xs text-zinc-400 dark:border-white/10">
                暂无子任务，可通过 AI 校准推进进度。
              </p>
            ) : (
              <ul className="space-y-1.5">
                {task.subtasks.map((st) => (
                  <li key={st.id}>
                    <button
                      type="button"
                      onClick={() => handleToggleSubtask(st.id)}
                      className="flex w-full items-center gap-2.5 rounded-xl border border-zinc-900/[0.06] bg-zinc-50/60 px-3 py-2 text-left text-xs transition hover:border-indigo-500/30 hover:bg-white dark:border-white/[0.05] dark:bg-slate-950/40 dark:hover:bg-slate-800/70"
                    >
                      {st.completed ? (
                        <CheckSquare
                          className="h-4 w-4 shrink-0 text-emerald-500"
                          aria-hidden="true"
                        />
                      ) : (
                        <Square
                          className="h-4 w-4 shrink-0 text-zinc-400 dark:text-slate-500"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={cn(
                          st.completed
                            ? "text-zinc-400 line-through dark:text-slate-500"
                            : "font-medium text-zinc-700 dark:text-slate-200"
                        )}
                      >
                        {st.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex items-center justify-between border-t border-zinc-900/10 pt-4 dark:border-white/10">
            <button
              type="button"
              onClick={() => {
                onDelete(task.id);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-500/10 dark:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              删除任务
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-900/10 bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white dark:text-slate-950"
            >
              完成并关闭
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

