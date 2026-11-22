"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { FormState } from "../actions";

const INITIAL: FormState = { ok: null };
/** Photos are re-encoded on the phone before upload (slow networks): longest side and JPEG quality. */
const MAX_SIDE = 2000;
const QUALITY = 0.85;

async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size < 400_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

async function shrinkPhotos(form: HTMLFormElement, data: FormData) {
  for (const input of Array.from(form.querySelectorAll<HTMLInputElement>("input[type=file][data-shrink]"))) {
    const files = Array.from(input.files ?? []);
    if (!files.length) continue;
    data.delete(input.name);
    for (const file of files) data.append(input.name, await shrink(file));
  }
}

/**
 * Form bound to a Server Action (useActionState). Works without JavaScript
 * (plain POST, the page re-renders with the result); with JavaScript it stays
 * on the page, keeps what was typed, shrinks photos before sending, marks the
 * invalid fields and moves the focus to the result.
 */
export function ActionForm({
  action,
  submitLabel,
  pendingLabel,
  errorTitle,
  children,
  className,
  resetOnSuccess = false,
  testId,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  submitLabel: string;
  pendingLabel: string;
  errorTitle: string;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  testId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const [preparing, setPreparing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const busy = pending || preparing;

  useEffect(() => {
    const form = formRef.current;
    if (!form || state.ok === null) return;
    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
    if (state.ok && resetOnSuccess) form.reset();
    for (const name of state.fields ?? []) {
      const element = form.elements.namedItem(name);
      if (element instanceof HTMLElement) {
        element.setAttribute("aria-invalid", "true");
        element.closest("details")?.setAttribute("open", "");
      }
    }
    statusRef.current?.focus();
  }, [state, resetOnSuccess]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    let data: FormData;
    try {
      data = new FormData(form, submitter);
    } catch {
      data = new FormData(form);
    }
    setPreparing(true);
    try {
      await shrinkPhotos(form, data);
    } finally {
      setPreparing(false);
    }
    startTransition(() => formAction(data));
  }

  function focusField(name: string | undefined) {
    const element = name ? formRef.current?.elements.namedItem(name) : null;
    if (element instanceof HTMLElement) element.focus();
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className={className} data-testid={testId}>
      {children}
      <div ref={statusRef} tabIndex={-1} className="status" aria-live="polite">
        {state.ok === true && state.message ? (
          <p className="notice notice-ok" role="status">
            {state.message}
          </p>
        ) : null}
        {state.ok === false ? (
          <div className="notice notice-error" role="alert">
            <p>{errorTitle}</p>
            <ul>
              {(state.errors ?? []).map((error, index) => (
                <li key={index}>
                  <a
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      focusField(state.fields?.[index]);
                    }}
                  >
                    {error}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <button type="submit" className="btn btn-primary btn-block" disabled={busy} aria-busy={busy}>
        {busy ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
