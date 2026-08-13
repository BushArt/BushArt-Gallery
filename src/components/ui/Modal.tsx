"use client";

import clsx from "clsx";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  className?: string;
  labelledBy?: string;
  describedBy?: string;
  testId?: string;
  closeOnEscape?: boolean;
  ariaHidden?: boolean;
  sketchFrame?: boolean;
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
  sketchFrame = false,
}: ModalProps) {
  const fallbackTitleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const titleId = labelledBy ?? fallbackTitleId;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!closeOnEscape) return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab" || ariaHidden) return;

      const panel = dialogRef.current;
      if (!panel) return;

      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null);

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
    [ariaHidden, closeOnEscape, onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (!ariaHidden) {
      const focusTarget =
        dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
        dialogRef.current;
      focusTarget?.focus();
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [ariaHidden, handleKeyDown]);

  const showSketch = sketchFrame && !prefersReducedMotion;

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
        tabIndex={ariaHidden ? -1 : 0}
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
          "relative z-10 max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-ink-900 shadow-[var(--shadow-float)] outline-none",
          !prefersReducedMotion && !showSketch && "animate-[fadeIn_450ms_cubic-bezier(0.16,1,0.3,1)]",
          className,
        )}
        data-testid="modal-panel"
      >
        {showSketch && (
          <svg
            className="pointer-events-none absolute inset-0 z-20 h-full w-full"
            aria-hidden="true"
            data-testid="modal-sketch-frame"
          >
            <motion.rect
              x="1"
              y="1"
              width="calc(100% - 2px)"
              height="calc(100% - 2px)"
              rx="16"
              fill="none"
              stroke="var(--color-accent-brass)"
              strokeWidth="1.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
        )}
        {children}
      </div>
    </div>
  );
}

export { FOCUSABLE_SELECTOR };
