"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, RotateCcw, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToastNotification } from "@/types/nexus";

interface ToastViewportProps {
  readonly toasts: readonly ToastNotification[];
  readonly onDismiss: (id: string) => void;
}

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <div
      aria-live="polite"
      aria-label="系统通知"
      className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className={cn(
              "pointer-events-auto relative overflow-hidden rounded-2xl border p-3.5",
              "bg-white bg-opacity-70 dark:bg-slate-900 dark:bg-opacity-70 backdrop-blur-md",
              "border-zinc-900/10 dark:border-white/10",
              "shadow-glass-light dark:shadow-glass-dark"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl",
                  toast.variant === "success" &&
                    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                  toast.variant === "info" &&
                    "bg-gradient-to-br from-indigo-500/20 to-cyan-400/20 text-indigo-600 dark:text-cyan-300",
                  toast.variant === "error" &&
                    "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                )}
              >
                {toast.variant === "success" ? (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                ) : toast.variant === "error" ? (
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium tracking-tight text-zinc-900 dark:text-slate-100">
                  {toast.title}
                </p>
                {toast.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-600 dark:text-slate-400">
                    {toast.description}
                  </p>
                ) : null}

                {toast.onUndo ? (
                  <button
                    type="button"
                    onClick={() => {
                      toast.onUndo?.();
                      onDismiss(toast.id);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-600 transition hover:-translate-y-0.5 hover:bg-indigo-500/20 dark:text-cyan-300"
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden="true" />
                    {toast.undoLabel ?? "撤销操作"}
                  </button>
                ) : null}
              </div>

              <button
                type="button"
                aria-label="关闭通知"
                onClick={() => onDismiss(toast.id)}
                className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-900/5 hover:text-zinc-700 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

