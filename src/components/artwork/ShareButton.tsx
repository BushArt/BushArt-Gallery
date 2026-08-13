"use client";

import { useCallback, useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ShareButtonProps {
  slug: string;
}

function buildShareUrl(slug: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/artwork/${encodeURIComponent(slug)}`;
}

export function ShareButton({ slug }: ShareButtonProps) {
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const handleShare = useCallback(async () => {
    const url = buildShareUrl(slug);
    setConfirmation(null);

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ url, title: document.title });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setConfirmation("Link copied to clipboard");
    } catch {
      setConfirmation("Could not copy link");
    }
  }, [slug]);

  return (
    <div className="relative inline-flex flex-col items-end">
      <Button
        variant="ghost"
        className="gap-2 px-3 py-2"
        onClick={() => void handleShare()}
        data-testid="share-button"
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        Share
      </Button>
      {confirmation && (
        <p
          className="absolute top-full mt-1 whitespace-nowrap text-body-sm text-accent-brass"
          role="status"
          data-testid="share-confirmation"
        >
          {confirmation}
        </p>
      )}
    </div>
  );
}

export { buildShareUrl };
