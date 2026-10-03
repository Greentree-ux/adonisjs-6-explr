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

## Database migrations

Migrations are **not** run by the container. Nothing in the image or in
`compose.yaml` touches the schema, so starting or restarting the application
can never change it. Apply them as an explicit step before starting or
upgrading:

```bash
./scripts/migrate.sh                          # on the server, uses ./.env
./scripts/migrate.sh --env-file .env.docker   # local stack
```

The script brings the database up, takes a `pg_dump` into `backups/` with a
checksum beside it, applies the migrations, and then **verifies by counting**
applied migrations against the number of migration files in the image. It
refuses to report success unless those match.

That count is the point of the script, because the exit code cannot be
trusted. In production, `node ace migration:run` **without** `--force`
auto-answers its own confirmation prompt with "no", applies nothing, and exits
**0** — a deploy step checking `$?` would report success having done nothing,
and the application would then start against an empty schema. Worse, it starts
*healthily*: the container healthcheck serves the SPA without touching the
database. Never run the bare command; use the script.

### Rolling back

**`node ace migration:rollback` is not the rollback procedure.** On a fresh
database every migration is applied in a single batch, and a bare
`migration:rollback` rolls back the last batch — which is all of them. Measured
on a freshly migrated database, one such command left 2 bookkeeping tables out
of 34 and destroyed all 3 materialized views. Those views are the application's
read path, so the symptom is an API quietly returning empty results rather than
an error.

To undo a deployment: restore the dump the script took and redeploy the
previous image tag.

If you ever genuinely need `migration:rollback`, take a fresh dump first and
pass an explicit `--batch` or `--step`. `migration:fresh`, `migration:reset`
and `migration:refresh` are not used by this project — `fresh` drops every
table.

### Managed Postgres

`scripts/migrate.sh` expects the `db` service from `compose.yaml`, which is
also where it gets `pg_dump`. Against a managed instance, take the provider's
snapshot instead and apply migrations with:

```bash
docker compose run --rm --no-deps app node ace migration:run --force
```

then confirm the applied count matches the migration files in the image —
`node ace migration:status` should show nothing pending.

## Background jobs

Development-plan reminders are delivered by a pg-boss worker that runs
**in-process**, started from `bin/server.ts` when `REMINDER_WORKER_ENABLED` is
true (the default). pg-boss owns its own `pgboss` schema, created at runtime
and outside the migration system.

### The deployed topology: exactly one application instance

`compose.yaml` runs a single `app` service with the worker enabled, and that
is the intended shape. Keep `REMINDER_WORKER_ENABLED=true`.

**Do not scale `app` to more than one replica.** pg-boss locks jobs, so
reminders would not be delivered twice, but every replica would register as a
worker and delivery would depend on which replicas happen to be up. More
importantly, the obvious fix does not work — see below.

### Why you cannot currently split web and worker processes

The natural multi-instance layout is `REMINDER_WORKER_ENABLED=false` on the web
instances plus one dedicated worker container. **That does not work today, and
the failure is silent.**

`REMINDER_WORKER_ENABLED` only decides whether the worker starts *at boot*. The
enqueue path calls `ReminderService.start()` itself, and `start()` registers a
worker with `boss.work()`. So a web instance booted with the flag false becomes
a worker the first time a request schedules a reminder — you would get one
worker per instance that has ever written a reminder, which is the situation
the flag was meant to prevent.

Supporting that topology needs a code change in
`app/services/reminder_service.ts`: separate connecting to pg-boss (needed by
any instance that enqueues) from registering a consumer (`boss.work()`, wanted
on one instance only), and have `bin/server.ts` always do the former and the
latter only when the flag is set. Until that exists, run one instance.

## Tests

```bash
node ace test        # 4 tests, two functional spec files, ~8s
```

**Treat a green run as a smoke check, not a safety net.** The suite is small
and its blind spots are large, so what it does *not* cover matters more than
what it does.

### What it covers

Two functional spec files, both exercising the development planner through
real HTTP requests: manager overwrite and stage-5 approval, employee re-edit
triggering re-review, plan isolation across employees and managers, access
scoped to direct reports, and the formatting of reminder sequences and the CSV
export.

### What it does not cover

- **The competency import** — the path that produces nearly all the data.
- **The three materialized views** (`fn_fnroles`, `roletasksets`,
  `roleskills`), which are the application's entire read path for competency
  data. A restore that silently leaves them empty would not fail a single test.
- **Reminder delivery.** This is the sharp one. There is a test named
  *"reminder sequences and csv export"*, and it passed throughout a period when
  **every reminder job failed at delivery** — the test checks sequencing and
  formatting, never that the worker can actually send. The bug was found by
  running the worker against a real queued job, not by the suite.
- Authentication, password reset, CSRF, migrations, and the `unit` suite, which
  is configured in `adonisrc.ts` but has no test files.

### Things to know before running it

- **There is no `.env.test`**, so the suite runs against whatever `.env` points
  at — normally your development database. Each test is wrapped in a global
  transaction and rolls back, so rows do not survive, but id sequences still
  advance (`nextval` is not transactional).
- The suite starts the pg-boss reminder worker indirectly, because the enqueue
  path starts one lazily. A teardown hook in `tests/bootstrap.ts` stops it.
  Without that hook the run reports `PASSED` and then hangs forever, since
  `adonisrc.ts` sets `forceExit: false` and the worker keeps the event loop
  alive. If you ever see a green run that will not exit, that hook is the first
  place to look.

## Configuration

Two templates, both committed and both free of secrets:

| file | for |
|---|---|
| `.env.example` | local development — Mailpit, localhost database, `NODE_ENV=development` |
| `.env.production.example` | a deployed server — `HOST=0.0.0.0`, real relay, proxy trust |

Both list every variable `start/env.ts` validates. The application refuses to
boot when a required one is missing, so a half-filled file fails immediately
rather than at runtime.

On the server, copy the production template with a restrictive umask so it is
never briefly world-readable, and generate a key specific to that deployment:

```bash
umask 077 && cp .env.production.example .env
node ace generate:key          # writes APP_KEY into .env
```

Never reuse the development `APP_KEY`: sessions, signed URLs and remember-me
tokens all derive from it, so a shared key lets anyone holding the dev key forge
a production session.

## Deployment

Deployment readiness is tracked as a checklist in
`.claude/commands/deploy-prep.md` — run `/deploy-prep`.

Remaining multi-timezone work (per-user timezones and their migrations) is
tracked separately in `.claude/commands/multi-timezone.md`, to be run after
deployment.
