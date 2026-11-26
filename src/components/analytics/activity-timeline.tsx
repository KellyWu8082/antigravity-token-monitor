"use client";

import { motion } from "framer-motion";
import { Activity, Bot, GitCommitHorizontal, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityEvent } from "@/types/nexus";

interface ActivityTimelineProps {
  readonly events: readonly ActivityEvent[];
  readonly onOpenTaskByCode?: (code: string) => void;
}

function EventCategoryBadge({
  category,
}: {
  readonly category: ActivityEvent["category"];
}) {
  if (category === "ai") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/12 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-cyan-400/15 dark:text-cyan-300">
        <Bot className="h-2.5 w-2.5" aria-hidden="true" />
        AI Copilot
      </span>
    );
  }
  if (category === "command") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/12 px-2 py-0.5 text-[10px] font-semibold text-violet-600 dark:text-violet-300">
        <Terminal className="h-2.5 w-2.5" aria-hidden="true" />
        Cmd+K 调度
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-300">
      <GitCommitHorizontal className="h-2.5 w-2.5" aria-hidden="true" />
      工作流同步
    </span>
  );
}

export function ActivityTimeline({
  events,
  onOpenTaskByCode,
}: ActivityTimelineProps) {
  return (
    <section
      aria-label="最近动态流水线"
      className="rounded-3xl border border-zinc-900/[0.07] bg-white/75 p-5 shadow-glass-light backdrop-blur-md dark:border-white/5 dark:bg-slate-900/65 dark:shadow-glass-dark sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-400/20 text-indigo-600 dark:text-cyan-300">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-white">
              最近动态流水线
            </h2>
            <p className="text-xs text-zinc-500 dark:text-slate-400">
              实时捕获拖拽流转、AI 自动评估与 Cmd+K 批量调度事件
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          实时遥测流
        </span>
      </div>

      {/* Ultra-thin Vertical Timeline Stream */}
      <div className="relative mt-6 max-h-[360px] overflow-y-auto pl-6 pr-2 nx-scrollbar">
        {/* Hairline 1px Glowing Gradient Axis */}
        <div
          aria-hidden="true"
          className="absolute bottom-2 left-2.5 top-2 w-px bg-gradient-to-b from-indigo-500 via-cyan-400/60 to-transparent"
        />

        <ol className="space-y-4">
          {events.map((event, index) => (
            <motion.li
              key={event.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.25,
                delay: Math.min(index * 0.04, 0.25),
              }}
              className="group relative rounded-2xl border border-zinc-900/[0.05] bg-zinc-50/70 p-3.5 transition-all hover:border-indigo-500/25 hover:bg-white dark:border-white/[0.04] dark:bg-slate-950/45 dark:hover:border-cyan-400/25 dark:hover:bg-slate-900/80"
            >
              {/* Glowing Node */}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute -left-[19px] top-4 flex h-3 w-3 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900",
                  index === 0
                    ? "bg-cyan-400 animate-node-glow"
                    : event.isAiAgent
                      ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"
                      : "bg-slate-400 dark:bg-slate-500"
                )}
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-semibold text-white",
                      event.actorGradient
                    )}
                  >
                    {event.actorInitials}
                  </span>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-slate-100">
                    {event.actorName}
                  </span>
                  <EventCategoryBadge category={event.category} />
                </div>

                <span className="font-mono text-[11px] text-zinc-400 dark:text-slate-500">
                  {event.timestampLabel}
                </span>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-slate-300">
                {event.actionText}
                {event.targetCode ? (
                  <button
                    type="button"
                    onClick={() => onOpenTaskByCode?.(event.targetCode!)}
                    className="ml-2 inline-flex items-center rounded-md border border-indigo-500/25 bg-indigo-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-indigo-600 transition hover:bg-indigo-500/20 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-300"
                  >
                    {event.targetCode}
                  </button>
                ) : null}
              </p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

