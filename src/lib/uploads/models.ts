/**
 * 3D models (glTF binary) of featured products, uploaded by the super-admin only.
 * Stored as UPLOADS_DIR/<tenantId>/<uuid>/model.glb and served by /uploads/… (immutable,
 * content-type model/gltf-binary). Optimise the file before upload (scripts/optimize-3d.mjs).
 */
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_MODEL_BYTES = 15 * 1024 * 1024;
const TENANT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export class ModelUploadError extends Error {
  code: "too_large" | "not_glb" | "empty";
  constructor(code: ModelUploadError["code"]) {
    super(code);
    this.code = code;
  }
}

export const MODEL_ERRORS: Record<ModelUploadError["code"], string> = {
  too_large: "Fichier trop lourd (15 Mo maximum) : optimisez le modèle (Meshopt / Draco) avant de le téléverser.",
  not_glb: "Ce fichier n'est pas un modèle glTF binaire (.glb) valide.",
  empty: "Fichier vide.",
};

function modelsRoot(): string {
  return path.resolve(process.env.UPLOADS_DIR ?? path.join(process.cwd(), ".data", "uploads"));
}

/** glTF binary header: magic "glTF", version 2, total length = file size. */
export function isGlb(buffer: Buffer): boolean {
  return buffer.length >= 20 && buffer.readUInt32LE(0) === 0x46546c67 && buffer.readUInt32LE(4) === 2 && buffer.readUInt32LE(8) === buffer.length;
}

export async function storeModel(tenantId: string, file: File | Buffer): Promise<{ key: string; url: string; bytes: number; path: string }> {
  if (!TENANT.test(tenantId)) throw new Error("invalid tenant id");
  if (!Buffer.isBuffer(file) && file.size > MAX_MODEL_BYTES) throw new ModelUploadError("too_large");
  const data = Buffer.isBuffer(file) ? file : Buffer.from(await file.arrayBuffer());
  if (!data.length) throw new ModelUploadError("empty");
  if (data.length > MAX_MODEL_BYTES) throw new ModelUploadError("too_large");
  if (!isGlb(data)) throw new ModelUploadError("not_glb");
  const key = randomUUID();
  const dir = path.join(modelsRoot(), tenantId, key);
  await mkdir(dir, { recursive: true });
  try {
    await writeFile(path.join(dir, "model.glb"), data);
  } catch (error) {
    await rm(dir, { recursive: true, force: true });
    throw error;
  }
  return { key, url: `/uploads/${tenantId}/${key}/model.glb`, bytes: data.length, path: `${key}/model.glb` };
}
