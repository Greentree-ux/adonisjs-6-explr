---
description: Resume the dockerisation / deployment-readiness sequence for this app
---

# Deployment prep — 33 tasks in 8 phases

Full rationale, per-task "done when" criteria and the risk notes live in the artifact:
**https://claude.ai/code/artifact/66deae2b-3f75-4361-893e-2ebd0469aa27**

## How to run this command

1. Read the checklist below and work out **where we currently are** — check the git branch,
   working tree state, and whether the files each task produces already exist
   (`.nvmrc`, `.dockerignore`, `Dockerfile`, `compose.yaml`, `.gitignore` entries, etc.).
2. Report the current position: which tasks are done, which is next.
3. If `$ARGUMENTS` names a phase or task (e.g. `phase 1`, `T2.1`), start there instead.
4. Do the next task, verify its "done when", then stop and report before moving on —
   unless told to continue through a whole phase.

## The standing constraint

**Nothing here may break local development.** Every configuration change is expressed as an
environment variable whose default reproduces today's local behaviour, so `npm run dev`
against local Postgres and Mailpit on `localhost:1025` keeps working at every step.
Phase 5 (T5.4) exists specifically to prove that.

## Critical path

```
T0.3 → T1.1 → T1.3 → T2.1 → T2.2 → T4.1 → T5.1 → T5.2 → T6.2 → live
```

The rest can move. Phase 3 is five independent changes, doable in any order or in parallel
with Phase 2. T1.2, T1.4 and T5.5 are hygiene and never block a deploy. Phase 6 needs nothing
from the codebase and can be provisioned while Phase 4 is still being written.

**The one ordering that genuinely matters: T2.1 must land before T4.1.** Building an image
while generated bundles are still tracked produces a container serving whichever `main-*.js`
was last committed rather than the one the build just made — and because the page still
loads, the mistake surfaces as a UI that is inexplicably out of date.

---

## Phase 0 — Establish a baseline you can return to

Every later phase changes the build. Without a recorded known-good state you cannot tell
whether a Docker build failure is a Docker problem or something the repo already had.

- [ ] **T0.1 — Branch the shipping work.** Create `deploy-prep` off `main`. The working tree
  has substantial uncommitted change across controllers, models and the Angular app — commit
  or stash that first so deployment changes stay separable.
  *Done when:* `git status` is clean on a branch that is not `main`.

- [ ] **T0.2 — Take a durable database snapshot.** `pg_dump` of `fcm1` — it holds the GIS and
  DNM functions plus the 36 sub-sub-functions, 144 tasksets and 116 skill definitions loaded
  for Chemical–Trombay. This dump is both the rollback and the Phase 5 fixture.
  *Done when:* the dump restores cleanly into a scratch database and `roleskills` returns 116
  rows for `fnid=3`.

- [ ] **T0.3 — Record and verify the reference build.** Run the production build path by hand,
  in order: `cd web && npm ci && npm run build` (Angular writes into repo-root `public/`), then
  `node ace build` at the root, then `cd build && npm ci --omit=dev` and `node bin/server.js`.
  Note exact versions: Node 22.22.2, npm 11.7.0, PostgreSQL 16.15. Doing it manually once
  makes the Phase 4 Dockerfile a transcription rather than a guess.
  *Done when:* the built server boots, serves the Angular app, and a login succeeds.

## Phase 1 — Pin the toolchain

Four of these are live ambiguities in the repo today — the runtime is undeclared and two
package manifests disagree about Angular.

- [ ] **T1.1 — Declare the Node version.** ⚠️ *blocks deploy.* Nothing in the repo states one:
  no `engines` field in either `package.json`, no `.nvmrc`, no `.node-version`. Add
  `"engines": { "node": ">=22.12 <23" }` to both manifests and a `.nvmrc` containing `22.22.2`.
  Adonis 6 and Angular 21 both require Node ≥20.19 or ≥22.12; a server defaulting to Node 18
  fails at boot, Node 24 fails in subtler ways.
  *Done when:* `npm ci` warns on a deliberately wrong Node version.

- [ ] **T1.2 — Commit to npm as the only package manager.** ⚠️ *silent drift.* `package.json`
  pins `strtok3@8.0.1` three times — `overrides` (npm), `resolutions` (yarn) and
  `pnpm.overrides`. Only the npm one takes effect. Delete the other two and state npm in the
  README. This transitive conflict has already bitten once; a build under a different package
  manager drops the override and reintroduces it.
  *Done when:* only `overrides` remains and `npm ci` still resolves `strtok3` to 8.0.1.

