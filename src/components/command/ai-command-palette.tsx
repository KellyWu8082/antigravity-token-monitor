"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Command,
  CornerDownLeft,
  Filter,
  FolderKanban,
  Moon,
  PlusCircle,
  Sparkles,
  Sun,
  Wand2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useAppTheme, useToast } from "@/components/providers/app-providers";
import {
  useAiOptimizeBoardMutation,
  useBatchMoveTasksMutation,
  useCreateTaskMutation,
  useRestoreTasksMutation,
  useUpdateTaskMutation,
} from "@/hooks/use-tasks-query";
import { parseAiCommandQuery } from "@/lib/ai-command-parser";
import {
  attachDialogLightDismissFallback,
  closeDialogWithMotion,
} from "@/lib/dialog-helpers";
import { cn, STATUS_LABELS } from "@/lib/utils";
import type {
  AppSection,
  NexusTask,
  ParsedAiIntent,
  TaskFilterState,
  ViewMode,
} from "@/types/nexus";

interface AiCommandPaletteProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly tasks: readonly NexusTask[];
  readonly onSwitchSection: (section: AppSection, viewMode?: ViewMode) => void;
  readonly onApplyFilter: (patch: Partial<TaskFilterState>) => void;
  readonly onOpenTaskById: (taskId: string) => void;
}

const EXAMPLE_PROMPTS: readonly string[] = [
  "将审查任务移至已完成",
  "将 NX-101 标记为紧急",
  "新建任务：接入 WebGPU 图表渲染",
  "切换到数据分析",
  "切换深色模式",
];

function IntentLeadingIcon({ intent }: { readonly intent: ParsedAiIntent }) {
  if (intent.kind === "batch_move") {
    return <Sparkles className="h-4 w-4 text-indigo-500 dark:text-cyan-300" />;
  }
  if (intent.kind === "create_task") {
    return <PlusCircle className="h-4 w-4 text-emerald-500" />;
  }
  if (intent.kind === "set_theme") {
    return intent.theme === "dark" ? (
      <Moon className="h-4 w-4 text-indigo-400" />
    ) : (
      <Sun className="h-4 w-4 text-amber-400" />
    );
  }
  if (intent.kind === "filter_priority") {
    return <Filter className="h-4 w-4 text-violet-500" />;
  }
  if (intent.kind === "ai_rebalance") {
    return <Wand2 className="h-4 w-4 text-cyan-400" />;
  }
  if (intent.kind === "open_task") {
    return <FolderKanban className="h-4 w-4 text-indigo-500 dark:text-cyan-300" />;
  }
  return <ArrowRight className="h-4 w-4 text-indigo-500 dark:text-cyan-300" />;
}

