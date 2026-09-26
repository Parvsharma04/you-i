# syntax=docker/dockerfile:1
#
# Multi-stage, pnpm-workspace-aware Dockerfile for apps/api.
#
# Builds only @youandi/api and the workspace packages it depends on
# (@youandi/shared), runs `prisma generate`, and ships a slim, non-root
# runtime image. Build context MUST be the monorepo root, e.g.:
#
#   docker build -f apps/api/Dockerfile -t youandi-api .
#
# `prisma migrate deploy` is intentionally NOT run anywhere in this file —
# it's wired into the platform's release step instead. See DEPLOY.md.

ARG NODE_VERSION=22-alpine
ARG PNPM_VERSION=10.27.0

# ---------------------------------------------------------------------------
# base: shared setup for every stage that needs pnpm
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS base
ARG PNPM_VERSION
# Prisma's engine-detection script needs libssl visible on Alpine/musl, or
# it silently guesses wrong and can fail at runtime (documented Prisma +
# Alpine gotcha) — this is unrelated to CI/TLS, just how it resolves the
# right prebuilt engine binary.
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app

# ---------------------------------------------------------------------------
# builder: install the full @youandi/api workspace subgraph (incl. dev
# deps, needed to compile) and build it.
# ---------------------------------------------------------------------------
FROM base AS builder

# Manifests first so this layer is cached until dependencies actually
# change, independent of app source edits.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

# --filter=@youandi/api... installs @youandi/api plus every workspace
# package it depends on (today just @youandi/shared) — nothing from
# apps/web or apps/mobile is fetched or built.
RUN pnpm install --frozen-lockfile --filter=@youandi/api...

COPY tsconfig.base.json tsconfig.base.json
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

# Compile the shared package (its tsconfig already targets ./dist) before
# the API, since API code imports it and needs real JS at runtime.
#
# --module commonjs overrides the package's own tsconfig (which targets
# esnext/bundler resolution for apps/web + apps/mobile, both of which
# bundle it themselves). Plain `node` has no bundler: it would otherwise
# get extensionless ESM `import` specifiers and, since @youandi/shared has
# no "type": "module", Node's transparent require(esm) support routes them
# through the strict ESM resolver, which rejects missing extensions.
# CommonJS output sidesteps that entirely for this one runtime.
RUN pnpm --filter @youandi/shared exec tsc -p tsconfig.json --module commonjs --moduleResolution node

# Bake the Prisma client in at build time. The database itself is never
# touched here — only `prisma migrate deploy`, run as the release step,
# does that (see DEPLOY.md).
RUN pnpm --filter @youandi/api exec prisma generate --schema=prisma/schema.prisma

RUN pnpm --filter @youandi/api run build

# `packages/shared`'s package.json points `main`/`types` at its TypeScript
# source — intentional, so apps/web and apps/mobile can transpile that
# source directly in dev. Plain `node` in the runtime image can't do that,
# so this repoints *this copy* of the manifest at the compiled dist
# output. Only the shipped artifact changes; the source tree (and every
# other app's dev experience) is untouched.
RUN node -e "\
    const fs = require('fs'); \
    const p = 'packages/shared/package.json'; \
    const pkg = JSON.parse(fs.readFileSync(p, 'utf8')); \
    pkg.main = 'dist/index.js'; \
    pkg.types = 'dist/index.d.ts'; \
    fs.writeFileSync(p, JSON.stringify(pkg, null, 2)); \
    "

# ---------------------------------------------------------------------------
# prod-deps: a second, production-only install (no typescript/eslint/jest/
# @nestjs/cli/...) so the runtime image never carries dev tooling. This is
# a *separate* `pnpm install`, not `pnpm prune`, because prune needs the
# full workspace on disk (apps/web, apps/mobile aren't copied into this
# build context) to reliably tell prod deps from dev ones.
# ---------------------------------------------------------------------------
FROM base AS prod-deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY --from=builder /app/packages/shared/package.json packages/shared/package.json

RUN pnpm install --prod --frozen-lockfile --filter=@youandi/api...

# `prisma generate` needs the CLI's dev tooling to run, so it was only
# done in `builder`. Splice that generated client into this prod-only
# install by locating its pnpm store entry in both stages (deterministic:
# same lockfile, same hash) and copying just the generated `.prisma`
# output across.
COPY --from=builder /app/node_modules/.pnpm /tmp/builder-pnpm-store
RUN set -e; \
    src=$(find /tmp/builder-pnpm-store -maxdepth 1 -type d -name '@prisma+client@*'); \
    dest=$(find node_modules/.pnpm -maxdepth 1 -type d -name '@prisma+client@*'); \
    rm -rf "$dest/node_modules/.prisma"; \
    cp -r "$src/node_modules/.prisma" "$dest/node_modules/.prisma"; \
    rm -rf /tmp/builder-pnpm-store

# ---------------------------------------------------------------------------
# runtime: slim image, non-root user, only what's needed to run the server
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app

# node:*-alpine images already ship an unprivileged `node` user/group
# (uid/gid 1000) — reuse it rather than creating a new one.
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps --chown=node:node /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=prod-deps --chown=node:node /app/packages/shared/package.json ./packages/shared/package.json

COPY --from=builder --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=node:node /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=node:node /app/packages/shared/dist ./packages/shared/dist

WORKDIR /app/apps/api
USER node

EXPOSE 8081

# Hits the same endpoint the host's load balancer / uptime monitor will
# use (see HealthController) — lets `docker ps` / Fly/Railway/Render
# surface a crash-looping or DB-unreachable container before it takes
# traffic.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3001)+'/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Intentionally NOT `prisma migrate deploy` here. Migrations run once as
# the platform's release/pre-deploy command (see DEPLOY.md), not on every
# container boot, so N replicas starting in parallel don't race each other
# applying the same migration.
CMD ["node", "dist/main.js"]
