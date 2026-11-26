"use client";

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";
import { Filter, Search, Sparkles, Wand2, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useToast } from "@/components/providers/app-providers";
import { KanbanSkeleton, ListSkeleton } from "@/components/ui/skeleton-loader";
import { KanbanView, type DropTargetState } from "@/components/workspace/kanban-view";
import { ListView } from "@/components/workspace/list-view";
import { TaskCard } from "@/components/workspace/task-card";
import { KANBAN_COLUMNS, TEAM_MEMBERS } from "@/data/mock-data";
import {
  useAiOptimizeBoardMutation,
  useMoveTaskMutation,
} from "@/hooks/use-tasks-query";
import { cn, STATUS_LABELS } from "@/lib/utils";
import type {
  NexusTask,
  TaskFilterState,
  TaskPriority,
  TaskStatus,
  ViewMode,
} from "@/types/nexus";

interface WorkspaceBoardProps {
  readonly tasks: readonly NexusTask[];
  readonly isLoading: boolean;
  readonly viewMode: ViewMode;
  readonly filters: TaskFilterState;
  readonly onChangeFilters: (next: TaskFilterState) => void;
  readonly onOpenTaskDetail: (task: NexusTask) => void;
  readonly onOpenCreateInColumn: (status: TaskStatus) => void;
}

interface ActiveDragSession {
  readonly task: NexusTask;
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly width: number;
  readonly hasMoved: boolean;
}

