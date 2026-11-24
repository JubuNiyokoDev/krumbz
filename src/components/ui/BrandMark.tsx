"use client";

import { Biscuit } from "@/components/ui/Biscuit";
import { useKit } from "@/lib/storefront/kit";

/**
 * Round brand mark of the shop (logo, door transition, empty cart…).
 * Krumbz: the golden biscuit. Other shops: their logo image, else a golden disc with the initial.
 */
export function BrandMark({ className = "" }: { className?: string }) {
  const kit = useKit();
  if (kit.bespoke) return <Biscuit className={className} />;
  if (kit.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- uploaded logo of any size/format (SVG included)
    return <img src={kit.logoUrl} alt="" aria-hidden className={`object-contain ${className}`} />;
  }
  const initial = Array.from(kit.name.trim())[0]?.toUpperCase() ?? "";
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className}>
      <circle cx="50" cy="50" r="46" className="fill-gold" />
      <circle cx="50" cy="50" r="38" fill="none" strokeWidth="2.5" strokeDasharray="3 6" className="stroke-gold-dark" opacity="0.55" />
      <text x="50" y="52" textAnchor="middle" dominantBaseline="central" className="fill-navy font-display" fontSize="50" fontWeight="700">
        {initial}
      </text>
    </svg>
  );
}
