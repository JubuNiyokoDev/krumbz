import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { uploadsDir } from "@/lib/uploads/images";

/**
 * Serves uploaded images from UPLOADS_DIR (src/lib/uploads/images.ts). Each upload has its own id,
 * so files never change: immutable caching (browser + the VPS nginx cache).
 */
const TYPES: Record<string, string> = { ".webp": "image/webp", ".avif": "image/avif", ".png": "image/png", ".jpg": "image/jpeg", ".glb": "model/gltf-binary", ".svg": "image/svg+xml" };
const SEGMENT = /^[a-zA-Z0-9._-]+$/;

export async function GET(_request: Request, { params }: RouteContext<"/uploads/[...path]">) {
  const { path: parts } = await params;
  if (parts.length !== 3 || !parts.every((p) => SEGMENT.test(p) && p !== "." && p !== "..")) return new Response("Not found", { status: 404 });
  const type = TYPES[path.extname(parts[2]).toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });
  const root = uploadsDir();
  const file = path.join(root, ...parts);
  if (!file.startsWith(root + path.sep)) return new Response("Not found", { status: 404 });
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error("not a file");
    const body = await readFile(file);
    return new Response(body, {
      headers: {
        "content-type": type,
        "content-length": String(info.size),
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
        // Sanitised logos (src/lib/uploads/brand.ts): never run or load anything, even when opened directly.
        ...(type === "image/svg+xml" ? { "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox" } : {}),
      },
    });
  } catch {
    return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
  }
}
