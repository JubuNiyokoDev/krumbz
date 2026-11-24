"use client";

import { BrandMark } from "@/components/ui/BrandMark";
import { useKit } from "@/lib/storefront/kit";

/** Wordmark of the shop with its mark (Krumbz: biscuit + « Krumbz »; others: logo image, else mark + name). */
export function Logo({ name, tone = "dark", className = "" }: { name: string; tone?: "dark" | "light"; className?: string }) {
  const kit = useKit();
  if (!kit.bespoke && kit.logoUrl) {
    return (
      <span className={`group/logo inline-flex items-center ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- uploaded logo of any size/format */}
        <img src={kit.logoUrl} alt={name} className="h-10 w-auto max-w-[11rem] object-contain lg:h-12" />
      </span>
    );
  }
  return (
    <span className={`group/logo inline-flex items-center gap-2 ${className}`}>
      <BrandMark className="h-9 w-9 shrink-0 transition-transform duration-700 ease-out-back group-hover/logo:rotate-[35deg] group-hover/logo:scale-110 lg:h-10 lg:w-10" />
      <span className={`font-display text-[1.7rem] font-bold leading-none tracking-tight lg:text-[1.9rem] ${tone === "light" ? "text-cream" : "text-navy"}`}>
        {name.slice(0, -1)}
        <span className={tone === "light" ? "text-gold-light" : "text-rust"}>{name.slice(-1)}</span>
      </span>
    </span>
  );
}
