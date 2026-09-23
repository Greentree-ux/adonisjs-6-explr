# Function & Competency Management

An AdonisJS 6 API serving an Angular 21 single-page application, backed by
PostgreSQL 16. Covers the competency framework (functions, roles, tasksets,
skills), employee data and invitations, assessments, learning periods and the
development planner with scheduled reminders.

## Toolchain

| | Version | Declared in |
|---|---|---|
| Node.js | `>=22.12 <23` (pinned 22.22.2) | `engines`, `.nvmrc` |
| npm | 11.7.0 | — |
| PostgreSQL | 16 | — |

```bash
nvm use            # reads .nvmrc
```

### npm is the only supported package manager

Do not use yarn or pnpm. The build depends on an npm-only `overrides` entry in
`package.json` that pins `strtok3` to `8.0.1`, resolving a transitive conflict
under `@adonisjs/core` → `@adonisjs/bodyparser` → `file-type`. yarn's
`resolutions` and `pnpm.overrides` were removed rather than kept in sync,
because a stale duplicate is worse than none: installing under a different
package manager silently drops the pin and reintroduces the conflict.

`engine-strict=true` is set in `.npmrc` (and `web/.npmrc`, since npm reads
project config from the working directory only), so an install on the wrong
Node version fails immediately instead of warning and continuing.

## Layout

This is two npm projects, not a workspace:

- **repo root** — the AdonisJS API. Owns its own `package.json` and lockfile.
- **`web/`** — the Angular application. Owns its own `package.json` and
  lockfile, and is the *only* place Angular is declared as a dependency.

`web/angular.json` sets `outputPath.base` to `../public`, so the Angular build
writes straight into the repo-root `public/` directory, which AdonisJS serves
as static files. `adonisrc.ts` declares `metaFiles: ['public/**']`, so
`node ace build` copies that directory into `build/`.

This means **the frontend must be built before the backend**.

## Setup

```bash
cp .env.example .env          # then fill in APP_KEY, DB_* and SMTP_*
npm ci                        # API dependencies
npm --prefix web ci           # Angular dependencies
node ace generate:key         # writes APP_KEY
node ace migration:run
```

Mail in development goes to [Mailpit](https://mailpit.axllent.org/) on
`localhost:1025`:

```bash
mailpit --smtp 127.0.0.1:1025     # web UI on http://localhost:8025
```

## Development

```bash
npm run dev                   # API with HMR on http://localhost:3333
npm --prefix web start        # Angular dev server, if working on the frontend
```

## Production build

Order matters — the Angular output must exist before `node ace build` runs:

```bash
npm --prefix web ci
npm --prefix web run build    # writes to ./public
node ace build                # compiles the API, copies ./public into ./build
cd build
npm ci --omit=dev
node bin/server.js
```

Migrations are deliberately **not** run from the server entrypoint. Apply them
as an explicit step before starting or upgrading, so concurrent instances
cannot race each other through them:

```bash
cd build && node ace migration:run
```

## Background jobs

The reminder worker runs in-process via `bin/server.ts`, using pg-boss. Set
`REMINDER_WORKER_ENABLED=false` to disable it — required on every web instance
if you ever run more than one, with a single dedicated worker container
instead.

## Tests

```bash
node ace test
```

Coverage is thin: two functional spec files for the development planner.
Nothing covers the competency import, the materialized views or the reminder
worker, so treat a green run as a smoke check rather than a safety net.

## Deployment

Deployment readiness is tracked as a checklist in
`.claude/commands/deploy-prep.md`.
