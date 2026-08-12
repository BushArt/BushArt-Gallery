"use client";

import clsx from "clsx";
import { Grid3x3, List } from "lucide-react";
import type { ViewMode } from "./ArtworkCard";

interface ViewModeToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
  return (
    <div
      className="inline-flex rounded-full border border-ink-700 bg-ink-900 p-1"
      role="group"
      aria-label="Gallery view mode"
    >
      <button
        type="button"
        onClick={() => onChange("grid")}
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-body-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass",
          mode === "grid"
            ? "bg-ink-800 text-accent-brass"
            : "text-paper-300 hover:text-paper-100",
        )}
        aria-pressed={mode === "grid"}
      >
        <Grid3x3 className="h-4 w-4" aria-hidden="true" />
        Grid
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-body-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass",
          mode === "list"
            ? "bg-ink-800 text-accent-brass"
            : "text-paper-300 hover:text-paper-100",
        )}
        aria-pressed={mode === "list"}
      >
        <List className="h-4 w-4" aria-hidden="true" />
        List
      </button>
    </div>
  );
}
