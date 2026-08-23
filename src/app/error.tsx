/**
 * Root error boundary for uncaught layout failures.
 *
 * Per 03-System-Architecture.md §10:
 * - Client boundaries wrap the gallery feed and the artwork popup independently,
 *   so a failure loading one artwork's data cannot blank the entire page.
 * - This root error.tsx handles unexpected layout-level failures that shouldn't
 *   occur under normal operation, providing a graceful degradation.
 */
"use client";

import { useEffect } from "react";

import { error as logError } from "@/lib/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError("Root layout error", { error });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="bg-ink-800 text-paper-100 rounded-lg p-8 max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
        <p className="text-body-md mb-6">
          An unexpected error occurred. You can try reloading the page.
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-accent-brass text-paper-100 px-4 py-2 hover:bg-accent-ember"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
