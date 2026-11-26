"use client";

import { cn } from "@/lib/utils";

function ShimmerBar({ className }: { readonly className: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-zinc-200/80 dark:bg-white/[0.06] animate-breathe",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent dark:via-white/10 animate-shimmer" />
    </div>
  );
}

export function KanbanSkeleton() {
  return (
    <div
      aria-label="正在加载看板任务"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      {[0, 1, 2, 3].map((col) => (
        <div
          key={col}
          className="flex flex-col gap-3 rounded-3xl border border-zinc-900/[0.06] bg-white/60 p-3.5 backdrop-blur-md dark:border-white/5 dark:bg-slate-900/55"
        >
          <div className="flex items-center justify-between px-1 py-1">
            <div className="flex items-center gap-2">
              <ShimmerBar className="h-2.5 w-2.5 rounded-full" />
              <ShimmerBar className="h-4 w-20" />
            </div>
            <ShimmerBar className="h-5 w-8 rounded-full" />
          </div>

          {[0, 1].map((card) => (
            <div
              key={card}
              className="rounded-2xl border border-zinc-900/[0.06] bg-white/80 p-4 shadow-sm dark:border-white/5 dark:bg-slate-900/75"
            >
              <div className="flex items-center justify-between">
                <ShimmerBar className="h-4 w-14" />
                <ShimmerBar className="h-5 w-16 rounded-full" />
              </div>
              <ShimmerBar className="mt-3 h-4 w-11/12" />
              <ShimmerBar className="mt-2 h-3.5 w-3/4" />
              <div className="mt-4 space-y-2">
                <div className="flex justify-between">
                  <ShimmerBar className="h-3 w-24" />
                  <ShimmerBar className="h-3 w-8" />
                </div>
                <ShimmerBar className="h-1.5 w-full rounded-full" />
              </div>
              <div className="mt-4 flex items-center justify-between pt-2">
                <div className="flex gap-1.5">
                  <ShimmerBar className="h-5 w-14 rounded-md" />
                  <ShimmerBar className="h-5 w-12 rounded-md" />
                </div>
                <ShimmerBar className="h-7 w-7 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div
      aria-label="正在加载列表视图"
      className="space-y-3 rounded-3xl border border-zinc-900/[0.06] bg-white/65 p-4 backdrop-blur-md dark:border-white/5 dark:bg-slate-900/55"
    >
      {[0, 1, 2, 3, 4, 5].map((row) => (
        <div
          key={row}
          className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-900/[0.05] bg-white/80 px-4 py-3.5 dark:border-white/5 dark:bg-slate-900/70"
        >
          <div className="flex items-center gap-3">
            <ShimmerBar className="h-4 w-14" />
            <ShimmerBar className="h-4 w-56" />
          </div>
          <div className="hidden items-center gap-4 sm:flex">
            <ShimmerBar className="h-5 w-16 rounded-full" />
            <ShimmerBar className="h-2 w-24 rounded-full" />
            <ShimmerBar className="h-7 w-7 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div aria-label="正在加载 Token 用量数据" className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="rounded-3xl border border-zinc-900/[0.06] bg-white/80 p-5 shadow-glass-light dark:border-white/5 dark:bg-slate-900/65 dark:shadow-glass-dark"
          >
            <div className="flex items-center justify-between">
              <ShimmerBar className="h-3.5 w-20" />
              <ShimmerBar className="h-8 w-8 rounded-2xl" />
            </div>
            <ShimmerBar className="mt-4 h-7 w-28" />
            <ShimmerBar className="mt-3 h-2 w-full rounded-full" />
            <ShimmerBar className="mt-2.5 h-3 w-40" />
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="rounded-3xl border border-zinc-900/[0.06] bg-white/80 p-5 dark:border-white/5 dark:bg-slate-900/65 xl:col-span-7 2xl:col-span-8">
          <div className="flex items-center justify-between">
            <ShimmerBar className="h-5 w-28" />
            <ShimmerBar className="h-8 w-40 rounded-2xl" />
          </div>
          <ShimmerBar className="mt-5 h-56 w-full rounded-2xl" />
        </div>
        <div className="rounded-3xl border border-zinc-900/[0.06] bg-white/80 p-5 dark:border-white/5 dark:bg-slate-900/65 xl:col-span-5 2xl:col-span-4">
          <ShimmerBar className="h-5 w-24" />
          <div className="mt-4 space-y-2.5">
            {[0, 1, 2, 3].map((row) => (
              <ShimmerBar key={row} className="h-14 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="rounded-3xl border border-zinc-900/[0.06] bg-white/80 p-5 dark:border-white/5 dark:bg-slate-900/65 xl:col-span-7 2xl:col-span-8">
          <ShimmerBar className="h-5 w-32" />
          <ShimmerBar className="mt-4 h-36 w-full rounded-2xl" />
        </div>
        <div className="rounded-3xl border border-zinc-900/[0.06] bg-white/80 p-5 dark:border-white/5 dark:bg-slate-900/65 xl:col-span-5 2xl:col-span-4">
          <ShimmerBar className="h-5 w-24" />
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map((row) => (
              <ShimmerBar key={row} className="h-12 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

