"use client";

import { Plus, Sparkles, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { KANBAN_COLUMNS, TEAM_MEMBERS } from "@/data/mock-data";
import {
  attachDialogLightDismissFallback,
  closeDialogWithMotion,
} from "@/lib/dialog-helpers";
import { cn } from "@/lib/utils";
import type {
  CreateTaskPayload,
  TaskPriority,
  TaskStatus,
} from "@/types/nexus";

interface CreateTaskModalProps {
  readonly isOpen: boolean;
  readonly defaultStatus: TaskStatus;
  readonly onClose: () => void;
  readonly onCreate: (payload: CreateTaskPayload) => void;
}

export function CreateTaskModal({
  isOpen,
  defaultStatus,
  onClose,
  onCreate,
}: CreateTaskModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const headingId = useId();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>("high");
  const [assigneeId, setAssigneeId] = useState(
    TEAM_MEMBERS[0]?.id ?? "usr-lin"
  );
  const [tagsRaw, setTagsRaw] = useState("AI Core, Frontend");
  const [storyPoints, setStoryPoints] = useState(5);

  useEffect(() => {
    setStatus(defaultStatus);
  }, [defaultStatus]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
      window.requestAnimationFrame(() => {
        titleInputRef.current?.focus();
      });
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const parsedTags = tagsRaw
      .split(/[,，]/)
      .map((item) => item.trim())
      .filter(Boolean);

    onCreate({
      title: trimmedTitle,
      description:
        description.trim() ||
        "由 NexusFlow AI 协同工作台创建，等待自动评估上下文依赖。",
      status,
      priority,
      assigneeId,
      tags: parsedTags.length > 0 ? parsedTags : ["AI Sprint"],
      storyPoints,
    });

    setTitle("");
    setDescription("");
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby={headingId}
      className="nx-dialog w-full max-w-xl"
    >
      <div
        className={cn(
          "rounded-3xl border p-6 shadow-2xl",
          "bg-white bg-opacity-90 backdrop-blur-xl dark:bg-slate-900 dark:bg-opacity-90",
          "border-zinc-900/10 dark:border-white/10"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-glow-indigo">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2
                id={headingId}
                className="text-base font-semibold tracking-tight text-zinc-900 dark:text-white"
              >
                新建智能协同任务
              </h2>
              <p className="text-xs text-zinc-500 dark:text-slate-400">
                提交后立即乐观更新至看板，并自动触发 AI 工时预测
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="关闭新建任务窗口"
            onClick={onClose}
            className="rounded-xl p-1.5 text-zinc-400 transition hover:bg-zinc-900/5 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="new-task-title"
              className="block text-xs font-medium text-zinc-700 dark:text-slate-300"
            >
              任务标题 <span className="text-rose-500">*</span>
            </label>
            <input
              ref={titleInputRef}
              id="new-task-title"
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：优化 Next.js Edge Middleware 冷启动缓存策略"
              className="mt-1.5 w-full rounded-2xl border border-zinc-900/10 bg-zinc-50/80 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          <div>
            <label
              htmlFor="new-task-desc"
              className="block text-xs font-medium text-zinc-700 dark:text-slate-300"
            >
              技术上下文与验收标准
            </label>
            <textarea
              id="new-task-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述目标架构边界、核心指标或依赖接口..."
              className="mt-1.5 w-full resize-none rounded-2xl border border-zinc-900/10 bg-zinc-50/80 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label
                htmlFor="new-task-status"
                className="block text-xs font-medium text-zinc-700 dark:text-slate-300"
              >
                目标列
              </label>
              <select
                id="new-task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="mt-1.5 w-full rounded-xl border border-zinc-900/10 bg-zinc-50/80 px-3 py-2 text-xs font-medium text-zinc-800 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100"
              >
                {KANBAN_COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="new-task-priority"
                className="block text-xs font-medium text-zinc-700 dark:text-slate-300"
              >
                紧急程度
              </label>
              <select
                id="new-task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="mt-1.5 w-full rounded-xl border border-zinc-900/10 bg-zinc-50/80 px-3 py-2 text-xs font-medium text-zinc-800 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100"
              >
                <option value="urgent">紧急</option>
                <option value="high">高优先级</option>
                <option value="medium">中优先级</option>
                <option value="low">低优先级</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="new-task-assignee"
                className="block text-xs font-medium text-zinc-700 dark:text-slate-300"
              >
                指派给
              </label>
              <select
                id="new-task-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-900/10 bg-zinc-50/80 px-3 py-2 text-xs font-medium text-zinc-800 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100"
              >
                {TEAM_MEMBERS.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label
                htmlFor="new-task-tags"
                className="block text-xs font-medium text-zinc-700 dark:text-slate-300"
              >
                标签（逗号分隔）
              </label>
              <input
                id="new-task-tags"
                type="text"
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-900/10 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-800 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="new-task-points"
                className="block text-xs font-medium text-zinc-700 dark:text-slate-300"
              >
                故事点数
              </label>
              <select
                id="new-task-points"
                value={storyPoints}
                onChange={(e) => setStoryPoints(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-zinc-900/10 bg-zinc-50/80 px-3 py-2 text-xs font-medium text-zinc-800 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100"
              >
                {[1, 2, 3, 5, 8, 13].map((pt) => (
                  <option key={pt} value={pt}>
                    {pt} pts
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-zinc-900/10 pt-4 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-zinc-900/10 px-4 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
            >
              取消
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 px-4 py-2 text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow-indigo"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              立即创建
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

