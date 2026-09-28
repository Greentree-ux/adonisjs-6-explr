# syntax=docker/dockerfile:1

# =============================================================================
# Multi-stage build for the AdonisJS 6 + Angular application.
#
# Debian (bookworm-slim), NOT Alpine. @swc/core is pinned to exactly 1.10.1 and
# ships as a platform-specific native binary; Alpine's musl libc resolves a
# different build of it and fails in ways that read as corrupt dependencies
# rather than as a libc mismatch. The glibc base avoids the whole class.
#
# Three stages:
#   1. web-build     - Angular CLI compiles web/ into /app/public
#   2. server-build  - `node ace build` compiles the backend into /app/build,
#                      copying public/ in via adonisrc.ts metaFiles
#   3. runtime       - only build/ plus production dependencies
#
# The stage order mirrors `npm run build:all` (T2.2) deliberately. Running
# `node ace build` without the Angular step first SUCCEEDS and exits 0, but
# leaves build/public absent, producing a container that boots and then 404s
# the SPA with nothing in the logs to explain it.
# =============================================================================

# Pinned to the major version the repo declares in .nvmrc and in both
# "engines" ranges (>=22.12 <23). Both .npmrc files set engine-strict=true, so
# a wrong base image fails at `npm ci` here rather than at boot on the server.
ARG NODE_IMAGE=node:22-bookworm-slim


# -----------------------------------------------------------------------------
# Stage 1 - Angular frontend
#
# web/angular.json sets outputPath.base to "../public", so the bundle lands
# OUTSIDE the web/ directory, at /app/public. The host layout is reproduced
# here for that reason: the path is relative and the build will not find its
# destination if web/ sits at the filesystem root.
# -----------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS web-build

WORKDIR /app/web

# Manifests first so the dependency layer is reused whenever only source
# changes. .npmrc carries engine-strict and must be present for `npm ci`.
COPY web/package.json web/package-lock.json web/.npmrc ./
RUN npm ci

COPY web/ ./

# Writes /app/public (the Angular CLI deletes and recreates the directory).
RUN npm run build


# -----------------------------------------------------------------------------
# Stage 2 - AdonisJS backend
#
# Needs the full dependency tree, not just production: @adonisjs/assembler,
# typescript and @swc/core all run here. None of them reach the final image.
# -----------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS server-build

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci

# The build context is already pruned by .dockerignore, which was verified in
# T2.3 to be sufficient for a complete build (1.3 MB, 220 files). Notably it
# excludes public/, so no host-built bundle can shadow stage 1's output.
COPY . ./

# Must precede `node ace build`: metaFiles copies public/** into build/public.
COPY --from=web-build /app/public ./public

RUN node ace build


# -----------------------------------------------------------------------------
# Stage 3 - Runtime
#
# `node ace build` emits a self-contained build/ that includes package.json and
# package-lock.json, so production dependencies install from the same pinned
# lockfile the build used.
# -----------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime

ENV NODE_ENV=production

# Process timezone. UTC is the deliberate default from T3.4 - the business
# timezone is a separate concern, carried by APP_TIMEZONE at runtime.
ENV TZ=UTC

WORKDIR /app

COPY --from=server-build --chown=node:node /app/build ./

# The assembler does not copy .npmrc into build/, so bring it in explicitly to
# keep engine-strict enforcement on this install too.
COPY --chown=node:node .npmrc ./

RUN npm ci --omit=dev && npm cache clean --force

USER node

# config/app.ts reads PORT and HOST. 3333 is the development default; HOST must
# be 0.0.0.0 in a container or the server binds to the loopback inside the
# network namespace and is unreachable from outside it.
ENV HOST=0.0.0.0 \
    PORT=3333
EXPOSE 3333

# Migrations are deliberately NOT run here - see T4.3. Two instances starting
# together would race through the 55 migrations.
CMD ["node", "bin/server.js"]
