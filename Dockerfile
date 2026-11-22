# syntax=docker/dockerfile:1
#
# One image for Krumbz (current main) and Rundinova Studio (multi-tenant branch):
#   - Next.js standalone server (node server.js), non-root user nextjs (1001:1001);
#   - Rundinova Studio only: the Drizzle migrator (/app/migrator), run by the compose
#     one-shot service `migrate` with the SAME script as `npm run db:migrate`;
#   - data mount points /data/{uploads,cert-requests,cert-status,status} owned by nextjs.
# Build args: NEXT_PUBLIC_SITE_URL (baked into the client bundle).

# Debian (glibc), not Alpine: avoids @next/swc / sharp musl edge cases.
# Node >= 22.18 runs the .mts/.ts migrator natively (type stripping).
FROM node:22-bookworm-slim AS base

# ---- build ---------------------------------------------------------------
FROM base AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY scripts ./scripts
# @playwright/test is a devDependency: skip its ~150MB browser download, unused at build/runtime.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci --no-audit --no-fund

COPY . .

# NEXT_PUBLIC_* values are baked into the client bundle at build time.
ARG NEXT_PUBLIC_SITE_URL=https://krumbz.rundinova.com
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT_STANDALONE=1

RUN npm run build

# Migrator (Rundinova Studio only; empty directory on the Krumbz main branch).
# Self-contained in /migrator: scripts/db-migrate.mts + src/lib/db/{client,schema}.ts +
# drizzle/ and ONLY drizzle-orm + pg at the lockfile versions (the standalone trace does not
# include the migrator modules). The import graph is checked here, without a database.
WORKDIR /migrator
RUN set -eu; \
    if [ -f /app/scripts/db-migrate.mts ]; then \
      mkdir -p scripts src/lib/db; \
      cp -r /app/drizzle ./drizzle; \
      cp /app/scripts/db-migrate.mts scripts/; \
      cp /app/src/lib/db/client.ts /app/src/lib/db/schema.ts src/lib/db/; \
      v() { node -p "require('/app/node_modules/$1/package.json').version"; }; \
      printf '{"name":"rundinova-studio-migrator","private":true,"type":"module"}\n' > package.json; \
      npm install --omit=dev --no-audit --no-fund --no-package-lock \
        "drizzle-orm@$(v drizzle-orm)" "pg@$(v pg)"; \
      node --input-type=module -e "await import('/migrator/src/lib/db/client.ts'); await import('drizzle-orm/node-postgres/migrator');"; \
    else \
      echo "no scripts/db-migrate.mts: image without migrator (Krumbz main)"; \
    fi

# ---- run -------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV UPLOADS_DIR=/data/uploads
ENV CERT_REQUESTS_DIR=/data/cert-requests
ENV CERT_STATUS_DIR=/data/cert-status

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs \
 && mkdir -p /data/uploads /data/cert-requests /data/cert-status /data/status \
 && chown -R nextjs:nodejs /data

# `output: "standalone"` only traces the server bundle; public/ and
# .next/static are copied in separately (Next.js docs).
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /migrator ./migrator
COPY --from=builder /app/deploy/docker/healthcheck.mjs ./healthcheck.mjs

# Numeric uid:gid (= nextjs:nodejs): matches the owner of the host bind mounts (1001:1001).
USER 1001:1001
EXPOSE 3000

# /api/health (Rundinova Studio); builds without it (Krumbz main) fall back to "/".
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "/app/healthcheck.mjs"]

CMD ["node", "server.js"]
