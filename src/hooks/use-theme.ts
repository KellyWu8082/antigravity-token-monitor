"use client";

import { useCallback, useEffect, useState } from "react";
import type { ResolvedTheme, ThemePreference } from "@/types/nexus";

const STORAGE_KEY = "color-scheme";

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    // Ignore storage access errors in restricted privacy contexts.
  }
  return "system";
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyMetaColorScheme(preference: ThemePreference): void {
  if (typeof document === "undefined") return;
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="color-scheme"]'
  );
  if (!meta) return;
  meta.content = preference === "system" ? "light dark" : preference;
}

export interface UseThemeResult {
  readonly preference: ThemePreference;
  readonly systemTheme: ResolvedTheme;
  readonly resolvedTheme: ResolvedTheme;
  readonly setPreference: (next: ThemePreference) => void;
  readonly toggleQuickTheme: () => void;
}

export function useTheme(): UseThemeResult {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>("dark");

  useEffect(() => {
    const initialPref = readStoredPreference();
    const initialSystem = getSystemTheme();
    setPreferenceState(initialPref);
    setSystemTheme(initialSystem);
    applyMetaColorScheme(initialPref);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const synced =
        event.newValue === "light" || event.newValue === "dark"
          ? event.newValue
          : "system";
      setPreferenceState(synced);
      applyMetaColorScheme(synced);
    };

    mediaQuery.addEventListener("change", handleMediaChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    applyMetaColorScheme(next);
    try {
      if (next === "system") {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // Theme still applies in DOM even if localStorage is blocked.
    }
  }, []);

  const resolvedTheme: ResolvedTheme =
    preference === "system" ? systemTheme : preference;

  const toggleQuickTheme = useCallback(() => {
    const target: ResolvedTheme = resolvedTheme === "dark" ? "light" : "dark";
    if (target === systemTheme) {
      setPreference("system");
    } else {
      setPreference(target);
    }
  }, [resolvedTheme, setPreference, systemTheme]);

  return {
    preference,
    systemTheme,
    resolvedTheme,
    setPreference,
    toggleQuickTheme,
  };
}