export function WorkspaceBoard({
  tasks,
  isLoading,
  viewMode,
  filters,
  onChangeFilters,
  onOpenTaskDetail,
  onOpenCreateInColumn,
}: WorkspaceBoardProps) {
  const { pushToast } = useToast();
  const prefersReducedMotion = useReducedMotion();

  const moveTaskMutation = useMoveTaskMutation((errMessage) => {
    pushToast({
      title: "状态同步回滚",
      description: errMessage,
      variant: "error",
    });
  });

  const aiOptimizeMutation = useAiOptimizeBoardMutation();

  const columnRefs = useRef<Map<TaskStatus, HTMLDivElement>>(new Map());
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragSessionRef = useRef<ActiveDragSession | null>(null);

  const [draggingTask, setDraggingTask] = useState<NexusTask | null>(null);
  const [draggingWidth, setDraggingWidth] = useState<number>(300);
  const [dropTarget, setDropTarget] = useState<DropTargetState | null>(null);
  const dropTargetRef = useRef<DropTargetState | null>(null);

  // Framer Motion real-time pointer tracking + velocity-based physical tilt
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const velocityX = useVelocity(dragX);
  const rawTilt = useTransform(velocityX, [-1400, 0, 1400], [-4.5, 0, 4.5]);
  const smoothTilt = useSpring(rawTilt, { stiffness: 320, damping: 24 });

  const registerColumnRef = useCallback(
    (status: TaskStatus, node: HTMLDivElement | null) => {
      if (node) {
        columnRefs.current.set(status, node);
      } else {
        columnRefs.current.delete(status);
      }
    },
    []
  );

  const registerCardRef = useCallback(
    (taskId: string, node: HTMLDivElement | null) => {
      if (node) {
        cardRefs.current.set(taskId, node);
      } else {
        cardRefs.current.delete(taskId);
      }
    },
    []
  );

  const filteredTasks = useMemo(() => {
    const keyword = filters.search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (filters.priority !== "all" && task.priority !== filters.priority) {
        return false;
      }
      if (
        filters.assigneeId !== "all" &&
        task.assigneeId !== filters.assigneeId
      ) {
        return false;
      }
      if (!keyword) return true;
      return (
        task.code.toLowerCase().includes(keyword) ||
        task.title.toLowerCase().includes(keyword) ||
        task.description.toLowerCase().includes(keyword) ||
        task.tags.some((tag) => tag.toLowerCase().includes(keyword))
      );
    });
  }, [filters, tasks]);

  const computeDropTarget = useCallback(
    (clientX: number, clientY: number, draggedId: string): DropTargetState | null => {
      let matchedStatus: TaskStatus | null = null;
      for (const column of KANBAN_COLUMNS) {
        const colEl = columnRefs.current.get(column.id);
        if (!colEl) continue;
        const rect = colEl.getBoundingClientRect();
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          matchedStatus = column.id;
          break;
        }
      }

      if (!matchedStatus) return null;

      const siblings = filteredTasks
        .filter((t) => t.status === matchedStatus && t.id !== draggedId)
        .sort((a, b) => a.order - b.order);

      let insertIndex = siblings.length;
      for (let i = 0; i < siblings.length; i += 1) {
        const sibling = siblings[i];
        if (!sibling) continue;
        const cardEl = cardRefs.current.get(sibling.id);
        if (!cardEl) continue;
        const rect = cardEl.getBoundingClientRect();
        const midpointY = rect.top + rect.height / 2;
        if (clientY < midpointY) {
          insertIndex = i;
          break;
        }
      }

      return { status: matchedStatus, index: insertIndex };
    },
    [filteredTasks]
  );

  const cleanupDrag = useCallback(() => {
    dragSessionRef.current = null;
    dropTargetRef.current = null;
    setDraggingTask(null);
    setDropTarget(null);
    document.body.style.cursor = "";
  }, []);

  const computeDropTargetRef = useRef(computeDropTarget);
  computeDropTargetRef.current = computeDropTarget;
  const moveTaskMutateRef = useRef(moveTaskMutation.mutate);
  moveTaskMutateRef.current = moveTaskMutation.mutate;

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const session = dragSessionRef.current;
      if (!session || event.pointerId !== session.pointerId) return;

      const distance = Math.hypot(
        event.clientX - session.startX,
        event.clientY - session.startY
      );

      if (!session.hasMoved) {
        if (distance < 6) return;
        dragSessionRef.current = { ...session, hasMoved: true };
        setDraggingTask(session.task);
        setDraggingWidth(session.width);
        document.body.style.cursor = "grabbing";
      }

      dragX.set(event.clientX - session.offsetX);
      dragY.set(event.clientY - session.offsetY);

      const nextTarget = computeDropTargetRef.current(
        event.clientX,
        event.clientY,
        session.task.id
      );
      dropTargetRef.current = nextTarget;
      setDropTarget(nextTarget);
    };

    const handlePointerUp = (event: PointerEvent) => {
      const session = dragSessionRef.current;
      if (!session || event.pointerId !== session.pointerId) return;

      const finalTarget = dropTargetRef.current;
      const moved = session.hasMoved;
      const draggedTask = session.task;
      cleanupDrag();

      if (moved && finalTarget) {
        moveTaskMutateRef.current({
          taskId: draggedTask.id,
          targetStatus: finalTarget.status,
          targetIndex: finalTarget.index,
        });

        if (draggedTask.status !== finalTarget.status) {
          pushToast({
            title: `${draggedTask.code} 已移至「${STATUS_LABELS[finalTarget.status]}」`,
            description: "TanStack Query 乐观更新已即时生效",
            variant: "success",
          });
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dragSessionRef.current?.hasMoved) {
        cleanupDrag();
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.cursor = "";
    };
  }, [cleanupDrag, dragX, dragY, pushToast]);

  const handlePointerDragStart = useCallback(
    (
      task: NexusTask,
      event: ReactPointerEvent<HTMLElement>,
      cardElement: HTMLElement
    ) => {
      const rect = cardElement.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;

      dragX.set(rect.left);
      dragY.set(rect.top);

      dragSessionRef.current = {
        task,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        offsetX,
        offsetY,
        width: rect.width,
        hasMoved: false,
      };
    },
    [dragX, dragY]
  );

  const handleQuickMove = useCallback(
    (taskId: string, targetStatus: TaskStatus) => {
      const moving = tasks.find((t) => t.id === taskId);
      if (!moving || moving.status === targetStatus) return;
      const targetCount = tasks.filter((t) => t.status === targetStatus).length;
      moveTaskMutation.mutate({
        taskId,
        targetStatus,
        targetIndex: targetCount,
      });
      pushToast({
        title: `${moving.code} 已流转至「${STATUS_LABELS[targetStatus]}」`,
        description: "已同步更新 AI 进度估算与团队时间轴",
        variant: "success",
      });
    },
    [moveTaskMutation, pushToast, tasks]
  );

  const handleAiRebalance = () => {
    aiOptimizeMutation.mutate(undefined, {
      onSuccess: () => {
        pushToast({
          title: "AI 队列重排完成",
          description: "已按照紧急权重与阻塞风险将核心任务置顶",
          variant: "info",
        });
      },
    });
  };

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.priority !== "all" ||
    filters.assigneeId !== "all";

  return (
    <div className="space-y-5">
      {/* Filter & AI Toolbar */}
      <div
        className={cn(
          "flex flex-col gap-3 rounded-3xl border p-3.5 lg:flex-row lg:items-center lg:justify-between",
          "bg-white bg-opacity-70 backdrop-blur-md dark:bg-slate-900 dark:bg-opacity-70",
          "border-zinc-900/[0.07] shadow-glass-light dark:border-white/5 dark:shadow-glass-dark"
        )}
      >
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-slate-500"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="筛选任务标题、编号或标签"
              value={filters.search}
              onChange={(e) =>
                onChangeFilters({ ...filters, search: e.target.value })
              }
              placeholder="搜索任务、NX 编号或标签..."
              className="w-full rounded-2xl border border-zinc-900/10 bg-zinc-50/80 py-2 pl-8 pr-3 text-xs text-zinc-800 placeholder:text-zinc-400 transition focus:border-indigo-500/50 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Priority Filter Pills */}
          <div
            role="group"
            aria-label="按紧急程度筛选"
            className="flex flex-wrap items-center gap-1 rounded-2xl border border-zinc-900/[0.07] bg-zinc-100/70 p-1 dark:border-white/[0.06] dark:bg-slate-950/50"
          >
            {(
              [
                { id: "all", label: "全部" },
                { id: "urgent", label: "紧急" },
                { id: "high", label: "高" },
                { id: "medium", label: "中" },
                { id: "low", label: "低" },
              ] as const
            ).map((item) => {
              const active = filters.priority === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    onChangeFilters({
                      ...filters,
                      priority: item.id as TaskPriority | "all",
                    })
                  }
                  className={cn(
                    "rounded-xl px-2.5 py-1 text-[11px] font-medium transition",
                    active
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-slate-800 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-slate-400 dark:hover:text-slate-200"
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Assignee Filter */}
          <div className="flex items-center gap-1.5">
            <Filter
              className="h-3.5 w-3.5 text-zinc-400 dark:text-slate-500"
              aria-hidden="true"
            />
            <select
              aria-label="按执行人筛选"
              value={filters.assigneeId}
              onChange={(e) =>
                onChangeFilters({ ...filters, assigneeId: e.target.value })
              }
              className="rounded-xl border border-zinc-900/10 bg-zinc-50/90 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-200"
            >
              <option value="all">全部执行人</option>
              {TEAM_MEMBERS.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() =>
                onChangeFilters({ search: "", priority: "all", assigneeId: "all" })
              }
              className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-900/5 hover:text-zinc-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              重置
            </button>
          ) : null}
        </div>

        {/* Right: AI Rebalance Button */}
        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <span className="text-xs text-zinc-500 dark:text-slate-400">
            显示{" "}
            <strong className="font-mono text-zinc-800 dark:text-slate-200">
              {filteredTasks.length}
            </strong>{" "}
            / {tasks.length} 项任务
          </span>

          <button
            type="button"
            disabled={aiOptimizeMutation.isPending}
            onClick={handleAiRebalance}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-semibold tracking-tight transition-all duration-200",
              "border-indigo-500/25 bg-gradient-to-r from-indigo-500/12 via-violet-500/10 to-cyan-400/12 text-indigo-700",
              "hover:-translate-y-0.5 hover:border-indigo-500/45 hover:shadow-glow-indigo",
              "dark:border-cyan-400/25 dark:text-cyan-300 dark:hover:border-cyan-400/50 dark:hover:shadow-glow-cyan",
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          >
            {aiOptimizeMutation.isPending ? (
              <Sparkles className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{aiOptimizeMutation.isPending ? "AI 排期中..." : "AI 智能重排"}</span>
          </button>
        </div>
      </div>

      {/* Main Content View: Skeleton or Kanban/List */}
      {isLoading ? (
        viewMode === "kanban" ? (
          <KanbanSkeleton />
        ) : (
          <ListSkeleton />
        )
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === "kanban" ? (
            <motion.div
              key="view-kanban"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <KanbanView
                tasks={filteredTasks}
                activeDragTaskId={draggingTask?.id ?? null}
                dropTarget={dropTarget}
                onPointerDragStart={handlePointerDragStart}
                onOpenDetail={onOpenTaskDetail}
                onQuickMove={handleQuickMove}
                onCreateInColumn={onOpenCreateInColumn}
                registerColumnRef={registerColumnRef}
                registerCardRef={registerCardRef}
              />
            </motion.div>
          ) : (
            <motion.div
              key="view-list"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <ListView
                tasks={filteredTasks}
                onOpenDetail={onOpenTaskDetail}
                onQuickMove={handleQuickMove}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Floating Top-Level Drag Overlay with Velocity-Sensitive Tilt & Scale */}
      {draggingTask ? (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-50"
          style={{
            x: dragX,
            y: dragY,
            width: draggingWidth,
            rotate: prefersReducedMotion ? 0 : smoothTilt,
          }}
          initial={{ scale: 1 }}
          animate={{ scale: prefersReducedMotion ? 1 : 1.03 }}
          transition={{ type: "spring", stiffness: 450, damping: 28 }}
        >
          <TaskCard task={draggingTask} isOverlay />
        </motion.div>
      ) : null}
    </div>
  );
}

