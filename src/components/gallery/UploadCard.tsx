"use client";

import clsx from "clsx";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface UploadCardProps {
  onClick: () => void;
}

export function UploadCard({ onClick }: UploadCardProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) return null;

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
