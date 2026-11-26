"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  CheckSquare,
  ChevronDown,
  Flame,
  GripVertical,
  Minus,
  Sparkles,
} from "lucide-react";
import {
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { AiProgressBar } from "@/components/ui/ai-progress-bar";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import { KANBAN_COLUMNS, TEAM_MEMBERS } from "@/data/mock-data";
import {
  cn,
  findMemberById,
  formatRelativeTime,
  PRIORITY_META,
} from "@/lib/utils";
import type { NexusTask, TaskPriority, TaskStatus } from "@/types/nexus";

interface TaskCardProps {
  readonly task: NexusTask;
  readonly isDraggingSource?: boolean;
  readonly isOverlay?: boolean;
  readonly onPointerDragStart?: (
    task: NexusTask,
    event: ReactPointerEvent<HTMLElement>,
    cardElement: HTMLElement
  ) => void;
  readonly onOpenDetail?: (task: NexusTask) => void;
  readonly onQuickMove?: (taskId: string, targetStatus: TaskStatus) => void;
  readonly registerCardRef?: (
    taskId: string,
    node: HTMLDivElement | null
  ) => void;
}

function PriorityIcon({ priority }: { readonly priority: TaskPriority }) {
  if (priority === "urgent") {
    return <Flame className="h-3 w-3 shrink-0" aria-hidden="true" />;
  }
  if (priority === "high") {
    return <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />;
  }
  if (priority === "medium") {
    return <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />;
  }
  return <Minus className="h-3 w-3 shrink-0" aria-hidden="true" />;
}

export function TaskCard({
  task,
  isDraggingSource = false,
  isOverlay = false,
  onPointerDragStart,
  onOpenDetail,
  onQuickMove,
  registerCardRef,
}: TaskCardProps) {
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const member = findMemberById(TEAM_MEMBERS, task.assigneeId);
  const priorityMeta = PRIORITY_META[task.priority];
  const completedSubtasks = task.subtasks.filter((st) => st.completed).length;
  const currentColMeta = KANBAN_COLUMNS.find((col) => col.id === task.status);

  const handleCardPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isOverlay || !onPointerDragStart) return;
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("select, option, input, a, [data-no-drag='true']")) {
      return;
    }
    pointerDownPosRef.current = { x: event.clientX, y: event.clientY };
    onPointerDragStart(task, event, event.currentTarget);
  };

  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isOverlay || !onOpenDetail) return;
    const target = event.target as HTMLElement;
    if (
      target.closest(
        "button, select, option, input, a, [data-no-drag='true']"
      )
    ) {
      return;
    }
    const downPos = pointerDownPosRef.current;
    pointerDownPosRef.current = null;
    if (downPos) {
      const moved = Math.hypot(
        event.clientX - downPos.x,
        event.clientY - downPos.y
      );
      if (moved >= 6) return;
    }
    onOpenDetail(task);
  };

  return (
    <motion.div
      ref={
        registerCardRef ? (node) => registerCardRef(task.id, node) : undefined
      }
      layout={!isOverlay}
      layoutId={isOverlay ? undefined : `task-card-${task.id}`}
      animate={{
        opacity: isDraggingSource ? 0.28 : 1,
        scale: isDraggingSource ? 0.98 : 1,
      }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      data-task-id={task.id}
      onPointerDown={handleCardPointerDown}
      onClick={handleCardClick}
      className={cn(
        "group relative select-none rounded-2xl border p-3.5 transition-colors duration-200",
        "bg-white/85 dark:bg-slate-900/80 backdrop-blur-md",
        "border-zinc-900/[0.08] dark:border-white/[0.06]",
        !isOverlay &&
          "cursor-grab active:cursor-grabbing hover:border-indigo-500/35 hover:shadow-glass-light dark:hover:border-cyan-400/30 dark:hover:shadow-glass-dark",
        isOverlay &&
          "cursor-grabbing border-indigo-500/50 bg-white/95 shadow-card-drag dark:border-cyan-400/50 dark:bg-slate-900/95",
        isDraggingSource &&
          "border-dashed border-indigo-400/50 dark:border-cyan-400/40"
      )}
    >
      {/* Subtle Top Inner Highlight */}
      <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/15" />

      {/* Top Row: Code + Drag Handle + Priority Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            data-drag-handle="true"
            className="inline-flex h-5 w-5 items-center justify-center rounded-md text-zinc-400 transition group-hover:text-indigo-500 dark:text-slate-500 dark:group-hover:text-cyan-300"
            style={{ touchAction: "none" }}
            aria-hidden="true"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </span>
          <span className="font-mono text-[11px] font-semibold tracking-tight text-zinc-500 dark:text-slate-400">
            {task.code}
          </span>
        </div>

        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-tight",
            priorityMeta.badgeClass
          )}
        >
          <PriorityIcon priority={task.priority} />
          <span>{priorityMeta.shortLabel}</span>
        </span>
      </div>

      {/* Title & Description (Keyboard-accessible detail trigger; pointer-draggable via card) */}
      <div className="mt-2.5">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            const downPos = pointerDownPosRef.current;
            pointerDownPosRef.current = null;
            if (downPos) {
              const moved = Math.hypot(
                event.clientX - downPos.x,
                event.clientY - downPos.y
              );
              if (moved >= 6) return;
            }
            onOpenDetail?.(task);
          }}
          className="block w-full text-left focus-visible:rounded-lg"
        >
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-zinc-900 transition-colors group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-cyan-300">
            {task.title}
          </h3>
        </button>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-slate-400">
          {task.description}
        </p>
      </div>

      {/* Tags Row */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {task.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-lg border border-zinc-900/[0.06] bg-zinc-100/80 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:border-white/[0.06] dark:bg-white/[0.04] dark:text-slate-300"
          >
            {tag}
          </span>
        ))}
        <span className="ml-auto rounded-md bg-zinc-900/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 dark:bg-white/[0.05] dark:text-slate-400">
          {task.storyPoints}pt
        </span>
      </div>

      {/* AI Generated Progress Bar */}
      <div className="mt-3.5 rounded-xl border border-zinc-900/[0.05] bg-zinc-50/80 p-2.5 dark:border-white/[0.04] dark:bg-slate-950/50">
        <AiProgressBar
          value={task.aiProgress}
          syncing={task.aiSyncing}
          label={task.aiEstimateLabel}
        />
      </div>

      {/* Footer: Assignee + Subtasks + Inline Non-Clipped Status Switcher */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-2">
          <AvatarBadge member={member} size="sm" showName />
          {task.subtasks.length > 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-slate-400">
              <CheckSquare className="h-3 w-3" aria-hidden="true" />
              <span className="font-mono tabular-nums">
                {completedSubtasks}/{task.subtasks.length}
              </span>
            </span>
          ) : null}
          <span className="hidden text-[10px] text-zinc-400 dark:text-slate-500 2xl:inline">
            {formatRelativeTime(task.updatedAt)}
          </span>
        </div>

        {!isOverlay && onQuickMove ? (
          <div className="flex items-center gap-1.5" data-no-drag="true">
            {/* Inline Native Status Select Pill (never clipped by overflow-y-auto) */}
            <div className="relative inline-flex items-center">
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute left-2 h-1.5 w-1.5 rounded-full",
                  currentColMeta?.dotClass ?? "bg-slate-400"
                )}
              />
              <select
                data-no-drag="true"
                aria-label={`切换任务 ${task.code} 状态`}
                value={task.status}
                onChange={(event) =>
                  onQuickMove(task.id, event.target.value as TaskStatus)
                }
                className="appearance-none rounded-xl border border-zinc-900/10 bg-zinc-50/90 py-1 pl-5 pr-5 text-[11px] font-medium text-zinc-700 transition hover:border-indigo-500/40 hover:bg-white focus:border-indigo-500/60 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-cyan-400/40 dark:hover:bg-slate-800"
              >
                {KANBAN_COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-1.5 h-3 w-3 text-zinc-400 dark:text-slate-400"
              />
            </div>

            {task.status !== "done" ? (
              <button
                type="button"
                data-no-drag="true"
                title="一键流转至已完成"
                aria-label={`将 ${task.code} 标记为已完成`}
                onClick={() => onQuickMove(task.id, "done")}
                className="inline-flex h-6 w-6 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 transition hover:-translate-y-0.5 hover:bg-emerald-500/20 dark:border-emerald-400/25 dark:text-emerald-300"
              >
                <Check className="h-3 w-3" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
