"use client";

import clsx from "clsx";
import { useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { FOCUSABLE_SELECTOR, useFocusTrap } from "@/hooks/useFocusTrap";

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  className?: string;
  labelledBy?: string;
  describedBy?: string;
  testId?: string;
  closeOnEscape?: boolean;
  ariaHidden?: boolean;
}

function lockBodyScroll() {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  const previousOverflow = document.body.style.overflow;
  const previousPaddingRight = document.body.style.paddingRight;
  document.body.style.overflow = "hidden";
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
  return () => {
    document.body.style.overflow = previousOverflow;
    document.body.style.paddingRight = previousPaddingRight;
  };
}

export function Modal({
  children,
  onClose,
  className,
  labelledBy,
  describedBy,
  testId = "modal",
  closeOnEscape = true,
  ariaHidden = false,
}: ModalProps) {
  const fallbackTitleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const titleId = labelledBy ?? fallbackTitleId;

  useFocusTrap(dialogRef, { enabled: !ariaHidden, restoreFocus: true });

  const focusDialog = useCallback(() => {
    const panel = dialogRef.current;
    if (!panel || ariaHidden) return;

    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((el) => el.offsetParent !== null && !el.closest("[inert]"));

    const focusTarget = focusables[0] ?? panel;
    focusTarget.focus({ preventScroll: true });
  }, [ariaHidden]);

  useEffect(() => {
    if (ariaHidden) return;

    const handleFocusIn = (event: FocusEvent) => {
      const panel = dialogRef.current;
      const target = event.target;
      if (!panel || !(target instanceof Node) || panel.contains(target)) return;
      focusDialog();
    };

    document.addEventListener("focusin", handleFocusIn);
    return () => document.removeEventListener("focusin", handleFocusIn);
  }, [ariaHidden, focusDialog]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!closeOnEscape) return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    },
    [closeOnEscape, onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown, true);
    const unlockScroll = lockBodyScroll();

    if (!ariaHidden) {
      focusDialog();
      const raf = requestAnimationFrame(focusDialog);
      return () => {
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", handleKeyDown, true);
        unlockScroll();
      };
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      unlockScroll();
    };
  }, [ariaHidden, focusDialog, handleKeyDown]);

  useEffect(() => {
    if (ariaHidden && dialogRef.current) {
      dialogRef.current.inert = true;
    } else if (dialogRef.current) {
      dialogRef.current.inert = false;
    }
  }, [ariaHidden]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      data-testid={testId}
      aria-hidden={ariaHidden || undefined}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(18,17,16,0.8)]"
        aria-label="Close dialog"
        onClick={onClose}
        tabIndex={-1}
        data-testid="modal-backdrop"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal={!ariaHidden}
        aria-hidden={ariaHidden || undefined}
        aria-labelledby={ariaHidden ? undefined : titleId}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={clsx(
          "relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-ink-900 shadow-[var(--shadow-float)] outline-none",
          !prefersReducedMotion && "animate-[fadeIn_450ms_cubic-bezier(0.16,1,0.3,1)]",
          className,
        )}
        data-testid="modal-panel"
      >
        <div className="bushart-scroll min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export { FOCUSABLE_SELECTOR };
