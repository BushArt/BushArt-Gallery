"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { TagListResponse } from "@/types/api";
import type { Tag } from "@/types/tag";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function TagManager() {
  const { tagManagerOpen, closeTagManager, isAuthenticated } = useAuth();
  const titleId = useId();
  const [tags, setTags] = useState<Tag[]>([]);
  const [pendingDelete, setPendingDelete] = useState<Tag | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadTags = useCallback(async () => {
    const res = await fetch("/api/tags");
    if (!res.ok) return;
    const data = (await res.json()) as TagListResponse;
    setTags(data.items);
  }, []);

  useEffect(() => {
    if (!tagManagerOpen || !isAuthenticated) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when modal opens
    void loadTags();
  }, [tagManagerOpen, isAuthenticated, loadTags]);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tags/${pendingDelete.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "Delete failed");
      }
      setTags((prev) => prev.filter((t) => t.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  }, [pendingDelete]);

  if (!tagManagerOpen || !isAuthenticated) return null;

  return (
    <>
      <Modal
        onClose={closeTagManager}
        testId="tag-manager-modal"
        labelledBy={titleId}
        className="max-w-lg"
      >
        <div className="p-6" data-testid="tag-manager">
          <h2 id={titleId} className="font-fraunces text-display-sm text-paper-100">
            Manage tags
          </h2>
          <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className="flex items-center justify-between rounded-sm border border-ink-800 px-3 py-2"
                data-testid={`tag-row-${tag.slug}`}
              >
                <span className="text-body-md text-paper-100">{tag.name}</span>
                <span className="font-ibm-plex-mono text-label text-paper-500">
                  {tag.usageCount} use{tag.usageCount === 1 ? "" : "s"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-accent-ember"
                  onClick={() => setPendingDelete(tag)}
                  data-testid={`tag-delete-${tag.slug}`}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
          {error && (
            <p className="mt-3 text-body-sm text-accent-ember" role="alert">
              {error}
            </p>
          )}
        </div>
      </Modal>

      {pendingDelete && (
        <Modal
          onClose={() => setPendingDelete(null)}
          testId="tag-delete-confirm"
          labelledBy={`${titleId}-confirm`}
          className="max-w-md"
        >
          <div className="space-y-4 p-6" data-testid="tag-delete-confirm-dialog">
            <h2 id={`${titleId}-confirm`} className="font-fraunces text-display-sm text-paper-100">
              Delete tag?
            </h2>
            <p className="text-body-md text-paper-300">
              Remove &ldquo;{pendingDelete.name}&rdquo; from all artworks? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setPendingDelete(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                className="bg-accent-ember text-paper-100 hover:bg-accent-ember/90"
                onClick={() => void handleConfirmDelete()}
                disabled={isDeleting}
                data-testid="tag-delete-confirm-button"
              >
                {isDeleting ? "Deleting…" : "Delete tag"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
