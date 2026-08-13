"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ArtworkModalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Artwork modal error:", error);
  }, [error]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(18,17,16,0.8)] p-4"
      data-testid="artwork-modal-error"
    >
      <div className="max-w-md rounded-lg bg-ink-900 p-8 text-center shadow-[var(--shadow-float)]">
        <h2 className="font-fraunces text-display-sm text-paper-100">Could not load artwork</h2>
        <p className="mt-3 text-body-md text-paper-300">
          The artwork popup failed to render. The gallery is still available behind this dialog.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-ink-800 px-4 py-2 text-body-sm text-paper-100 hover:bg-ink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass"
          >
            Retry
          </button>
          <Link
            href="/"
            className="rounded-md border border-ink-700 px-4 py-2 text-body-sm text-paper-100 hover:bg-ink-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass"
          >
            Close
          </Link>
        </div>
      </div>
    </div>
  );
}
