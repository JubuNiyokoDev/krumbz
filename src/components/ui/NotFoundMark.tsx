"use client";

import { CrumbleBiscuit } from "@/components/ui/CrumbleBiscuit";
import { BrandMark } from "@/components/ui/BrandMark";
import { useKit } from "@/lib/storefront/kit";

/** 404 visual: Krumbz's biscuit crumbles; other shops show their floating mark. */
export function NotFoundMark({ className = "" }: { className?: string }) {
  const kit = useKit();
  if (kit.bespoke) return <CrumbleBiscuit className={className} />;
  return <BrandMark className={`aspect-square animate-crumb-float ${className}`} />;
}
