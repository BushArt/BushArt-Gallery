"use client";

import clsx from "clsx";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FilterState } from "@/hooks/useFilters";
import type { Tag } from "@/types/tag";

const DEBOUNCE_MS = 300;

function parseYearInput(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

interface FilterBarProps {
  filters: FilterState;
  tags: Tag[];
  onFiltersChange: (next: Partial<FilterState>) => void;
  className?: string;
}

export function FilterBar({ filters, tags, onFiltersChange, className }: FilterBarProps) {
  const [yearInput, setYearInput] = useState(filters.year?.toString() ?? "");
  const [mediumInput, setMediumInput] = useState(filters.medium);
  const yearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediumTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Sync URL-driven filter changes back into debounced inputs (e.g. tag toggle, back nav)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external filter source sync
    setYearInput(filters.year?.toString() ?? "");
  }, [filters.year]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external filter source sync
    setMediumInput(filters.medium);
  }, [filters.medium]);

  useEffect(() => {
    return () => {
      if (yearTimerRef.current) clearTimeout(yearTimerRef.current);
      if (mediumTimerRef.current) clearTimeout(mediumTimerRef.current);
    };
  }, []);

  const toggleTag = (slug: string) => {
    const next = filters.tags.includes(slug)
      ? filters.tags.filter((t) => t !== slug)
      : [...filters.tags, slug];
    onFiltersChange({ tags: next });
  };

  const handleYearChange = (value: string) => {
    setYearInput(value);
    if (yearTimerRef.current) clearTimeout(yearTimerRef.current);
    yearTimerRef.current = setTimeout(() => {
      onFiltersChange({ year: parseYearInput(value) });
    }, DEBOUNCE_MS);
  };

  const handleMediumChange = (value: string) => {
    setMediumInput(value);
    if (mediumTimerRef.current) clearTimeout(mediumTimerRef.current);
    mediumTimerRef.current = setTimeout(() => {
      onFiltersChange({ medium: value });
    }, DEBOUNCE_MS);
  };

  return (
    <div
      className={clsx(
        "flex flex-wrap items-center gap-3 border-b border-ink-800 bg-ink-950/95 py-3 backdrop-blur-sm",
        className,
      )}
      data-testid="filter-bar"
    >
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="sr-only">Filter by tag</legend>
        {tags.map((tag) => {
          const active = filters.tags.includes(tag.slug);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.slug)}
              className={clsx(
                "rounded-full border px-3 py-1 text-body-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass",
                active
                  ? "border-accent-brass bg-accent-brass/15 text-accent-brass"
                  : "border-ink-700 text-paper-300 hover:border-ink-600 hover:text-paper-100",
              )}
              aria-pressed={active}
            >
              {tag.name}
            </button>
          );
        })}
      </fieldset>

      <label className="flex items-center gap-2 text-body-sm text-paper-300">
        <span className="sr-only">Filter by year</span>
        <input
          type="number"
          min={1900}
          max={2100}
          placeholder="Year"
          value={yearInput}
          onChange={(e) => handleYearChange(e.target.value)}
          className="w-20 rounded-sm border border-ink-700 bg-ink-900 px-2 py-1 text-paper-100 placeholder:text-paper-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass"
          data-testid="filter-year"
        />
      </label>

      <label className="flex items-center gap-2 text-body-sm text-paper-300">
        <span className="sr-only">Filter by medium</span>
        <input
          type="text"
          placeholder="Medium"
          value={mediumInput}
          onChange={(e) => handleMediumChange(e.target.value)}
          className="w-28 rounded-sm border border-ink-700 bg-ink-900 px-2 py-1 text-paper-100 placeholder:text-paper-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass"
          data-testid="filter-medium"
        />
      </label>

      <select
        value={filters.type}
        onChange={(e) =>
          onFiltersChange({
            type: e.target.value as FilterState["type"],
          })
        }
        aria-label="Filter by type"
        className="rounded-sm border border-ink-700 bg-ink-900 px-2 py-1 text-body-sm text-paper-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass"
        data-testid="filter-type"
      >
        <option value="">All types</option>
        <option value="personal">Personal</option>
        <option value="commission">Commission</option>
      </select>

      <select
        value={filters.sort}
        onChange={(e) =>
          onFiltersChange({
            sort: e.target.value as FilterState["sort"],
          })
        }
        aria-label="Sort order"
        className="rounded-sm border border-ink-700 bg-ink-900 px-2 py-1 text-body-sm text-paper-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass"
        data-testid="filter-sort"
      >
        <option value="recent">Recent</option>
        <option value="oldest">Oldest</option>
      </select>
    </div>
  );
}

interface NsfwToggleProps {
  nsfw: "include" | "exclude";
  onChange: (nsfw: "include" | "exclude") => void;
}

export function NsfwToggle({ nsfw, onChange }: NsfwToggleProps) {
  const showNsfw = nsfw === "include";

  return (
    <button
      type="button"
      onClick={() => onChange(showNsfw ? "exclude" : "include")}
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-body-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass",
        showNsfw
          ? "border-accent-ember bg-accent-ember/15 text-accent-ember"
          : "border-ink-700 text-paper-300 hover:border-ink-600",
      )}
      aria-pressed={showNsfw}
      data-testid="nsfw-toggle"
    >
      {showNsfw ? (
        <Eye className="h-4 w-4" aria-hidden="true" />
      ) : (
        <EyeOff className="h-4 w-4" aria-hidden="true" />
      )}
      <span>{showNsfw ? "NSFW visible" : "NSFW hidden"}</span>
    </button>
  );
}

export { parseYearInput };
