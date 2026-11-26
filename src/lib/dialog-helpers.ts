let supportsDisplayTransitionCache: boolean | undefined;

function canTransitionDisplay(): boolean {
  if (supportsDisplayTransitionCache !== undefined) {
    return supportsDisplayTransitionCache;
  }
  if (
    typeof window === "undefined" ||
    !window.CSS?.supports?.("transition-behavior", "allow-discrete") ||
    !document.body
  ) {
    return false;
  }

  const probe = document.createElement("div");
  probe.style.cssText =
    "transition: display 1s allow-discrete !important; display: block;";
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = "none";
  supportsDisplayTransitionCache = getComputedStyle(probe).display === "block";
  probe.remove();
  return supportsDisplayTransitionCache;
}

function supportsTopLayerExit(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    window.CSS?.supports?.("overlay", "auto") && canTransitionDisplay(),
  );
}

/**
 * Animates a native <dialog> out cleanly on browsers lacking `overlay` + discrete `display`
 * transitions (such as Firefox and Safari) before invoking `.close()`.
 */
export async function closeDialogWithMotion(
  dialog: HTMLDialogElement | null,
): Promise<void> {
  if (!dialog || !dialog.open) return;

  if (!supportsTopLayerExit()) {
    dialog.setAttribute("data-closing", "");
    const animations = dialog.getAnimations({ subtree: true });
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((animation) => animation.finished)),
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, 350);
        }),
      ]);
    }
    if (!dialog.hasAttribute("data-closing")) return;
    dialog.removeAttribute("data-closing");
  }

  if (dialog.open) {
    dialog.close();
  }
}

/**
 * Attaches a Safari/older-browser light-dismiss fallback when `closedBy` is unsupported
 * on `HTMLDialogElement.prototype`, testing pointer coordinates outside the dialog box.
 */
export function attachDialogLightDismissFallback(
  dialog: HTMLDialogElement,
  onDismiss: () => void,
): () => void {
  if (typeof HTMLDialogElement === "undefined") {
    return () => {};
  }

  if ("closedBy" in HTMLDialogElement.prototype) {
    return () => {};
  }

  let pressedOutside = false;

  const isOutsideRect = (event: PointerEvent): boolean => {
    const rect = dialog.getBoundingClientRect();
    return (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    );
  };

  const handlePointerDown = (event: PointerEvent) => {
    pressedOutside = isOutsideRect(event);
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (pressedOutside && isOutsideRect(event)) {
      onDismiss();
    }
    pressedOutside = false;
  };

  dialog.addEventListener("pointerdown", handlePointerDown);
  dialog.addEventListener("pointerup", handlePointerUp);

  return () => {
    dialog.removeEventListener("pointerdown", handlePointerDown);
    dialog.removeEventListener("pointerup", handlePointerUp);
  };
}
