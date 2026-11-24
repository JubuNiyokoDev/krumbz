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
  // Shops other than Krumbz (their files live in /images/tenants/ or /uploads/): a quiet panel in the
  // shop's colours, without the technical label, until the photo is provided.
  if (!image.file || image.file.startsWith("/images/tenants/") || image.file.startsWith("/uploads/")) {
    return (
      <div
        aria-hidden
        data-placeholder={image.file}
        className={`relative h-full w-full overflow-hidden bg-cream-deep ${className}`}
        style={{
          backgroundImage:
            "radial-gradient(circle at 22% 24%, color-mix(in srgb, var(--color-gold-light) 60%, transparent), transparent 46%), radial-gradient(circle at 82% 80%, color-mix(in srgb, var(--color-rust-bright) 24%, transparent), transparent 52%), linear-gradient(160deg, var(--color-cream), var(--color-cream-deep))",
        }}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={`${label} : ${image.file}`}
      data-placeholder={image.file}
      className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-cream-deep text-center text-navy ${className}`}
      style={{
        backgroundImage:
          "radial-gradient(circle at 25% 20%, rgb(243 199 107 / 0.55), transparent 45%), radial-gradient(circle at 80% 85%, rgb(210 105 30 / 0.22), transparent 50%), repeating-linear-gradient(135deg, rgb(226 162 58 / 0.16) 0 14px, transparent 14px 28px)",
      }}
    >
      <div className="mx-4 max-w-[min(22rem,80%)] rounded-2xl border-2 border-dashed border-rust/60 bg-cream/90 px-4 py-3 shadow-sm backdrop-blur-sm">
        <p className="font-display text-sm font-semibold uppercase tracking-wide text-rust">{label}</p>
        <p className="mt-1 break-all font-mono text-xs text-navy/80">public{image.file}</p>
        <p className="mt-0.5 font-mono text-[0.65rem] text-navy/80">
          {image.width} × {image.height}
        </p>
      </div>
    </div>
  );
}
