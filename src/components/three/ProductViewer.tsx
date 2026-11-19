"use client";
// STUB — replaced by the 3D agent
import type { ReactNode } from "react";
import type { TextureMap } from "@/lib/assets/registry";

export function ProductViewer({
  textures,
  initialModel = "sachet",
  fallback,
  className = "",
}: {
  textures: TextureMap;
  initialModel?: "sachet" | "carton" | "biscuit";
  fallback: ReactNode;
  className?: string;
}) {
  void textures;
  void initialModel;
  return <div className={`relative ${className}`}>{fallback}</div>;
}
