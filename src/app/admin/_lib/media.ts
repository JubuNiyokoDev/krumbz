import "server-only";
import { getDb } from "@/lib/db/client";
import { media } from "@/lib/db/schema";
import { storeImage, UploadError, type StoredImage } from "@/lib/uploads/images";

export const UPLOAD_ERRORS: Record<UploadError["code"], string> = {
  too_large: "Image trop lourde (8 Mo maximum).",
  not_image: "Ce fichier n'est pas une image lisible (JPEG, PNG, WebP, AVIF).",
  empty: "Fichier vide.",
};

/** Stores an image of a vendor (WebP/AVIF variants) and records it in `media`. */
export async function storeTenantImage(tenantId: string, file: File, actorUserId: string, maxWidth?: number): Promise<StoredImage> {
  const stored = await storeImage(tenantId, file, { maxWidth });
  await getDb().insert(media).values({
    tenantId,
    kind: "image",
    path: stored.key,
    mime: stored.mime,
    bytes: stored.bytes,
    width: stored.width,
    height: stored.height,
    variants: stored.variants,
    createdBy: actorUserId,
  });
  return stored;
}

export function uploadErrorMessage(error: unknown): string | null {
  return error instanceof UploadError ? UPLOAD_ERRORS[error.code] : null;
}
