/**
 * Visible but discreet marker for values still to be provided by the brand.
 * Client-safe (no content import). The marker string mirrors TO_COMPLETE in
 * src/lib/content.ts — keep both in sync.
 */
const MARKER = "À COMPLÉTER";

export function hasToComplete(value: unknown): value is string {
  return typeof value === "string" && value.includes(MARKER);
}

/**
 * Missing values are never shown to the public: the badge renders nothing.
 * (`npm run todo` lists what is still missing in content/*.json.)
 */
export function ToCompleteBadge(props: {
  label: string;
  hint?: string;
  className?: string;
  /** "dark" = on a navy background. */
  tone?: "light" | "dark";
}) {
  void props;
  return null;
}

/**
 * Renders a text value. A value that still contains « À COMPLÉTER » is never
 * shown to the public: nothing is rendered (callers hide the whole row with
 * `isPublicValue`).
 */
export function TextWithToComplete(props: { value: string; label: string; hint?: string; tone?: "light" | "dark" }) {
  return isPublicValue(props.value) ? <>{props.value}</> : null;
}

/** True when a value can be shown: not empty and not a « À COMPLÉTER » placeholder. */
export function isPublicValue(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "" && !hasToComplete(value);
}
