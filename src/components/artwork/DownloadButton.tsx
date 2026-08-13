"use client";

import clsx from "clsx";
import { Download } from "lucide-react";

interface DownloadButtonProps {
  slug: string;
  imageIndex: number;
  asset?: "timelapse";
  label?: string;
  className?: string;
}

export function buildDownloadUrl(
  slug: string,
  imageIndex: number,
  asset?: "timelapse",
): string {
  const params = new URLSearchParams();
  if (asset === "timelapse") {
    params.set("asset", "timelapse");
  } else {
    params.set("image", String(imageIndex));
  }
  return `/api/artworks/${encodeURIComponent(slug)}/download?${params.toString()}`;
}

export function DownloadButton({
  slug,
  imageIndex,
  asset,
  label = "Download",
  className,
}: DownloadButtonProps) {
  const href = buildDownloadUrl(slug, imageIndex, asset);

  return (
    <a
      href={href}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-body-md font-medium transition-colors duration-100",
        "bg-transparent text-paper-300 hover:bg-ink-800 focus-visible:ring-2 focus-visible:ring-accent-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950",
        className,
      )}
      data-testid="download-button"
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      {label}
    </a>
  );
}
