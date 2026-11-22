/**
 * What every vendor-space operation receives: the authenticated actor (from the
 * session, never from the request), the side effects (storefront revalidation,
 * image files) and optionally a database handle (tests).
 *
 * Kept free of Next.js / "server-only" imports so that the operations can be
 * tested with plain Node (tests/isolation/espace-actions.test.mts).
 */
import type { Db } from "../db/client.ts";
import type { FieldError } from "./validation.ts";

export interface VendorActor {
  userId: string;
  /** sessions.tenant_id of the logged-in vendor. */
  tenantId: string;
}

export interface StoredImageLike {
  key: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
  mime: string;
  variants: Record<string, string>;
}

export interface EspaceEffects {
  /** revalidateTenant(slug) in the app. */
  revalidate(slug: string): void;
  storeImage(owner: string, file: File): Promise<StoredImageLike>;
  removeImage(owner: string, key: string): Promise<void>;
}

export interface EspaceDeps {
  actor: VendorActor;
  effects: EspaceEffects;
  db?: Db;
}

export type Result<T = null> = { ok: true; data: T } | { ok: false; errors: FieldError[] };

export const fail = (field: string, code: FieldError["code"], max?: number): { ok: false; errors: FieldError[] } => ({
  ok: false,
  errors: [{ field, code, ...(max === undefined ? {} : { max }) }],
});

export const done = <T>(data: T): { ok: true; data: T } => ({ ok: true, data });

/** Smallest WebP variant of an upload (list thumbnails), else the image URL itself. */
export function thumbnailOf(url: string, variants: Record<string, string> | undefined): string {
  if (!variants) return url;
  const webp = Object.entries(variants)
    .filter(([name]) => name.endsWith(".webp"))
    .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10));
  return webp[0]?.[1] ?? url;
}
