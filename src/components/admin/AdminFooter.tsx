"use client";

import { PenLine } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export function AdminFooter() {
  const { openLoginModal, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.altKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        openLoginModal();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [openLoginModal]);

  return (
    <footer className="border-t border-ink-800 bg-ink-950 px-4 py-6" data-testid="admin-footer">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between">
        <p className="text-body-sm text-paper-500">BushArt</p>
        <div className="flex items-center gap-4">
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => void logout()}
              className="text-body-sm text-paper-300 hover:text-paper-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass"
              data-testid="admin-logout"
            >
              Sign out
            </button>
          )}
          <button
            type="button"
            onClick={openLoginModal}
            className="rounded-sm p-2 text-paper-500 opacity-30 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass"
            aria-label="Admin login"
            data-testid="admin-login-trigger"
          >
            <PenLine className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}
