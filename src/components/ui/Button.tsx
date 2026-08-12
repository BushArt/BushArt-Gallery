import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-brass text-ink-950 hover:bg-accent-brass/90 focus-visible:ring-2 focus-visible:ring-accent-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950",
  secondary:
    "bg-ink-800 text-paper-100 border border-ink-700 hover:bg-ink-700 focus-visible:ring-2 focus-visible:ring-accent-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950",
  ghost:
    "bg-transparent text-paper-300 hover:bg-ink-800 focus-visible:ring-2 focus-visible:ring-accent-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950",
};

export function Button({
  variant = "primary",
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-body-md font-medium transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
