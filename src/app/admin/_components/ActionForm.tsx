"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState, FormAction } from "../_lib/types";
import { CredentialsReveal } from "./CredentialsReveal";

/**
 * Generic super-admin form: posts to a Server Action (useActionState), shows its French
 * errors / message / warnings and, after an account creation or a reset, the temporary
 * password with the prefilled WhatsApp link (once).
 */
export function ActionForm({
  action,
  children,
  className,
  confirm,
  label,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  /** Confirmation question before submitting (destructive actions). */
  confirm?: string;
  label?: string;
}) {
  const [state, formAction] = useActionState<ActionState | null, FormData>(action, null);
  return (
    <form
      action={formAction}
      aria-label={label}
      className={className}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {children}
      <FormFeedback state={state} />
    </form>
  );
}

export function FormFeedback({ state }: { state: ActionState | null }) {
  if (!state) return null;
  return (
    <div className="mt-3 space-y-2 empty:hidden">
      {state.error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}
      {state.fields && Object.keys(state.fields).length > 1 && (
        <ul className="list-disc rounded-md border border-red-200 bg-red-50 py-2 pl-8 pr-3 text-sm text-red-800">
          {Object.entries(state.fields).map(([field, message]) => (
            <li key={field}>{message}</li>
          ))}
        </ul>
      )}
      {state.message && (
        <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {state.message}
        </p>
      )}
      {state.warnings?.map((warning) => (
        <p key={warning} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {warning}
        </p>
      ))}
      {state.credentials && <CredentialsReveal credentials={state.credentials} />}
    </div>
  );
}

export function SubmitButton({ children, variant = "primary", className = "" }: { children: ReactNode; variant?: "primary" | "secondary" | "danger"; className?: string }) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-slate-900 text-white hover:bg-slate-700",
    secondary: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
    danger: "border border-red-300 bg-white text-red-700 hover:bg-red-50",
  }[variant];
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`btn ${styles} ${className}`}>
      {pending ? "Patientez…" : children}
    </button>
  );
}