export function AiCommandPalette({
  isOpen,
  onClose,
  tasks,
  onSwitchSection,
  onApplyFilter,
  onOpenTaskById,
}: AiCommandPaletteProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const titleId = useId();
  const listboxId = useId();

  const { setPreference } = useAppTheme();
  const { pushToast } = useToast();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [listHeight, setListHeight] = useState<number>(280);

  const restoreSnapshotMutation = useRestoreTasksMutation();
  const batchMoveMutation = useBatchMoveTasksMutation({
    onSuccessWithSnapshot: (payload, previousTasks) => {
      pushToast({
        title: `已将 ${payload.taskIds.length} 项任务移至「${STATUS_LABELS[payload.targetStatus]}」`,
        description: `指令「${payload.commandLabel}」已完成乐观同步`,
        variant: "success",
        undoLabel: "撤销此批量迁移",
        onUndo: () => {
          restoreSnapshotMutation.mutate(previousTasks);
          pushToast({
            title: "已撤销上一条 AI 指令",
            description: "看板任务状态已恢复至操作前快照",
            variant: "info",
          });
        },
      });
    },
    onErrorNotify: (msg) => {
      pushToast({
        title: "指令执行异常",
        description: msg,
        variant: "error",
      });
    },
  });

  const updateTaskMutation = useUpdateTaskMutation();
  const createTaskMutation = useCreateTaskMutation();
  const aiRebalanceMutation = useAiOptimizeBoardMutation();

  const intents = useMemo(
    () => parseAiCommandQuery(query, tasks),
    [query, tasks]
  );

  // Reset active highlight when query updates
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Measure result list dynamically for silky Framer Motion height expansion
  useEffect(() => {
    const node = measureRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const nextHeight = Math.min(360, Math.max(88, entry.contentRect.height));
        setListHeight(nextHeight);
      }
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [intents.length, isOpen]);

  // Open / close native top-layer <dialog>
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      setQuery("");
      setSelectedIndex(0);
      dialog.showModal();
      window.requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } else if (!isOpen && dialog.open) {
      void closeDialogWithMotion(dialog);
    }
  }, [isOpen]);

  // Native cancel (Esc) + light-dismiss fallback
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

  const executeIntent = useCallback(
    (intent: ParsedAiIntent) => {
      switch (intent.kind) {
        case "batch_move":
          batchMoveMutation.mutate({
            taskIds: intent.matchedTaskIds,
            targetStatus: intent.targetStatus,
            commandLabel: query.trim() || intent.title,
          });
          onClose();
          return;

        case "set_priority":
          for (const taskId of intent.matchedTaskIds) {
            updateTaskMutation.mutate({
              taskId,
              patch: { priority: intent.targetPriority },
            });
          }
          pushToast({
            title: `已调整 ${intent.matchedCodes.join("、")} 优先级`,
            description: intent.title,
            variant: "success",
          });
          onClose();
          return;

        case "create_task":
          createTaskMutation.mutate({
            title: intent.taskTitle,
            description:
              "由 AI 命令控制台通过自然语言快速创建并接入协同管线。",
            status: intent.status,
            priority: intent.priority,
            assigneeId: "usr-lin",
            tags: ["AI Command"],
            storyPoints: 3,
          });
          pushToast({
            title: `已创建任务「${intent.taskTitle}」`,
            description: `已投放至「${STATUS_LABELS[intent.status]}」队列`,
            variant: "success",
          });
          onClose();
          return;

        case "switch_section":
          onSwitchSection(intent.section, intent.viewMode);
          pushToast({
            title: intent.title,
            variant: "info",
          });
          onClose();
          return;

        case "set_theme":
          setPreference(intent.theme);
          pushToast({
            title: intent.title,
            description: "主题颜色与滚动条已无缝同步",
            variant: "info",
          });
          onClose();
          return;

        case "filter_priority":
          onSwitchSection("workspace");
          onApplyFilter({ priority: intent.priority });
          pushToast({
            title: intent.title,
            variant: "info",
          });
          onClose();
          return;

        case "open_task":
          onSwitchSection("workspace");
          onOpenTaskById(intent.taskId);
          onClose();
          return;

        case "ai_rebalance":
          aiRebalanceMutation.mutate(undefined, {
            onSuccess: () => {
              pushToast({
                title: "AI 队列重排已生效",
                description: "高阻塞风险任务已自动置顶",
                variant: "info",
              });
            },
          });
          onClose();
          return;
      }
    },
    [
      aiRebalanceMutation,
      batchMoveMutation,
      createTaskMutation,
      onApplyFilter,
      onClose,
      onOpenTaskById,
      onSwitchSection,
      pushToast,
      query,
      setPreference,
      updateTaskMutation,
    ]
  );

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (intents.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = (selectedIndex + 1) % intents.length;
      setSelectedIndex(nextIndex);
      optionRefs.current.get(nextIndex)?.scrollIntoView({ block: "nearest" });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex =
        (selectedIndex - 1 + intents.length) % intents.length;
      setSelectedIndex(nextIndex);
      optionRefs.current.get(nextIndex)?.scrollIntoView({ block: "nearest" });
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const chosen = intents[selectedIndex] ?? intents[0];
      if (chosen) {
        executeIntent(chosen);
      }
    }
  };

  const activeDescendantId = intents[selectedIndex]
    ? `${listboxId}-opt-${selectedIndex}`
    : undefined;

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby={titleId}
      className="nx-dialog w-full max-w-2xl"
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl border shadow-2xl",
          "bg-white bg-opacity-85 backdrop-blur-xl dark:bg-slate-900 dark:bg-opacity-85",
          "border-zinc-900/10 dark:border-white/10",
          "shadow-[0_32px_80px_-16px_rgba(15,23,42,0.45),inset_0_1px_0_0_rgba(255,255,255,0.18)]"
        )}
      >
        {/* Top subtle aurora glow line */}
        <div
          aria-hidden="true"
          className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400"
        />

        {/* Header & Natural Language Input */}
        <div className="border-b border-zinc-900/[0.08] px-4 py-3.5 dark:border-white/[0.08]">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-cyan-400 text-white">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
              </span>
              <h2
                id={titleId}
                className="text-xs font-semibold tracking-tight text-zinc-700 dark:text-slate-200"
              >
                NexusFlow AI 命令控制台
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="关闭 AI 命令台"
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-900/10 bg-zinc-100/80 px-2 py-0.5 font-mono text-[11px] text-zinc-500 transition hover:bg-zinc-200/80 hover:text-zinc-900 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:text-white"
            >
              <span>ESC</span>
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Command
              className="h-4.5 w-4.5 shrink-0 text-indigo-500 dark:text-cyan-400"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="text"
              autoFocus
              role="combobox"
              aria-expanded={true}
              aria-controls={listboxId}
              aria-activedescendant={activeDescendantId}
              aria-label="输入自然语言命令或搜索任务"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="输入自然语言指令，例如：“将审查任务移至已完成” 或搜索 NX-101..."
              className="w-full bg-transparent py-1 text-sm font-medium tracking-tight text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          {/* Quick Example Prompts */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-medium text-zinc-400 dark:text-slate-500">
              示例指令:
            </span>
            {EXAMPLE_PROMPTS.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setQuery(sample);
                  inputRef.current?.focus();
                }}
                className="rounded-lg border border-zinc-900/[0.07] bg-zinc-100/70 px-2 py-0.5 text-[11px] text-zinc-600 transition hover:border-indigo-500/35 hover:bg-indigo-500/10 hover:text-indigo-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300 dark:hover:border-cyan-400/40 dark:hover:text-cyan-300"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Height Animated Result List */}
        <motion.div
          animate={{ height: listHeight }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="overflow-y-auto nx-scrollbar"
        >
          <div ref={measureRef} id={listboxId} role="listbox" className="p-2.5">
            <AnimatePresence initial={false} mode="popLayout">
              {intents.map((intent, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <motion.button
                    key={intent.id}
                    ref={(node) => {
                      if (node) {
                        optionRefs.current.set(idx, node);
                      } else {
                        optionRefs.current.delete(idx);
                      }
                    }}
                    id={`${listboxId}-opt-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.16 }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => executeIntent(intent)}
                    className={cn(
                      "relative isolate z-0 mb-1 flex w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-left transition-colors",
                      isSelected
                        ? "text-zinc-900 dark:text-white"
                        : "text-zinc-700 hover:bg-zinc-900/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.04]"
                    )}
                  >
                    {isSelected ? (
                      <motion.span
                        layoutId="commandPaletteActiveRow"
                        transition={{
                          type: "spring",
                          stiffness: 460,
                          damping: 34,
                        }}
                        className="absolute inset-0 -z-10 rounded-2xl border border-indigo-500/25 bg-gradient-to-r from-indigo-500/12 via-violet-500/10 to-cyan-400/12 dark:border-cyan-400/25 dark:from-indigo-500/20 dark:via-violet-500/15 dark:to-cyan-400/15"
                      />
                    ) : null}

                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-zinc-900/[0.06] bg-white/80 dark:border-white/10 dark:bg-slate-800/80">
                        <IntentLeadingIcon intent={intent} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium tracking-tight">
                          {intent.title}
                        </p>
                        <p className="truncate text-xs text-zinc-500 dark:text-slate-400">
                          {intent.subtitle}
                        </p>
                      </div>
                    </div>

                    {isSelected ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-indigo-500/25 bg-white/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-indigo-600 dark:border-cyan-400/25 dark:bg-slate-900/90 dark:text-cyan-300">
                        <CornerDownLeft className="h-3 w-3" aria-hidden="true" />
                        执行
                      </span>
                    ) : null}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Keyboard Navigation Footer Hint */}
        <div className="flex items-center justify-between border-t border-zinc-900/[0.07] bg-zinc-50/70 px-4 py-2 text-[11px] text-zinc-500 dark:border-white/[0.06] dark:bg-slate-950/50 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-zinc-900/10 bg-white px-1.5 py-0.5 font-mono text-[10px] dark:border-white/10 dark:bg-slate-800">
                ↑
              </kbd>
              <kbd className="rounded border border-zinc-900/10 bg-white px-1.5 py-0.5 font-mono text-[10px] dark:border-white/10 dark:bg-slate-800">
                ↓
              </kbd>
              <span>选择</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-zinc-900/10 bg-white px-1.5 py-0.5 font-mono text-[10px] dark:border-white/10 dark:bg-slate-800">
                Enter
              </kbd>
              <span>确认执行</span>
            </span>
          </div>
          <span className="font-mono text-[10px] text-indigo-600 dark:text-cyan-300">
            AI Intent Engine v2.4
          </span>
        </div>
      </div>
    </dialog>
  );
}

