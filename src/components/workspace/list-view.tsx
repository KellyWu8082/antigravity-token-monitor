"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { AiProgressBar } from "@/components/ui/ai-progress-bar";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import { KANBAN_COLUMNS, TEAM_MEMBERS } from "@/data/mock-data";
import {
  cn,
  findMemberById,
  formatRelativeTime,
  PRIORITY_META,
} from "@/lib/utils";
import type { NexusTask, TaskStatus } from "@/types/nexus";

interface ListViewProps {
  readonly tasks: readonly NexusTask[];
  readonly onOpenDetail: (task: NexusTask) => void;
  readonly onQuickMove: (taskId: string, targetStatus: TaskStatus) => void;
}

export function ListView({
  tasks,
  onOpenDetail,
  onQuickMove,
}: ListViewProps) {
  const [collapsed, setCollapsed] = useState<Record<TaskStatus, boolean>>({
    todo: false,
    in_progress: false,
    in_review: false,
    done: false,
  });

  const toggleGroup = (status: TaskStatus) => {
    setCollapsed((prev) => ({ ...prev, [status]: !prev[status] }));
  };

  return (
    <div className="space-y-4">
      {KANBAN_COLUMNS.map((column) => {
        const groupTasks = tasks
          .filter((task) => task.status === column.id)
          .sort((a, b) => a.order - b.order);
        const isCollapsed = collapsed[column.id];

        return (
          <section
            key={column.id}
            aria-label={`${column.title} 列表分组`}
            className="overflow-hidden rounded-3xl border border-zinc-900/[0.07] bg-white/75 shadow-glass-light backdrop-blur-md dark:border-white/5 dark:bg-slate-900/65 dark:shadow-glass-dark"
          >
            {/* Group Header */}
            <button
              type="button"
              onClick={() => toggleGroup(column.id)}
              className="flex w-full items-center justify-between gap-3 border-b border-zinc-900/[0.06] bg-zinc-50/70 px-4 py-3 text-left transition hover:bg-zinc-100/70 dark:border-white/5 dark:bg-slate-950/40 dark:hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-2.5">
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-zinc-400" />
                )}
                <span className={cn("h-2.5 w-2.5 rounded-full", column.dotClass)} />
                <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-slate-100">
                  {column.title}
                </span>
                <span className="text-xs text-zinc-400 dark:text-slate-500">
                  {column.subtitle}
                </span>
              </div>

              <span className="rounded-full bg-zinc-900/[0.06] px-2.5 py-0.5 font-mono text-xs font-semibold text-zinc-600 dark:bg-white/10 dark:text-slate-300">
                {groupTasks.length}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {!isCollapsed ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  {groupTasks.length === 0 ? (
                    <div className="px-5 py-6 text-center text-xs text-zinc-400 dark:text-slate-500">
                      当前分组暂无匹配任务
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-900/[0.05] dark:divide-white/[0.05]">
                      {groupTasks.map((task) => {
                        const member = findMemberById(
                          TEAM_MEMBERS,
                          task.assigneeId
                        );
                        const priorityMeta = PRIORITY_META[task.priority];

                        return (
                          <motion.div
                            key={task.id}
                            layout="position"
                            className="group grid grid-cols-1 items-center gap-3 px-4 py-3 transition-colors hover:bg-indigo-500/[0.04] dark:hover:bg-white/[0.02] md:grid-cols-12"
                          >
                            {/* Code + Title */}
                            <div className="flex min-w-0 items-center gap-3 md:col-span-5">
                              <span className="shrink-0 font-mono text-xs font-semibold text-zinc-400 dark:text-slate-500">
                                {task.code}
                              </span>
                              <button
                                type="button"
                                onClick={() => onOpenDetail(task)}
                                className="min-w-0 truncate text-left text-sm font-medium tracking-tight text-zinc-900 transition-colors group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-cyan-300"
                              >
                                {task.title}
                              </button>
                            </div>

                            {/* Priority */}
                            <div className="flex items-center gap-2 md:col-span-2">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                  priorityMeta.badgeClass
                                )}
                              >
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full",
                                    priorityMeta.dotClass
                                  )}
                                />
                                {priorityMeta.shortLabel}
                              </span>
                            </div>

                            {/* AI Progress */}
                            <div className="flex items-center gap-2.5 md:col-span-2">
                              <div className="w-24">
                                <AiProgressBar value={task.aiProgress} compact />
                              </div>
                              <span className="inline-flex items-center gap-0.5 font-mono text-xs font-semibold text-indigo-600 dark:text-cyan-300">
                                <Sparkles className="h-3 w-3" aria-hidden="true" />
                                {task.aiProgress}%
                              </span>
                            </div>

                            {/* Status Inline Switch */}
                            <div className="md:col-span-2">
                              <label className="sr-only" htmlFor={`status-${task.id}`}>
                                修改 {task.code} 状态
                              </label>
                              <select
                                id={`status-${task.id}`}
                                value={task.status}
                                onChange={(e) =>
                                  onQuickMove(
                                    task.id,
                                    e.target.value as TaskStatus
                                  )
                                }
                                className="w-full rounded-xl border border-zinc-900/10 bg-white/90 px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:border-indigo-500/40 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200"
                              >
                                {KANBAN_COLUMNS.map((col) => (
                                  <option key={col.id} value={col.id}>
                                    {col.title}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Assignee & Time */}
                            <div className="flex items-center justify-between gap-2 md:col-span-1 md:justify-end">
                              <AvatarBadge member={member} size="sm" />
                              <span className="text-[11px] text-zinc-400 dark:text-slate-500 md:hidden">
                                {formatRelativeTime(task.updatedAt)}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>
        );
      })}
    </div>
  );
}

