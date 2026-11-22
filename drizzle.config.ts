import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: DATABASE_URL comes from the environment.
}

/**
 * npm run db:generate  → SQL migration in drizzle/ from src/lib/db/schema.ts (commit it)
 * npm run db:migrate   → applies drizzle/ (scripts/db-migrate.mts, no drizzle-kit needed in production)
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://localhost/rundinova_studio" },
  strict: true,
  verbose: true,
});
