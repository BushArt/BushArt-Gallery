"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ArtworkPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Artwork page error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-4 text-center">
      <h1 className="font-fraunces text-display-sm text-paper-100">Could not load artwork</h1>
      <p className="mt-3 max-w-md text-body-md text-paper-300">
        Something went wrong while loading this artwork.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-ink-800 px-4 py-2 text-body-sm text-paper-100 hover:bg-ink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-ink-700 px-4 py-2 text-body-sm text-paper-100 hover:bg-ink-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass"
        >
          Back to gallery
        </Link>
      </div>
    </main>
  );
}
