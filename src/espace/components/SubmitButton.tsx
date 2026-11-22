"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** Submit button of a small Server Action form: disabled while sending (no double tap), optional confirmation. */
export function SubmitButton({
  children,
  className = "btn",
  confirmText,
  label,
}: {
  children: ReactNode;
  className?: string;
  confirmText?: string;
  label?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      aria-busy={pending}
      aria-label={label}
      title={label}
      onClick={confirmText ? (event) => !window.confirm(confirmText) && event.preventDefault() : undefined}
    >
      {children}
    </button>
  );
}
