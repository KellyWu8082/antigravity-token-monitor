"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ToastViewport } from "@/components/ui/toast-viewport";
import { useTheme, type UseThemeResult } from "@/hooks/use-theme";
import { createNexusQueryClient } from "@/lib/query-client";
import type { ToastNotification } from "@/types/nexus";

interface ToastContextValue {
  readonly pushToast: (toast: Omit<ToastNotification, "id">) => void;
  readonly dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const ThemeContext = createContext<UseThemeResult | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within AppProviders");
  }
  return ctx;
}

export function useAppTheme(): UseThemeResult {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useAppTheme must be used within AppProviders");
  }
  return ctx;
}

export function AppProviders({ children }: { readonly children: ReactNode }) {
  const [queryClient] = useState(() => createNexusQueryClient());
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const theme = useTheme();

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<ToastNotification, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 4800);
    },
    []
  );

  const toastValue = useMemo<ToastContextValue>(
    () => ({ pushToast, dismissToast }),
    [pushToast, dismissToast]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <ThemeContext.Provider value={theme}>
          <ToastContext.Provider value={toastValue}>
            {children}
            <ToastViewport toasts={toasts} onDismiss={dismissToast} />
          </ToastContext.Provider>
        </ThemeContext.Provider>
      </MotionConfig>
    </QueryClientProvider>
  );
}

