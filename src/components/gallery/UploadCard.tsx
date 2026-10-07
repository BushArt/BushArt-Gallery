"use client";

import clsx from "clsx";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { ViewMode } from "./ArtworkCard";

interface UploadCardProps {
  onClick: () => void;
  viewMode?: ViewMode;
}

export function UploadCard({ onClick, viewMode = "grid" }: UploadCardProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  if (viewMode === "list") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          "flex w-full h-24 sm:h-28 lg:h-32 items-center justify-center gap-2 rounded-md",
          "border-2 border-dashed border-ink-700 bg-ink-900/50",
          "text-paper-500 transition-colors",
          "hover:border-accent-brass hover:bg-ink-800/50 hover:text-accent-brass",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass",
        )}
        data-testid="upload-card"
        aria-label="Upload artwork"
      >
        <Plus className="h-8 w-8" aria-hidden="true" />
        <span className="text-body-sm font-medium">Upload artwork</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-md",
        "border-2 border-dashed border-ink-700 bg-ink-900/50",
        "text-paper-500 transition-colors",
        "hover:border-accent-brass hover:text-accent-brass",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass",
      )}
      data-testid="upload-card"
      aria-label="Upload artwork"
    >
      <Plus className="h-8 w-8" aria-hidden="true" />
      <span className="text-body-sm font-medium">Upload artwork</span>
    </button>
  );
}
