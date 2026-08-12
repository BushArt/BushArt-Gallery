import clsx from "clsx";
import { Briefcase, EyeOff } from "lucide-react";

export type BadgeVariant = "nsfw" | "commission";

interface BadgeProps {
  variant: BadgeVariant;
  className?: string;
}

const VARIANT_CONFIG: Record<
  BadgeVariant,
  { label: string; icon: typeof EyeOff; className: string }
> = {
  nsfw: {
    label: "NSFW content",
    icon: EyeOff,
    className: "bg-accent-ember/20 text-accent-ember border-accent-ember/40",
  },
  commission: {
    label: "Commissioned work",
    icon: Briefcase,
    className: "bg-accent-ink-blue/20 text-accent-ink-blue border-accent-ink-blue/40",
  },
};

export function Badge({ variant, className }: BadgeProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        config.className,
        className,
      )}
      aria-label={config.label}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="sr-only">{config.label}</span>
    </span>
  );
}
