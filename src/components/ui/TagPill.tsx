import clsx from "clsx";

interface TagPillProps {
  name: string;
  className?: string;
}

export function TagPill({ name, className }: TagPillProps) {
  return (
    <span
      className={clsx(
        "inline-flex rounded-full border border-ink-700 bg-ink-800 px-3 py-1 font-ibm-plex-mono text-label leading-label tracking-label text-paper-300",
        className,
      )}
    >
      {name}
    </span>
  );
}
