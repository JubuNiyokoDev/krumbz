/**
 * Visible but discreet marker for values still to be provided by the brand.
 * Client-safe (no content import). The marker string mirrors TO_COMPLETE in
 * src/lib/content.ts — keep both in sync.
 */
const MARKER = "À COMPLÉTER";

export function hasToComplete(value: unknown): value is string {
  return typeof value === "string" && value.includes(MARKER);
}

export function ToCompleteBadge({
  label,
  hint,
  className = "",
  tone = "light",
}: {
  label: string;
  hint?: string;
  className?: string;
  /** "dark" = on a navy background. */
  tone?: "light" | "dark";
}) {
  return (
    <span className={`tc-badge ${tone === "dark" ? "text-gold-light" : "text-rust"} ${className}`} title={hint}>
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden focusable={false}>
        <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2 1.6" />
      </svg>
      {label}
    </span>
  );
}

/**
 * Renders a text value; every « À COMPLÉTER » occurrence becomes a badge.
 * `label` is the localized marker text (common.toComplete).
 */
export function TextWithToComplete({ value, label, hint, tone }: { value: string; label: string; hint?: string; tone?: "light" | "dark" }) {
  if (!hasToComplete(value)) return <>{value}</>;
  // Localized marker first (e.g. « TO BE COMPLETED (À COMPLÉTER) »), then the bare French one.
  const marker = label && value.includes(label) ? label : MARKER;
  const parts = value.split(marker);
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 ? <ToCompleteBadge label={label} hint={hint} tone={tone} /> : null}
        </span>
      ))}
    </>
  );
}
