"use client";

import { useEffect } from "react";

interface KeyboardShortcutOptions {
  readonly onToggleCommandPalette: () => void;
}

export function useKeyboardShortcuts({
  onToggleCommandPalette,
}: KeyboardShortcutOptions): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onToggleCommandPalette();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onToggleCommandPalette]);
}

