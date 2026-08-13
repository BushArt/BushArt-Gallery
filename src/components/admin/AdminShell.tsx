"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AdminFooter } from "./AdminFooter";
import { AdminOverlays } from "./AdminOverlays";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

interface AdminShellContextValue {
  openUpload: () => void;
}

const AdminShellContext = createContext<AdminShellContextValue | null>(null);

export function useAdminShell() {
  const ctx = useContext(AdminShellContext);
  if (!ctx) throw new Error("useAdminShell must be used within AdminShell");
  return ctx;
}

interface AdminShellProps {
  children: ReactNode;
  onGalleryRefresh: () => void;
}

export function AdminShell({ children, onGalleryRefresh }: AdminShellProps) {
  const { isAuthenticated, openTagManager } = useAuth();
  const [uploadOpen, setUploadOpen] = useState(false);

  const openUpload = useCallback(() => setUploadOpen(true), []);

  return (
    <AdminShellContext.Provider value={{ openUpload }}>
      {isAuthenticated && (
        <div className="sticky top-0 z-30 border-b border-ink-800 bg-ink-950/95 px-4 py-2 backdrop-blur-sm">
          <div className="mx-auto flex max-w-[1400px] justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={openUpload}
              data-testid="open-upload-dialog"
            >
              Upload artwork
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={openTagManager}
              data-testid="open-tag-manager"
            >
              Manage tags
            </Button>
          </div>
        </div>
      )}
      {children}
      <AdminFooter />
      <AdminOverlays
        uploadOpen={uploadOpen}
        onUploadClose={() => setUploadOpen(false)}
        onUploadSuccess={onGalleryRefresh}
      />
    </AdminShellContext.Provider>
  );
}