- [ ] **T1.3 — Remove the duplicate Angular dependency set.** ⚠️ *silent drift.* Root
  `package.json` lists `@angular/core`, `common`, `compiler` and both `platform-browser`
  packages at `^21.0.6` as runtime deps, while the real app in `web/` declares `^21.0.0`
  against its own lockfile. Nothing outside `web/` imports Angular. Remove them from the root,
  along with `@angular/cli` and `@angular/compiler-cli` from root devDependencies.
  *Done when:* `npm ci && node ace build` succeeds at the root and the Angular build is
  unaffected.

- [ ] **T1.4 — Retire the unused Vite scaffolding.** `vite.config.ts` is an empty config with
  an unused `adonisjs` import, `adonisrc.ts` sets `assetsBundler: false`, and there is no
  `resources/` directory — yet the Vite build hook still runs on every `node ace build`. The
  frontend is built entirely by the Angular CLI. Remove the hook, provider and config, or
  deliberately confirm they stay. Dead build steps break first inside a container and are
  hardest to diagnose.
  *Done when:* `node ace build` produces an identical `build/` tree without invoking Vite.

- [ ] **T1.5 — Confirm both lockfiles install from clean.** Delete both `node_modules` trees,
  run `npm ci` at the root and in `web/`, commit any lockfile change the earlier tasks produced.
  *Done when:* both installs succeed with no `npm install` fallback and lockfiles are committed.

## Phase 2 — Make the build the source of truth

Generated frontend bundles are tracked in git and the tracked copy has already diverged from
what the source produces. Until fixed, what gets deployed depends on git state rather than on
the Angular code.

- [ ] **T2.1 — Stop tracking generated bundles.** ⚠️ *ships stale UI.* Repo-root `public/` is
  entirely Angular output — `angular.json` sets `outputPath.base` to `../public`, and the only
  genuine source asset is `web/public/favicon.ico`, which Angular copies in. `git rm --cached`
  the generated files and add `/public/*.js`, `/public/*.css`, `/public/index.html`,
  `/public/*.txt` and `/public/prerendered-routes.json` to `.gitignore` (which already ignores
  `public/assets`).
  *Done when:* a fresh clone has no `public/*.js`, and the Angular build recreates the
  directory in full.

- [ ] **T2.2 — Add a single root build script.** Add
  `"build:all": "npm --prefix web ci && npm --prefix web run build && node ace build"` so the
  ordering — frontend first, because `adonisrc.ts` declares `metaFiles: ['public/**']` and
  copies `public/` into `build/` — is encoded once rather than remembered.
  *Done when:* `npm run build:all` from a clean tree produces a complete `build/` including
  the frontend.

- [ ] **T2.3 — Write `.dockerignore`.** Exclude `node_modules`, `web/node_modules`, `build`,
  `web/dist`, `web/.angular`, `tmp`, `.git`, `.env` and the loose `.xlsx` / `.png` files in the
  project root. Without it the build context includes both dependency trees and every workbook.
  *Done when:* the reported Docker build context is a few megabytes, not hundreds.

## Phase 3 — Move deployment-specific config into the environment

Each adds a variable whose default reproduces today's local behaviour. That is what lets the
same image serve both this machine and the server. These five are independent — any order.

- [ ] **T3.1 — Enable authenticated SMTP.** ⚠️ *blocks all mail.* The `auth` block in
  `config/mail.ts` is commented out. Uncomment it and add optional `SMTP_USERNAME` /
  `SMTP_PASSWORD` to `start/env.ts`, applying the block only when a username is set. Keeping it
  conditional means Mailpit on `localhost:1025` keeps working here with no credentials.
  *Done when:* mail still sends to Mailpit locally, and to a real relay with credentials set.

- [ ] **T3.2 — Require `APP_URL` in production.** ⚠️ *breaks invite links.* Three controllers —
  `auth_controller.ts`, `sys_admin_controller.ts`, `org_admin_controller.ts` — read
  `env.get('APP_URL', 'http://localhost:3333')` when building links. Keep the fallback for
  development, but fail fast at boot if `NODE_ENV=production` and `APP_URL` is unset. Silently
  emailing `localhost:3333` links to real employees is not noticed until they have gone out.
  *Done when:* a production boot without `APP_URL` refuses to start with a clear message.

