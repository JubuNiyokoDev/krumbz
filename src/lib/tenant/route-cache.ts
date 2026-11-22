/**
 * In-memory slug → { template, status } cache for the proxy, so that routing a
 * request does not hit PostgreSQL: one indexed query per slug every TTL.
 * Stale entries keep being served if the database is briefly unreachable.
 *
 * The map lives on globalThis: when the proxy runs in the same process as the
 * app (self-hosted `next start`), revalidateTenant() clears it immediately;
 * otherwise changes are picked up after TTL_MS.
 */
import { getDb } from "../db/client.ts";
import { findTenantRoute, type TenantRoute } from "./queries.ts";

const TTL_MS = 30_000;
const MISS_TTL_MS = 10_000;

type Entry = { value: TenantRoute | null; at: number };
const globalRef = globalThis as typeof globalThis & { __rundinovaTenantRoutes?: Map<string, Entry> };
const store = (globalRef.__rundinovaTenantRoutes ??= new Map());

export async function lookupTenantRoute(slug: string): Promise<TenantRoute | null> {
  const now = Date.now();
  const hit = store.get(slug);
  if (hit && now - hit.at < (hit.value ? TTL_MS : MISS_TTL_MS)) return hit.value;
  try {
    const value = await findTenantRoute(getDb(), slug);
    store.set(slug, { value, at: now });
    if (store.size > 5_000) store.delete(store.keys().next().value as string);
    return value;
  } catch (error) {
    if (hit) return hit.value;
    throw error;
  }
}

export function invalidateTenantRoute(slug?: string): void {
  if (slug) store.delete(slug);
  else store.clear();
}
