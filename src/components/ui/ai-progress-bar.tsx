"use client";

import { Sparkles } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/utils";

interface AiProgressBarProps {
  readonly value: number;
  readonly syncing?: boolean;
  readonly label?: string;
  readonly compact?: boolean;
}

export function AiProgressBar({
  value,
  syncing = false,
  label,
  compact = false,
}: AiProgressBarProps) {
  const progressId = useId();
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const isDone = clamped >= 100 && !syncing;

  return (
    <div className="w-full space-y-1.5">
      {!compact ? (
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <label
            htmlFor={progressId}
            className="inline-flex min-w-0 items-center gap-1 font-medium text-zinc-500 dark:text-slate-400"
          >
            <Sparkles
              className="h-3 w-3 shrink-0 text-indigo-500 dark:text-cyan-400"
              aria-hidden="true"
            />
            <span className="truncate">{label ?? "AI 进度估算"}</span>
          </label>
          <span
            className={cn(
              "shrink-0 font-mono text-[11px] font-semibold tabular-nums",
              isDone
                ? "text-emerald-600 dark:text-emerald-400"
                : "bg-gradient-to-r from-indigo-500 to-cyan-400 bg-clip-text text-transparent"
            )}
          >
            {syncing ? "SYNC" : `${clamped}%`}
          </span>
        </div>
      ) : null}

      <progress
        id={progressId}
        className="nx-progress"
        max={100}
        value={syncing ? undefined : clamped}
        data-done={isDone ? "true" : "false"}
        aria-label={label ?? `AI 任务完成度 ${clamped}%`}
      />
    </div>
  );
}

