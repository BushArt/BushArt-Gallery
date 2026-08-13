"use client";

import clsx from "clsx";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { getTransformationUrl } from "@/lib/cloudinary/transformations";
import { SketchRevealImage } from "@/components/ui/SketchReveal";

export interface FullscreenMediaItem {
  publicId: string;
  alt: string;
  resourceType?: "image" | "video";
}

interface FullscreenViewerProps {
  items: FullscreenMediaItem[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

const SWIPE_THRESHOLD = 50;

export function FullscreenViewer({
  items,
  currentIndex,
  onIndexChange,
  onClose,
}: FullscreenViewerProps) {
  const labelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const item = items[currentIndex];
  const hasMultiple = items.length > 1;

  useFocusTrap(containerRef, { enabled: true, restoreFocus: false });

  const goPrev = useCallback(() => {
    onIndexChange((currentIndex - 1 + items.length) % items.length);
  }, [currentIndex, items.length, onIndexChange]);

  const goNext = useCallback(() => {
    onIndexChange((currentIndex + 1) % items.length);
  }, [currentIndex, items.length, onIndexChange]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key === "ArrowLeft" && hasMultiple) goPrev();
      if (event.key === "ArrowRight" && hasMultiple) goNext();
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [goNext, goPrev, hasMultiple, onClose]);

  const handlePointerDown = (event: React.PointerEvent) => {
    if (prefersReducedMotion) return;
    pointerStart.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    if (prefersReducedMotion || !pointerStart.current) return;

    const deltaX = event.clientX - pointerStart.current.x;
    const deltaY = event.clientY - pointerStart.current.y;
    pointerStart.current = null;

    if (
      Math.abs(deltaY) > SWIPE_THRESHOLD &&
      Math.abs(deltaY) > Math.abs(deltaX)
    ) {
      onClose();
      return;
    }

    if (!hasMultiple) return;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) < Math.abs(deltaY)) return;

    if (deltaX > 0) goPrev();
    else goNext();
  };

  if (!item) return null;

  const mediaUrl = getTransformationUrl(
    item.publicId,
    "fullscreen",
    item.resourceType ?? "image",
  );

  return (
    <motion.div
      ref={containerRef}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/95"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
      tabIndex={-1}
      data-testid="fullscreen-viewer"
      initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        pointerStart.current = null;
      }}
    >
      <p id={labelId} className="sr-only" aria-live="polite">
        {hasMultiple
          ? `Image ${currentIndex + 1} of ${items.length}`
          : "Fullscreen artwork view"}
      </p>

      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-md p-2 text-paper-100 transition-colors hover:bg-ink-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass"
        aria-label="Close fullscreen viewer"
        data-testid="fullscreen-close"
      >
        <X className="h-6 w-6" aria-hidden="true" />
      </button>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-md p-2 text-paper-100 transition-colors hover:bg-ink-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass"
            aria-label="Previous image"
            data-testid="fullscreen-prev"
          >
            <ChevronLeft className="h-8 w-8" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-md p-2 text-paper-100 transition-colors hover:bg-ink-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass"
            aria-label="Next image"
            data-testid="fullscreen-next"
          >
            <ChevronRight className="h-8 w-8" aria-hidden="true" />
          </button>
        </>
      )}

      <div
        className={clsx(
          "flex max-h-[90vh] max-w-[95vw] items-center justify-center px-12",
          hasMultiple && "pb-8",
        )}
      >
        {item.resourceType === "video" ? (
          <video
            src={mediaUrl}
            controls
            className="max-h-[85vh] max-w-full rounded-md"
            aria-label={item.alt}
          />
        ) : (
          <button
            type="button"
            className="cursor-default border-0 bg-transparent p-0"
            onClick={(e) => e.stopPropagation()}
            aria-label={item.alt}
          >
            <SketchRevealImage
              src={mediaUrl}
              alt={item.alt}
              loading="eager"
              className="max-h-[85vh] max-w-full [&_img]:max-h-[85vh] [&_img]:w-auto [&_img]:object-contain"
            />
          </button>
        )}
      </div>
    </motion.div>
  );
}
