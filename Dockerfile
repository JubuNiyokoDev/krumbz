# syntax=docker/dockerfile:1

# Debian (glibc), not Alpine: avoids @next/swc / sharp musl edge cases.
FROM node:22-bookworm-slim AS base

# ---- build ---------------------------------------------------------------
FROM base AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY scripts ./scripts
# @playwright/test is a devDependency: skip its ~150MB browser download, unused at build/runtime.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci

COPY . .

# NEXT_PUBLIC_* values are baked into the client bundle at build time.
ARG NEXT_PUBLIC_SITE_URL=https://krumbz.rundinova.com
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT_STANDALONE=1

RUN npm run build

# ---- run -------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

# `output: "standalone"` only traces the server bundle; public/ and
# .next/static are copied in separately (Next.js docs).
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
