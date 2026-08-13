"use client";

import clsx from "clsx";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useState, type ReactNode } from "react";
import { Skeleton } from "./Skeleton";

function SketchTraceOverlay({ loaded }: { loaded: boolean }) {
  return (
    <motion.span
      className="pointer-events-none absolute inset-0 z-10 block [box-shadow:inset_0_0_0_1.5px_var(--color-accent-brass)]"
      style={{ borderRadius: "inherit" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: loaded ? 0 : 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      aria-hidden="true"
      data-testid="sketch-trace"
    />
  );
}

interface SketchRevealProps {
  children: ReactNode;
  className?: string;
  onReveal?: () => void;
}

export function SketchReveal({ children, className, onReveal }: SketchRevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const [loaded, setLoaded] = useState(false);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    onReveal?.();
  }, [onReveal]);

  return (
    <div className={clsx("relative overflow-hidden", className)} data-testid="sketch-reveal">
      {!loaded && !prefersReducedMotion && <SketchTraceOverlay loaded={loaded} />}

      {!loaded && <Skeleton className="absolute inset-0" />}

      <motion.div
        className="h-full w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{
          duration: prefersReducedMotion ? 0.15 : 0.3,
          ease: "easeOut",
        }}
        data-testid="sketch-content"
      >
        <div
          onLoadCapture={handleLoad}
          className="h-full w-full [&_img]:h-full [&_img]:w-full [&_img]:object-cover"
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
}

/** Image wrapper that triggers SketchReveal on load. */
interface SketchRevealImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}

export function SketchRevealImage({
  src,
  alt,
  className,
  loading = "lazy",
}: SketchRevealImageProps) {
  const prefersReducedMotion = useReducedMotion();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className={clsx("relative overflow-hidden", className)} data-testid="sketch-reveal">
      {!loaded && !failed && !prefersReducedMotion && <SketchTraceOverlay loaded={loaded} />}

      {!loaded && !failed && <Skeleton className="absolute inset-0" />}

      {failed ? (
        <div
          className="flex h-full min-h-[120px] w-full items-center justify-center bg-ink-800 text-body-sm text-paper-500"
          data-testid="sketch-fallback"
        >
          Image unavailable
        </div>
      ) : (
        <motion.img
          src={src}
          alt={alt}
          loading={loading}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: loaded ? 1 : 0 }}
          transition={{
            duration: prefersReducedMotion ? 0.15 : 0.3,
            ease: "easeOut",
          }}
          data-testid="sketch-content"
        />
      )}
    </div>
  );
}
