/**
 * PostgreSQL connection (node-postgres pool + Drizzle), created lazily on first
 * use so that importing this module never needs DATABASE_URL (build, tests of
 * pure functions). One pool per process, kept on globalThis to survive hot reload.
 */
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.ts";

export type Db = NodePgDatabase<typeof schema>;

type Holder = { pool: pg.Pool; db: Db };
const globalRef = globalThis as typeof globalThis & { __rundinovaDb?: Holder };

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb(): Db {
  if (globalRef.__rundinovaDb) return globalRef.__rundinovaDb.db;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set (see .env.example).");
  const pool = new pg.Pool({
    connectionString,
    // Small budget: the app container is capped at 640 MB (docs/plan.md §2).
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  pool.on("error", (error) => console.error("[db] idle client error", error.message));
  const db = drizzle(pool, { schema });
  globalRef.__rundinovaDb = { pool, db };
  return db;
}

/** Closes the pool (scripts and tests). */
export async function closeDb(): Promise<void> {
  const holder = globalRef.__rundinovaDb;
  globalRef.__rundinovaDb = undefined;
  await holder?.pool.end();
}

export { schema };
