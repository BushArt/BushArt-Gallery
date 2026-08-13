"use client";

import clsx from "clsx";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { Tag } from "@/types/tag";
import type { TagListResponse } from "@/types/api";
import { Button } from "@/components/ui/Button";

interface TagPickerProps {
  tags: Tag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreateTag: (name: string) => Promise<string | null>;
  disabled?: boolean;
}

export function TagPicker({
  tags,
  selectedIds,
  onChange,
  onCreateTag,
  disabled = false,
}: TagPickerProps) {
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [query, tags]);

  const exactMatch = useMemo(
    () => tags.some((t) => t.name.toLowerCase() === query.trim().toLowerCase()),
    [query, tags],
  );

  const toggleTag = useCallback(
    (id: string) => {
      if (selectedIds.includes(id)) {
        onChange(selectedIds.filter((x) => x !== id));
      } else {
        onChange([...selectedIds, id]);
      }
    },
    [onChange, selectedIds],
  );

  const handleCreate = useCallback(async () => {
    const name = query.trim();
    if (!name || exactMatch) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      const id = await onCreateTag(name);
      if (id && !selectedIds.includes(id)) {
        onChange([...selectedIds, id]);
        setQuery("");
      } else if (!id) {
        setCreateError("Failed to create tag");
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create tag");
    } finally {
      setIsCreating(false);
    }
  }, [exactMatch, onChange, onCreateTag, query, selectedIds]);

  return (
    <div className="space-y-2" data-testid="tag-picker">
      <label htmlFor={listboxId} className="block text-body-sm text-paper-500">
        Tags
      </label>
      <input
        id={listboxId}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search or create tags…"
        disabled={disabled}
        className="w-full rounded-sm border border-ink-700 bg-ink-900 px-3 py-2 text-body-md text-paper-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass"
        data-testid="tag-picker-input"
      />
      <div className="flex flex-wrap gap-2">
        {selectedIds.map((id) => {
          const tag = tags.find((t) => t.id === id);
          if (!tag) return null;
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggleTag(id)}
              disabled={disabled}
              className="rounded-full bg-accent-brass/20 px-3 py-1 text-body-sm text-accent-brass"
              data-testid={`selected-tag-${tag.slug}`}
            >
              {tag.name} ×
            </button>
          );
        })}
      </div>
      <ul className="max-h-32 space-y-1 overflow-y-auto rounded-sm border border-ink-800 bg-ink-950 p-2">
        {filtered.map((tag) => (
          <li key={tag.id}>
            <button
              type="button"
              onClick={() => toggleTag(tag.id)}
              disabled={disabled}
              className={clsx(
                "w-full rounded-sm px-2 py-1 text-left text-body-sm transition-colors",
                selectedIds.includes(tag.id)
                  ? "bg-accent-brass/20 text-accent-brass"
                  : "text-paper-300 hover:bg-ink-800",
              )}
            >
              {tag.name}
            </button>
          </li>
        ))}
        {query.trim() && !exactMatch && (
          <li>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start px-2 py-1 text-body-sm"
              onClick={() => void handleCreate()}
              disabled={disabled || isCreating}
              data-testid="tag-create-new"
            >
              {isCreating ? "Creating…" : `Create "${query.trim()}"`}
            </Button>
          </li>
        )}
      </ul>
      {createError && (
        <p className="text-body-sm text-accent-ember" role="alert" data-testid="tag-create-error">
          {createError}
        </p>
      )}
    </div>
  );
}

export function useTagsList() {
  const [tags, setTags] = useState<Tag[]>([]);

  const refreshTags = useCallback(async () => {
    const res = await fetch("/api/tags");
    if (!res.ok) return;
    const data = (await res.json()) as TagListResponse;
    setTags(data.items);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    void refreshTags();
  }, [refreshTags]);

  const createTag = useCallback(
    async (name: string): Promise<string | null> => {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "Failed to create tag");
      }
      const created = (await res.json()) as Tag;
      setTags((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      return created.id;
    },
    [],
  );

  return { tags, refreshTags, createTag };
}
