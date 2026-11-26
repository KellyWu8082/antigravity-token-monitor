"use client";

import { LayoutGroup, motion } from "framer-motion";
import { Plus } from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { TaskCard } from "@/components/workspace/task-card";
import { KANBAN_COLUMNS } from "@/data/mock-data";
import { cn } from "@/lib/utils";
import type { NexusTask, TaskStatus } from "@/types/nexus";

export interface DropTargetState {
  readonly status: TaskStatus;
  readonly index: number;
}

interface KanbanViewProps {
  readonly tasks: readonly NexusTask[];
  readonly activeDragTaskId: string | null;
  readonly dropTarget: DropTargetState | null;
  readonly onPointerDragStart: (
    task: NexusTask,
    event: ReactPointerEvent<HTMLElement>,
    cardElement: HTMLElement
  ) => void;
  readonly onOpenDetail: (task: NexusTask) => void;
  readonly onQuickMove: (taskId: string, targetStatus: TaskStatus) => void;
  readonly onCreateInColumn: (status: TaskStatus) => void;
  readonly registerColumnRef: (
    status: TaskStatus,
    node: HTMLDivElement | null
  ) => void;
  readonly registerCardRef: (
    taskId: string,
    node: HTMLDivElement | null
  ) => void;
}

function DropInsertionLine() {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scaleX: 0.7 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 32 }}
      className="relative my-1 h-1 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 shadow-glow-cyan"
    >
      <span className="absolute -left-1 -top-0.5 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900" />
      <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-cyan-400 ring-2 ring-white dark:ring-slate-900" />
    </motion.div>
  );
}

export function KanbanView({
  tasks,
  activeDragTaskId,
  dropTarget,
  onPointerDragStart,
  onOpenDetail,
  onQuickMove,
  onCreateInColumn,
  registerColumnRef,
  registerCardRef,
}: KanbanViewProps) {
  return (
    <LayoutGroup id="nexus-kanban-board">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {KANBAN_COLUMNS.map((column) => {
          const columnTasks = tasks
            .filter((task) => task.status === column.id)
            .sort((a, b) => a.order - b.order);
          const isHoveredTarget = dropTarget?.status === column.id;
          const totalPoints = columnTasks.reduce(
            (sum, t) => sum + t.storyPoints,
            0
          );

          return (
            <section
              key={column.id}
              ref={(node) => {
                if (node instanceof HTMLDivElement) {
                  registerColumnRef(column.id, node);
                } else {
                  registerColumnRef(column.id, null);
                }
              }}
              data-column-id={column.id}
              aria-label={`${column.title} 任务列`}
              className={cn(
                "relative flex min-h-[420px] flex-col rounded-3xl border p-3.5 transition-all duration-200",
                "bg-zinc-100/70 backdrop-blur-md dark:bg-slate-900/55",
                isHoveredTarget
                  ? "border-indigo-500/50 bg-indigo-500/[0.06] shadow-glow-indigo dark:border-cyan-400/50 dark:bg-cyan-500/[0.06]"
                  : "border-zinc-900/[0.07] dark:border-white/5"
              )}
            >
              {/* Subtle column header gradient wash */}
              <div
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-0 h-20 rounded-t-3xl bg-gradient-to-b opacity-60",
                  column.accentClass
                )}
              />

              {/* Column Header */}
              <header className="relative mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn("h-2.5 w-2.5 rounded-full", column.dotClass)}
                  />
                  <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-slate-100">
                    {column.title}
                  </h2>
                  <span className="text-[11px] font-medium text-zinc-400 dark:text-slate-500">
                    {column.subtitle}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-white/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-600 shadow-sm dark:bg-slate-800/80 dark:text-slate-300">
                    {columnTasks.length}
                  </span>
                  <span className="hidden rounded-full bg-zinc-900/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 dark:bg-white/[0.05] dark:text-slate-400 sm:inline">
                    {totalPoints}pt
                  </span>
                  <button
                    type="button"
                    aria-label={`在${column.title}中新建任务`}
                    onClick={() => onCreateInColumn(column.id)}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-cyan-300"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </header>

              {/* Cards Stack */}
              <div className="relative flex flex-1 flex-col gap-2.5 overflow-y-auto px-0.5 pb-2 pt-0.5 nx-scrollbar">
                {columnTasks.map((task, idx) => {
                  const showLineBefore =
                    isHoveredTarget && dropTarget?.index === idx;
                  return (
                    <div key={task.id} className="space-y-2">
                      {showLineBefore ? <DropInsertionLine /> : null}
                      <TaskCard
                        task={task}
                        isDraggingSource={activeDragTaskId === task.id}
                        onPointerDragStart={onPointerDragStart}
                        onOpenDetail={onOpenDetail}
                        onQuickMove={onQuickMove}
                        registerCardRef={registerCardRef}
                      />
                    </div>
                  );
                })}

                {isHoveredTarget &&
                dropTarget &&
                dropTarget.index >= columnTasks.length ? (
                  <DropInsertionLine />
                ) : null}

                {columnTasks.length === 0 && !isHoveredTarget ? (
                  <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-900/10 p-6 text-center dark:border-white/10">
                    <p className="text-xs font-medium text-zinc-500 dark:text-slate-400">
                      暂无任务
                    </p>
                    <button
                      type="button"
                      onClick={() => onCreateInColumn(column.id)}
                      className="mt-2 text-xs font-medium text-indigo-600 hover:underline dark:text-cyan-300"
                    >
                      + 添加任务到此列
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
