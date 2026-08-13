"use client";

import clsx from "clsx";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

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
    <Button
      variant="ghost"
      className={clsx("gap-2 px-3 py-2", className)}
      asChild
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="download-button"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        {label}
      </a>
    </Button>
  );
}