- [ ] **T3.3 — Configure `trustProxy`.** ⚠️ *breaks login.* `config/app.ts` never sets it, so
  Adonis trusts only loopback. Behind a reverse proxy in a separate container the peer address
  is a private network address, so `request.protocol()` reports `http` even over HTTPS. Drive
  it from an env var defaulting to current loopback behaviour. Combined with
  `secure: app.inProduction` in both `config/session.ts` and `config/app.ts`, the session cookie
  is issued but never returned — a login that appears to succeed, then bounces back to the form.
  *Done when:* the app behind a proxy logs the correct client IP and issues a session cookie
  that survives a redirect.

- [ ] **T3.4 — Decide the server timezone deliberately.** ⚠️ *data correctness.* `.env.example`
  says `TZ=UTC`, but every timestamp in `fcm1` is stored at `+05:30`. Employment dates on
  `emp_data` and `users`, learning period boundaries and the pg-boss reminder schedule all
  resolve against this; a silent change shifts reminder firing by five and a half hours.
  *Done when:* a reminder scheduled for a known local time fires at that time in the container.

- [ ] **T3.5 — Write a production `.env.example` and generate a fresh `APP_KEY`.** Cover the
  full schema in `start/env.ts`, with `HOST=0.0.0.0` (current `localhost` makes a container
  refuse outside traffic), `NODE_ENV=production`, `LOG_LEVEL=info`, and a key from
  `node ace generate:key`. Sessions, signed URLs and remember-me tokens all derive from
  `APP_KEY` — reusing the dev key on a public server exposes every session.
  *Done when:* the file lists every variable `start/env.ts` validates, with no real secrets
  committed.

## Phase 4 — Containerize

A transcription of the verified Phase 0 build path, each runtime pinned by major version so
the server cannot substitute its own.

- [ ] **T4.1 — Write the multi-stage Dockerfile on Debian, not Alpine.** ⚠️ *native binary.*
  Three stages on `node:22-bookworm-slim`: build the Angular app into `public/`; run
  `node ace build` at the root; copy `build/` into a clean runtime stage, `npm ci --omit=dev`
  inside it, `CMD ["node", "bin/server.js"]`. `@swc/core` is pinned to exactly `1.10.1` and
  ships as a platform-specific native binary — Alpine's musl libc resolves a different build
  and fails in ways that look like corrupt dependencies.
  *Done when:* `docker build` succeeds from a clean clone and the image runs `node bin/server.js`.

- [ ] **T4.2 — Compose the app with a pinned `postgres:16`.** App, database and Caddy, with a
  named volume for Postgres data, a healthcheck on the database, and `depends_on` gating app
  startup. You are on 16.15 and pg-boss 12 has already created its `pgboss` schema at that
  version; pinning the major keeps its internal migrations on the path already taken.
  *Done when:* `docker compose up` brings up all three and the app connects.

- [ ] **T4.3 — Run migrations as an explicit one-off.** ⚠️ *concurrency.* Keep
  `node ace migration:run` out of the container entrypoint; run it separately against the
  production database before starting or upgrading. There are 59 migrations — on entrypoint,
  two instances starting together race through them.
  *Done when:* a documented command applies migrations and the app image never mutates schema.

- [ ] **T4.4 — Settle the reminder worker topology.** `bin/server.ts` starts the pg-boss worker
  in-process on boot unless `REMINDER_WORKER_ENABLED=false`. For a single instance, leave it on.
  For more than one, set it `false` on web instances and run one dedicated worker container.
  pg-boss locks jobs so duplicates will not double-fire, but a worker in every replica makes
  reminder delivery depend on how many replicas happen to be up.
  *Done when:* the intended topology is written down and the variable is set to match.

## Phase 5 — Prove parity (THE GATE — do not pass with failures)

Everything so far is verified on this machine, against the real data, before a server is
involved. Failures here are cheap; the same failures after cutover are not.

- [ ] **T5.1 — Run the image against a throwaway Postgres 16.** Bring up the compose stack
  locally on non-conflicting ports, run migrations, create a sysadmin. The development database
  on `127.0.0.1:5432` stays untouched.
  *Done when:* the containerized app serves the Angular UI and a login succeeds over the proxy.

