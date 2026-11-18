import type { ResolvedImage } from "@/lib/assets/server";

/**
 * Clearly-labelled stand-in shown while a brand image is missing.
 * Drop the file at the displayed path (exact name) and it replaces this box.
 */
export function ImagePlaceholder({
  image,
  label,
  className = "",
}: {
  image: Pick<ResolvedImage, "file" | "width" | "height">;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`${label} : ${image.file}`}
      data-placeholder={image.file}
      className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-cream-deep text-center text-navy ${className}`}
      style={{
        backgroundImage:
          "repeating-linear-gradient(135deg, rgb(226 162 58 / 0.18) 0 14px, transparent 14px 28px)",
      }}
    >
      <div className="mx-4 rounded-2xl border-2 border-dashed border-rust/60 bg-cream/90 px-4 py-3 shadow-sm">
        <p className="font-display text-sm font-semibold uppercase tracking-wide text-rust">{label}</p>
        <p className="mt-1 break-all font-mono text-xs text-navy/80">public{image.file}</p>
      </div>
    </div>
  );
}
