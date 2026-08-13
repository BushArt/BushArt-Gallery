"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

export const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface UseFocusTrapOptions {
  enabled?: boolean;
  restoreFocus?: boolean;
}

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  options: UseFocusTrapOptions = {},
) {
  const { enabled = true, restoreFocus = true } = options;
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || event.key !== "Tab") return;

      const panel = containerRef.current;
      if (!panel) return;

      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null && !el.closest("[inert]"));

      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [containerRef, enabled],
  );

  useEffect(() => {
    if (!enabled) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const focusIntoPanel = () => {
      const panel = containerRef.current;
      if (!panel) return;

      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null && !el.closest("[inert]"));

      const focusTarget = focusables[0] ?? panel;
      focusTarget.focus({ preventScroll: true });
    };

    focusIntoPanel();
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(focusIntoPanel);
    });

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      document.removeEventListener("keydown", handleKeyDown, true);
      if (restoreFocus && previousFocusRef.current?.focus) {
        previousFocusRef.current.focus();
      }
    };
  }, [containerRef, enabled, handleKeyDown, restoreFocus]);
}