- [ ] **T5.2 — Restore the real data and check the views.** Load the T0.2 dump into the
  container's Postgres, then confirm `fn_fnroles`, `roletasksets` and `roleskills` return 4,
  144 and 116 rows for `fnid=3`, and that a Chemical–Trombay role renders in the UI. The three
  materialized views are the app's read path for competency data — a restore that omits them
  leaves the API returning empty results with no error.
  *Done when:* counts match and the Lead Associate role displays its 31 tasksets.

- [ ] **T5.3 — Exercise the paths that only break in production.** Over HTTPS through the proxy:
  log in and confirm the session survives a redirect; submit a form that trips CSRF, since
  `config/shield.ts` exempts only routes starting `/api/`; trigger a password reset and check
  the emitted link uses `APP_URL`; schedule a reminder and confirm it fires at the intended
  local time.
  *Done when:* all four pass against the container, not the dev server.

- [ ] **T5.4 — Confirm local development still works.** Stop the containers, run `npm run dev`
  as before against local Postgres and Mailpit, walk the same four paths from T5.3. Doing this
  after containerizing rather than before is what catches an environment default that quietly
  assumed the container.
  *Done when:* the local workflow is identical to what it was before T0.1.

- [ ] **T5.5 — Run the test suite, and know what it does not cover.** `node ace test` runs two
  functional spec files. Treat it as a smoke check, not a safety net — nothing covers the
  competency import, the materialized views or the reminder worker, so T5.2 and T5.3 do the
  real verification.
  *Done when:* the suite passes and its limits are recorded in the README.

## Phase 6 — Provision the server

Only now does a remote machine enter the picture, and only as a host for an artifact that has
already been proven.

- [ ] **T6.1 — Provision the host and lock it down.** A small Linux VM with Docker Engine;
  firewall open on 80, 443 and SSH only; key-based SSH with password auth disabled; automatic
  security updates.
  *Done when:* the host runs `docker compose` and exposes nothing else.

- [ ] **T6.2 — Point DNS at the host and terminate TLS.** ⚠️ *breaks login.* An A record for the
  chosen hostname, then Caddy issuing a certificate automatically. HTTPS is not optional:
  `secure: app.inProduction` on the session cookie means that over plain HTTP the browser will
  not return it, and nobody can log in.
  *Done when:* the site loads over HTTPS with a valid certificate and HTTP redirects to it.

- [ ] **T6.3 — Place secrets on the server only.** The production `.env` lives on the host with
  restrictive permissions, never in the image or the repository: `APP_KEY`, database password,
  SMTP credentials.
  *Done when:* the image contains no secret and `git log` shows none was ever committed.

- [ ] **T6.4 — Choose managed or containerized Postgres.** Either is defensible — managed gives
  backups and patching, containerized keeps the stack self-contained. Pin major version 16 in
  both cases; if managed, confirm the provider permits the `pgboss` schema and the extensions
  the migrations use.
  *Done when:* the app connects over TLS to a Postgres 16 instance with a dedicated
  non-superuser role.

## Phase 7 — Cut over and operate

Shipping is not the last step; being able to recover is. The competency data represents
substantial manual work and exists in exactly one place.

- [ ] **T7.1 — Decide when the remaining workbooks are loaded.** Chemical–Trombay is in. The
  rest of the folder still needs its `fns` row and two mapping sheets per workbook. Loading them
  locally and restoring one dump is far easier to verify than running imports against production.
  *Done when:* you have chosen, and the import path is repeatable either way.

- [ ] **T7.2 — Automate backups and rehearse a restore.** ⚠️ *irreplaceable data.* Nightly
  `pg_dump` to storage off the host, with retention. Then actually restore one into a scratch
  database and confirm the view counts. An unrehearsed backup is a hypothesis.
  *Done when:* a restore drill has succeeded end to end at least once.

- [ ] **T7.3 — Set up logs, restarts and a health endpoint.** Docker restart policy
  `unless-stopped`, log rotation so `LOG_LEVEL=info` cannot fill the disk, and an uptime check
  against a route that touches the database.
  *Done when:* killing the app container brings it back, and an outage reaches you.

- [ ] **T7.4 — Write down the rollback.** Tag every image with a version rather than relying on
  `latest`, so rollback is redeploying the previous tag plus, if a migration ran, restoring the
  pre-upgrade dump. One page in the README.
  *Done when:* the procedure is written and the previous tag is known to still exist.

---

## Keeping this file current

As tasks complete, tick their boxes here (`- [x]`) so the next `/deploy-prep` invocation can
tell where the work stands without re-deriving it.
