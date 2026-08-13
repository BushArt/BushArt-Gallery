"use client";

import { TagManager } from "./TagManager";
import { UploadDialog } from "./UploadDialog";

interface AdminOverlaysProps {
  uploadOpen: boolean;
  onUploadClose: () => void;
  onUploadSuccess: () => void;
}

export function AdminOverlays({ uploadOpen, onUploadClose, onUploadSuccess }: AdminOverlaysProps) {
  return (
    <>
      <TagManager />
      {uploadOpen && (
        <UploadDialog onClose={onUploadClose} onSuccess={onUploadSuccess} />
      )}
    </>
  );
}
