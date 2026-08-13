import clsx from "clsx";
import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, id, ...props },
  ref,
) {
  const inputId = id ?? props.name;

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-body-sm text-paper-500">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={clsx(
          "w-full rounded-sm border bg-ink-900 px-3 py-2 text-body-md text-paper-100",
          "border-ink-700 placeholder:text-ink-600",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-brass",
          error && "border-accent-ember",
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-body-sm text-accent-ember" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});
