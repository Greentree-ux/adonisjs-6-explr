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
with Phase 2. T1.2 and T5.5 are hygiene and never block a deploy. Phase 6 needs nothing
from the codebase and can be provisioned while Phase 4 is still being written.

**Correction (2026-09-19):** T1.4 was originally filed as hygiene. It is not — the dead Vite
hook hard-blocks `node ace build`, so **T1.4 precedes T0.3** on the critical path. The real
path is `T1.4 → T0.3 → T1.1 → T1.3 → T2.1 → …`. Two further build-blocking defects surfaced
behind it (root `tsconfig.json` compiling `web/`, and an Edge-template exception handler with
no view layer); both are fixed and recorded under T0.3.

**The one ordering that genuinely matters: T2.1 must land before T4.1.** Building an image
while generated bundles are still tracked produces a container serving whichever `main-*.js`
was last committed rather than the one the build just made — and because the page still
loads, the mistake surfaces as a UI that is inexplicably out of date.

---

## Phase 0 — Establish a baseline you can return to

Every later phase changes the build. Without a recorded known-good state you cannot tell
whether a Docker build failure is a Docker problem or something the repo already had.

- [x] **T0.1 — Branch the shipping work.** ✅ Done 2026-09-19. Deleted 5 stray shell-accident
  files and the loose root `.png`/`.svg` assets (backed up outside the repo), committed the
  development planner / assessment / learning period work as `402fbdc` on `main` (84 files,
  +12250), then branched `deploy-prep` and committed this checklist as `8cbac3e`.
  *Done when:* `git status` is clean on a branch that is not `main`. — clean, on `deploy-prep`.

- [x] **T0.2 — Take a durable database snapshot.** ✅ Done 2026-09-19.
  `~/db-backups/fcm1/fcm1-20260919-143801.dump` (custom format, 214 KB, sha256 recorded
  alongside). Restored into scratch db `fcm1_restore_test` with **zero errors**; all three
  matviews returned 4 / 144 / 116 for `fnid=3`, base tables matched (users 16, emp_data 106,
  tasksets 400), 34 tables + 3 matviews + 8 `pgboss` tables + 55 migrations present in both.
  Scratch db dropped after verification.
  *Done when:* the dump restores cleanly into a scratch database and `roleskills` returns 116
  rows for `fnid=3`. — verified.

- [x] **T0.3 — Record and verify the reference build.** ✅ Done 2026-09-19. Verified toolchain:
  Node 22.22.2, npm 11.7.0, PostgreSQL 16.15, Ubuntu 24.04.4. The four-step path now runs
  clean, but **three repo defects had to be fixed first** — all of them production-only, all
  masked by whichever failed earliest:
  1. the dead Vite build hook (see T1.4, pulled forward);
  2. root `tsconfig.json` had no `exclude`, so `node ace build` type-checked the Angular
     sources in `web/` as CommonJS with node types (~100 errors). Added
     `"exclude": ["node_modules","build","tmp","web"]`;
  3. `app/exceptions/handler.ts` rendered Edge templates `pages/errors/{not_found,server_error}`
     via `ctx.view` — no view layer, no templates, and gated on `app.inProduction`, so it would
     have crashed **only in production, only on a 404 or 500**. Replaced with
     `renderStatusPages = false`.

  Reference build measurements: Angular bundle `main-WI4F6RS4.js`, 558.21 kB raw / 123.98 kB
  transfer (over the 500 kB budget — warning only); `build/` receives `public/` via
  `metaFiles`; server boots with the pg-boss reminder worker; `GET /` returns the SPA (200) and
  the bundle is fetchable (558,213 bytes); `POST /api/auth/login` returns 200 with a session
  cookie that round-trips on a subsequent authenticated `GET /api/fnfnroles`.
  *Done when:* the built server boots, serves the Angular app, and a login succeeds. — all
  three verified.

## Phase 1 — Pin the toolchain

Four of these are live ambiguities in the repo today — the runtime is undeclared and two
package manifests disagree about Angular.

- [x] **T1.1 — Declare the Node version.** ✅ Done 2026-09-22. Added
  `"engines": { "node": ">=22.12 <23" }` to both `package.json` and `web/package.json`, plus a
  `.nvmrc` containing `22.22.2`.
  *Done when:* `npm ci` warns on a deliberately wrong Node version. — verified by temporarily
  inverting the range to `">=23 <24"` while running 22.22.2 (only one Node is installed, so
  the range was moved rather than the runtime); npm emitted
  `npm warn EBADENGINE ... required: { node: '>=23 <24' }, current: { node: 'v22.22.2' }`.
  Range restored; both manifests now dry-run with 0 EBADENGINE warnings.

  **Enforcement added beyond the original done-when.** `engines` alone is advisory — npm warns
  and installs anyway with exit code 0, so a server on Node 18 would print the warning, carry
  on, and fail at boot instead. Committed `.npmrc` and `web/.npmrc` with `engine-strict=true`
  (npm reads project config from the cwd only, never from parent directories, so `web/` needs
  its own copy). Verified: with the range inverted, both projects now fail with
  `npm error code EBADENGINE` and **exit 1** rather than warning; with the correct range both
  return exit 0. Also confirmed no transitive dependency's own `engines` trips the stricter
  setting — a real risk with ~830 packages across the two trees, checked rather than assumed.
  This makes T4.1's Docker build fail loudly on a wrong base image instead of producing a
  subtly broken one.

- [x] **T1.2 — Commit to npm as the only package manager.** ✅ Done 2026-09-22. Removed the
  `resolutions` (yarn) and `pnpm.overrides` blocks, keeping only npm's `overrides`. No README
  existed, so one was written — it states npm-only explicitly, with the reason (the pin resolves
  a transitive conflict under `@adonisjs/core` → `@adonisjs/bodyparser` → `file-type`), and
  documents the toolchain, the two-project layout, the frontend-before-backend build order and
  the Mailpit setup.
  *Done when:* only `overrides` remains and `npm ci` still resolves `strtok3` to 8.0.1. —
  `npm ls strtok3` reports `strtok3@8.0.1 overridden` after a clean install.

- [x] **T1.3 — Remove the duplicate Angular dependency set.** ✅ Done 2026-09-22. Re-verified
  first that nothing outside `web/` imports `@angular` (grep across `app/`, `config/`,
  `start/`, `bin/`, `database/`, `tests/`, `providers/` — no hits). Removed all five runtime
  Angular packages and `@angular/cli` + `@angular/compiler-cli` from root devDependencies.
  Also removed the orphaned `vite` devDependency — T1.4 deleted its config but left the package.
  *Done when:* `npm ci && node ace build` succeeds at the root and the Angular build is
  unaffected. — clean `npm ci` (780 packages, exit 0) then `node ace build` succeeded;
  `npm ls @angular/core` at the root is now empty, and the Angular build reproduced
  `main-WI4F6RS4.js` at 558.21 kB, the **identical content hash** as before, which is what
  proves the frontend was genuinely unaffected rather than merely still compiling.

- [x] **T1.4 — Retire the unused Vite scaffolding.** ✅ Done 2026-09-19, **pulled forward — it
  hard-blocked T0.3**, contrary to the "hygiene, never blocks a deploy" note below.
  `node ace build` died at `Could not resolve entry module "index.html"`: `adonisrc.ts` set
  `assetsBundler: false` but re-registered `onBuildStarting: [@adonisjs/vite/build_hook]` two
  lines later, and `vite.config.ts` was empty (imported `adonisjs` without calling it, no root,
  no entry), so Vite looked for a nonexistent root `index.html`. Confirmed dead before removing:
  `resources/` held 0 files, **zero `.edge` templates exist anywhere**, and no app code imported
  it. Removed the hook, the `vite_provider`, `vite_middleware` from `start/kernel.ts`,
  `vite.config.ts`, `config/vite.ts`, the empty `resources/`, and the `@adonisjs/vite`
  dependency.
  *Done when:* `node ace build` produces an identical `build/` tree without invoking Vite. —
  build completes clean.

- [x] **T1.5 — Confirm both lockfiles install from clean.** ✅ Done 2026-09-23. Deleted both
  `node_modules` trees outright and ran `npm ci` in each project: root 780 packages in 12s,
  `web/` 516 packages in 10s, **both exit 0 with no `npm install` fallback** (`npm ci` aborts
  outright when a lockfile is out of sync with its manifest, so a clean run is itself the
  proof). Both lockfiles are `lockfileVersion: 3`.

  The root lockfile absorbed the Phase 1 changes: **−5,563 / +689 lines**, with 40 removed
  entries referencing `@angular/*` or `vite` and **zero** added ones. `web/package-lock.json`
  is untouched, as it should be — the Angular project was never what changed. Both builds then
  ran from that clean install: `node ace build` reported `build completed`, and Angular again
  produced `main-WI4F6RS4.js` at 558.21 kB, the same content hash as before Phase 1 began.

  **Phase 1 is complete.**

## Phase 2 — Make the build the source of truth

Generated frontend bundles are tracked in git and the tracked copy has already diverged from
what the source produces. Until fixed, what gets deployed depends on git state rather than on
the Angular code.

- [x] **T2.1 — Stop tracking generated bundles.** ✅ Done 2026-09-23. Untracked all six files
  under `public/` and replaced the narrow `public/assets` ignore with `/public/` wholesale.

  **Deviated from the planned fix, with evidence.** The five patterns this task originally
  listed would have left `favicon.ico` tracked as a supposed source asset. It isn't:
  `public/favicon.ico` is byte-identical (md5 `05bcfe9a…`) to `web/public/favicon.ico` and is
  placed there by Angular's assets glob. More decisively, the Angular CLI **deletes the entire
  output directory before every build** — `deleteOutputPath` defaults to true, confirmed
  empirically by planting a canary file in `public/` and watching a build remove it. So a
  tracked file there cannot survive a build, and any hand-placed asset would vanish silently.
  Genuine static assets belong in `web/public/`, which Angular copies in.

  *Done when:* a fresh clone has no `public/*.js`, and the Angular build recreates the
  directory in full. — verified against an actual `git clone` of the branch: the clone contains
  **no `public/` directory at all** (0 tracked files matching it); `npm --prefix web ci &&
  npm --prefix web run build` recreated all six files **byte-for-byte identical** to the
  working copy (`diff -rq` clean); and `node ace build` in that clone then copied them into
  `build/public` via `metaFiles`. That is the same path the Docker build will take in T4.1.

- [x] **T2.2 — Add a single root build script.** ✅ Done 2026-09-23. Added
  `"build:all": "npm --prefix web ci && npm --prefix web run build && node ace build"`. Also
  normalised the neighbouring `build:web` from `cd web && npm run build` to
  `npm --prefix web run build` so both use the same idiom.
  *Done when:* `npm run build:all` from a clean tree produces a complete `build/` including
  the frontend. — verified after deleting `build/`, `public/`, `web/node_modules` and
  `web/.angular`: one command, exit 0, and `build/public` came out byte-identical to what
  Angular had just written (`diff -rq` clean).

  ⚠️ **Why this script is load-bearing, not convenience.** Running `node ace build` on its own
  — the obvious thing to do on a fresh clone, now that `public/` is gitignored (T2.1) —
  **succeeds**. It prints `[ success ] build completed` and exits 0, but `build/public` is
  simply absent, so the server boots and then 404s the SPA. There is no error to notice. The
  ordering is not a preference; the build is silently wrong without it. T4.1's Dockerfile must
  follow this same order, and should prefer `build:all` over hand-rolling the steps.

- [x] **T2.3 — Write `.dockerignore`.** ✅ Done 2026-09-24. Excludes both dependency trees, all
  build output, `.git`, secrets, docs, tooling metadata and root-level data/image files. Two
  additions beyond the original list, each for a specific reason recorded in the file:
  - **`public/`** — sending the host's Angular bundle risks the exact failure T2.1 fixed, an
    image serving whichever `main-*.js` was lying around rather than the one it built.
  - **`.env`** — must never enter a layer, since layers persist even if a later step deletes
    the file. `.env.example` is deliberately kept.

  Both `.npmrc` files are deliberately **kept** in the context, so T1.1's `engine-strict`
  enforcement applies to the image build too — a wrong base image fails at `npm ci` rather than
  at runtime.

  *Done when:* the reported Docker build context is a few megabytes, not hundreds. — **1.3 MB
  across 220 files, against 503 MB excluded** (repo total 611 MB). Docker is not installed on
  this machine, so this was *computed* rather than read off a `docker build` line: a matcher
  implementing Docker's rules (patterns relative to context root, `*` not crossing `/`, a
  matched directory pruning everything beneath it, `!` re-including).

  Then verified the stronger property — that the exclusions do not drop something the build
  needs, which spot checks cannot prove. The 220 files were materialized into an empty
  directory and built there in isolation: `npm ci` (780 packages) and `npm run build:all`
  both succeeded, producing `main-WI4F6RS4.js` at 558.21 kB and a complete `build/` with the
  frontend and entrypoint present. The context is provably sufficient.

## Phase 3 — Move deployment-specific config into the environment

Each adds a variable whose default reproduces today's local behaviour. That is what lets the
same image serve both this machine and the server. These five are independent — any order.

- [x] **T3.1 — Enable authenticated SMTP.** ✅ Done 2026-09-27. `SMTP_USERNAME` and
  `SMTP_PASSWORD` added to `start/env.ts` as optional strings; `config/mail.ts` now spreads an
  `auth` block in only when a username is present, instead of carrying it commented out. Both
  documented in `.env.example`.

  **Added a fail-fast guard:** a username with no password refuses to boot with a message naming
  both variables. Left unguarded that combination fails at *send* time, which means the app
  believes it delivered invitations, resets and reminders that never left — the worst shape this
  failure can take.

  *Done when:* mail still sends to Mailpit locally, and to a real relay with credentials set. —
  both verified for real, not by inspection. Mailpit was restarted with `--smtp-auth-file` so it
  genuinely **required** authentication, which is what makes the second half a real test rather
  than a relay politely accepting anything:

  | case | result |
  |---|---|
  | no credentials → plain relay | sent, arrived in Mailpit |
  | no credentials → auth-required relay | `530 5.7.0 Authentication required` |
  | credentials → auth-required relay | sent, arrived |
  | username, no password | refuses to boot, names both variables |

  That third row is the one that matters: it proves credentials are actually transmitted.

  **Edge case found and fixed.** `.env.example` ships `SMTP_USERNAME=` blank, and an empty value
  correctly counted as unset — but a *whitespace-only* value (a plausible half-filled template)
  tripped the guard and refused to boot, blaming `SMTP_PASSWORD` misleadingly. The username is
  now trimmed so blank-but-present means unset. The password is deliberately **not** trimmed,
  since surrounding whitespace could be significant in a generated secret.

- [x] **T3.2 — Require `APP_URL` in production.** ✅ Done 2026-09-27. Implemented as a custom
  validator on `APP_URL` in `start/env.ts` rather than a check in each controller — that is
  where a boot-time environment failure belongs, and it let all three controllers drop their
  duplicated `env.get('APP_URL', 'http://localhost:3333')` to a plain `env.get('APP_URL')`.
  The validator returns a `string`, so the call sites are type-safe without a fallback. Added to
  `.env.example`.

  The validator does three things beyond presence: falls back to `http://localhost:3333` in
  development, **rejects a malformed or non-http(s) value** (a bad URL produces broken links just
  as surely as a missing one), and **strips trailing slashes**, since every call site
  concatenates a path onto it and `https://example.com//reset-password` is what you get otherwise.

  *Done when:* a production boot without `APP_URL` refuses to start with a clear message. —
  verified, along with the surrounding matrix:

  | input | result |
  |---|---|
  | dev, unset | `http://localhost:3333` |
  | **prod, unset** | **refuses to boot, message names the variable and why** |
  | prod, set | uses it |
  | `https://x.com/` or `///` | normalised to `https://x.com` |
  | `"  https://x.com/  "` | trimmed and normalised |
  | prod, whitespace only | refuses to boot |
  | `not-a-url`, `fcm.example.com` | rejected, message shows the received value |
  | `ftp://x.com` | rejected, http/https only |

  Then proved it end to end on a **real delivered email**, not just config resolution: booted
  with `APP_URL=https://fcm.example.com/` (trailing slash deliberate), triggered
  `POST /api/auth/forgot-password`, and read the message out of Mailpit. The link was
  `https://fcm.example.com/reset-password?token=…` — correct host, single slash, no
  `localhost:3333` anywhere.

- [x] **T3.3 — Configure `trustProxy`.** ✅ Done 2026-09-27. `config/app.ts` now sets
  `trustProxy` from a new optional `TRUST_PROXY`, defaulting to `'loopback'` — today's exact
  behaviour. Documented in `.env.example`.

  **Reproduced the real failure, not a simulation.** Ran the app on `0.0.0.0` and put a proxy in
  front that reaches it over the host's LAN address `192.168.1.11`, so the peer is genuinely
  private-but-not-loopback, exactly as a sibling container is. The proxy terminated real TLS with
  a self-signed cert and sent `X-Forwarded-Proto: https` plus `X-Forwarded-For: 203.0.113.45`
  standing in for a browser:

  | | `TRUST_PROXY` unset | `TRUST_PROXY=loopback,uniquelocal` |
  |---|---|---|
  | `request.protocol()` | `http` ❌ | `https` ✅ |
  | `request.secure()` | `false` ❌ | `true` ✅ |
  | `request.ip()` | `192.168.1.11` (the proxy) ❌ | `203.0.113.45` (the client) ✅ |

  ⚠️ **Correction — this task's stated consequence does not hold for this app.** The description
  claimed the misdetected protocol leaves the session cookie "issued but never returned",
  producing a login that succeeds then bounces back to the form. Tested directly through the TLS
  proxy with `TRUST_PROXY` unset: **login returned 200, the session cookie round-tripped, and an
  authenticated follow-up request succeeded.** `secure: app.inProduction` in `config/app.ts` and
  `config/session.ts` is a *static* boolean — Adonis stamps `Secure` on the cookie regardless of
  the protocol it believes it is on — and the client genuinely is on HTTPS, so the browser
  returns it. Shield's HSTS header is sent either way, and **nothing in app code reads
  `request.protocol()` or `request.secure()`** (verified by grep).

  So the demonstrated cost of leaving this unset is **wrong client IPs wherever they are
  logged** — audit trails, rate-limit decisions, debugging. The protocol misdetection is real but
  latent; it becomes a live bug the moment any code builds an absolute URL from the request,
  redirects to HTTPS, or makes a cookie conditional on `request.secure()`. Fix it for those
  reasons — but do not trust **T6.2's** "breaks login" note as written either: what actually
  breaks login on plain HTTP is the browser refusing to *send* a `Secure` cookie, which is about
  HTTPS being present at all, not about `trustProxy`.

  **Also removed a footgun in the obvious value.** Adonis passes a `trustProxy` string straight
  to `proxyAddr.compile()`, which treats the whole string as ONE trust value — so
  `TRUST_PROXY=loopback,uniquelocal`, the natural thing to write, **threw at boot**. The list is
  now split and compiled here, with `proxy-addr` promoted from transitive to direct dependency
  (plus `@types/proxy-addr`), so the comma form behaves as it does in other frameworks.
  Validated: `loopback`, `loopback,uniquelocal`, `"loopback, uniquelocal"` (spaces trimmed) and
  `127.0.0.1,10.0.0.0/8` all boot; `not-an-ip` and `,,` fail at boot with messages naming the
  variable and the accepted forms.

  *Done when:* the app behind a proxy logs the correct client IP and issues a session cookie that
  survives a redirect. — client IP correct, session verified across requests.

- [x] **T3.4 — Decide the server timezone deliberately.** ✅ Done 2026-09-27. Scope agreed with
  the user: groundwork for multiple timezones, no schema change. Initial users are India-based,
  others will follow.

  ⚠️ **The premise was wrong, and the correction is good news.** This task said "every timestamp
  in `fcm1` is stored at `+05:30`". Actually **78 columns are `timestamptz`** — they store
  absolute instants, and `+05:30` is only how psql *renders* them because the DB session zone is
  `Asia/Kolkata`. Nothing is stored at an offset. Those 78 columns are already
  timezone-correct, and the Angular `| date` pipe already renders them in the *viewer's* zone, so
  a London user would see London times today. The display layer needed nothing.

  **The real issue was the boundary between two different kinds of value.** The other 8 columns
  are `date` — `users`/`emp_data.date_of_joining` and `last_role_change`, and the four
  `dp_action_plans` milestone dates. Those are calendar facts: "15 June" is the same day wherever
  read, and `date` is the *correct* type. Converting them to `timestamptz` would have been the
  damaging move — a London viewer would see a joining date slip to the 14th. But a reminder
  derived from one must fire at a real instant, and nothing decided which instant. Lucid handed
  the date over as midnight in the process zone, so reminders landed at midnight-in-whatever-TZ:
  the two existing rows sit at `05:30+05:30`, which is exactly **00:00 UTC**. Accidental, not chosen.

  **What changed.** Three settings that separate concerns previously conflated:

  | variable | default | role |
  |---|---|---|
  | `TZ` | `UTC` | **process** zone — instants and logs unambiguous |
  | `APP_TIMEZONE` | `Asia/Kolkata` | **business** zone — anchors calendar dates to instants |
  | `REMINDER_SEND_HOUR` | `9` | deliberate local send hour, replacing midnight |

  `APP_TIMEZONE` is validated against the IANA database at boot, so `Asia/Kolkatta` fails
  immediately instead of silently becoming UTC and shifting every reminder.
  `REMINDER_SEND_HOUR` rejects `24`, `abc` and `9.5`.

  All timezone anchoring now lives in **one function**, `ReminderService.anchorCalendarDate`,
  which already takes a zone parameter defaulting to `APP_TIMEZONE`. Adding per-user timezones
  later is a `users.timezone` column plus passing it here — not a refactor.

  Verified:

  | case | result |
  |---|---|
  | date 2026-06-15, Asia/Kolkata, h9 | `09:00+05:30` = `03:30Z`, calendar day kept |
  | same, Europe/London | `09:00+01:00` = `08:00Z`, day kept |
  | same, America/New_York, h18 | `18:00-04:00` = `22:00Z`, day kept |

  **Two ordering bugs fixed while in here.** The day offset is applied *before* anchoring, so
  "three days before the milestone" stays a statement about dates rather than about 72 hours —
  correct across a DST boundary. And repeat intervals are now computed in the business zone
  rather than on a UTC instant: for a monthly reminder crossing the UK clock change, zone-aware
  arithmetic keeps **09:00 local** where the previous code drifted to **10:00**. Invisible for
  Asia/Kolkata, which has no DST; not invisible once users span zones that do.

  **Migration risk: none here.** Existing rows keep their old midnight-UTC anchor until
  recalculated. Both are in the past and pg-boss has no queued jobs. On a system with *future*
  reminders, they would keep the old hour until their action plan is next edited — benign, but
  worth knowing rather than discovering.

  *Note for T4.2:* the DB session zone is `Asia/Kolkata` while the app runs UTC. Harmless for
  `timestamptz` correctness — it only affects how psql prints values — but confusing when
  debugging, so set the Postgres container's timezone deliberately.

  **Remaining timezone work is tracked separately in
  [multi-timezone.md](multi-timezone.md) — run `/multi-timezone` after deployment.** It carries
  per-user timezones and their migration, plus one latent bug found while investigating this
  task: `LearningPeriodService.formatPeriodLabel` formats a `timestamptz` in the process zone, so
  a period started before 05:30 IST is labelled with the previous day.

  *Done when:* a reminder scheduled for a known local time fires at that time in the container.
  — **partially verified; the container half defers to T5.3.** The scheduling logic is proven
  here: a calendar date now resolves to `REMINDER_SEND_HOUR` in `APP_TIMEZONE` and converts to the
  right UTC instant, across three zones and a DST boundary. What cannot be checked until a
  container exists is that the *deployed* process actually runs with `TZ=UTC` and that a reminder
  fires when expected end to end. **T5.3 already covers this** ("schedule a reminder and confirm
  it fires at the intended local time") — that is where this closes.

- [x] **T3.5 — Write a production `.env.example` and generate a fresh `APP_KEY`.** ✅ Done
  2026-09-27. Added `.env.production.example` as a separate, grouped template with production
  defaults — `HOST=0.0.0.0`, `NODE_ENV=production`, `LOG_LEVEL=info`, `TZ=UTC`,
  `TRUST_PROXY=loopback,uniquelocal` — and every secret left blank with the reason it matters
  beside it. `.env.example` stays the development template.

  **`APP_KEY` is deliberately blank, not pre-generated.** A committed example containing a real
  key is a key people will actually deploy. The file carries the command instead
  (`node ace generate:key --show`). Generation was exercised with `--show` specifically so the
  dev `.env` was not rewritten — the plain command writes into `.env` and would have invalidated
  every existing local session. Verified by md5 that `.env` was untouched.

  **Audited rather than eyeballed.** Compared `start/env.ts` against both templates
  programmatically, and separately compared every `env.get()` call site against the schema.
  Three findings:

  1. ⚠️ **`APP_NAME` was read but never validated.** `config/logger.ts` does
     `env.get('APP_NAME')`, yet it was absent from the schema *and* from `.env.example` — so a
     setup from the template produced log lines with **no service name**, invisible locally and
     unhelpful in aggregated production logs. Now declared with a default (not required, so an
     existing `.env` without it still boots) and present in both templates.
  2. **`MAIL_FROM_ADDRESS` / `MAIL_FROM_NAME` were validated but undocumented.** Added to both.
     Production needs them: the fallback `noreply@example.com` is rejected by real relays as an
     unverified sender, and that bounce reads like a credentials fault.
  3. **`DB_CONNECTION=pg` was documented but dead.** `config/database.ts` hardcodes
     `connection: 'postgres'`; nothing reads the variable. Removed, with a comment saying why, so
     nobody sets `mysql` and waits for an effect. (`mysql2` is still an unused dependency — not
     removed here, worth a look at some point.)

  *Done when:* the file lists every variable `start/env.ts` validates, with no real secrets
  committed. — both templates cover all **23** validated variables (plus `TZ`, correctly
  unvalidated since Node reads it directly, before `.env` is even loaded). Secret scan clean: all
  secret-bearing fields blank, and neither template contains the real dev `APP_KEY` or
  `DB_PASSWORD`.

  **Proved the template actually works**, rather than only that it is complete: filled its blanks
  with local values, swapped it in as `.env`, and booted — the app came up in production mode on
  `0.0.0.0:3404` with the pg-boss worker started and `GET /` returning 200. That is what caught
  the missing `APP_NAME`, since the log line came out without its name field. The real `.env` was
  restored immediately afterwards and verified byte-identical by md5.

  **Phase 3 is complete.**

## Phase 4 — Containerize

A transcription of the verified Phase 0 build path, each runtime pinned by major version so
the server cannot substitute its own.

- [x] **T4.1 — Write the multi-stage Dockerfile on Debian, not Alpine.** ✅ Done 2026-09-28.
  Three stages on `node:22-bookworm-slim` exactly as specified: `web-build` compiles Angular
  into `/app/public`, `server-build` runs `node ace build`, and a clean `runtime` stage takes
  only `build/` plus `npm ci --omit=dev`, with `CMD ["node", "bin/server.js"]`.

  **Docker is installed on this machine now (29.8.1), unlike at T2.3** — so everything below is
  measured against real builds and a running container rather than computed.

  Four things the task description did not anticipate, each of which would have produced a
  broken or subtly wrong image:

  1. **The Angular output path escapes its own project.** `web/angular.json` sets
     `outputPath.base` to `../public`, so the bundle lands *outside* `web/`. The host layout
     has to be reproduced in the stage (`WORKDIR /app/web`, not `/app`) or the build writes to
     a directory the next stage never looks at.
  2. **`node ace build` does not copy `.npmrc` into `build/`.** The runtime `npm ci --omit=dev`
     would therefore have run *without* T1.1's `engine-strict`, quietly undoing the enforcement
     on the one install that ends up in the shipped image. Copied in explicitly.
  3. **`HOST` must be `0.0.0.0` in the image.** The development default binds loopback inside
     the container's own network namespace, which is unreachable from outside it — the app
     looks healthy in its logs and refuses every connection.
  4. **`TZ=UTC` is baked in**, per T3.4's decision. The business timezone stays a separate
     runtime concern (`APP_TIMEZONE`), which is the separation that task established.

  Migrations are deliberately **not** in the entrypoint — that is T4.3, and the comment in the
  Dockerfile says so, so nobody helpfully adds them later.

  *Done when:* `docker build` succeeds from a clean clone and the image runs
  `node bin/server.js`. — both verified, against an actual `git clone` of the branch built with
  `--no-cache`:

  | check | result |
  |---|---|
  | clean clone, `--no-cache` build | succeeds; context **1.36 MB**, matching T2.3's computed 1.3 MB |
  | Angular bundle inside the image | `main-WI4F6RS4.js`, md5 `23f78905…` — **identical to the reference build** |
  | `node bin/server.js` | `started HTTP server on 0.0.0.0:3333`, pg-boss worker started |
  | `GET /` | 200, the SPA index |
  | `GET /main-WI4F6RS4.js` | 200, 558,213 bytes |
  | `pgboss` schema | 8 tables created in the throwaway database |
  | wrong base image (`node:20`) | both `npm ci` stages fail `EBADENGINE`, exit 1, **no image produced** |
  | secrets | no `.env*` in the image |
  | process user | uid 1000 (`node`), not root |
  | `SIGTERM` | exits in 1.4 s, not Docker's 10 s kill timeout |

  That bundle md5 is the line that matters: it proves the image built its own frontend and got
  byte-for-byte what the source produces, which is precisely the failure mode T2.1 was fixed to
  prevent. The `node:20` row proves T1.1's `engine-strict` does the job it was added for — a
  wrong base image fails loudly at install instead of producing a subtly broken image.

  The dev database on `127.0.0.1:5432` was never touched: the boot test ran against a throwaway
  `postgres:16` container on its own network, removed afterwards. Both test images were deleted.
  No graceful-shutdown shim (`tini`/`dumb-init`) is needed — Adonis handles `SIGTERM` as PID 1,
  which the 1.4 s stop demonstrates.

  ⚠️ **Finding for follow-up — the runtime image is 630 MB, and ~107 MB of that is dead weight.**
  `node_modules` in the *production* image is 230 MB, of which `@swc/core` is 107 MB — it ships
  **both** native variants, `core-linux-x64-gnu` (48 MB) and `core-linux-x64-musl` (59 MB).
  Nothing at runtime uses it. It arrives because **`ts-node` sits in the root `dependencies`,
  not `devDependencies`**, and pulls `@swc/core` and `typescript` in as peers. The built
  entrypoint does not need it: `build/ace.js` is rewritten by the assembler to a bare
  `await import('./bin/console.js')` and **never registers the `ts-node/esm` hook** — only the
  dev-time root `ace.js` does. (`@adonisjs/assembler` and `typescript` are also present but
  legitimately so: `@adonisjs/core` declares the assembler as a regular dependency, which is
  upstream's choice, not this repo's.)

  Not changed here. Moving a dependency between sections is a Phase 1 concern, it changes the
  root lockfile, and it needs its own clean `npm ci` plus a rebuild to confirm nothing at
  runtime reaches for `ts-node` — which is work with its own verification, not a footnote to
  this task. The image is correct as it stands; it is merely fatter than it needs to be.

- [x] **T4.2 — Compose the app with a pinned `postgres:16`.** ✅ Done 2026-09-29. Added
  `compose.yaml` (three services — `db` on `postgres:16`, `app` built from T4.1's Dockerfile,
  `caddy` on `caddy:2-alpine`) and a `Caddyfile`. Named volumes `pgdata`, `caddy_data` and
  `caddy_config`; a TCP healthcheck on the database; `depends_on: condition: service_healthy`
  gating the app.

  **The healthcheck needed `-h 127.0.0.1`, and that turned out to be load-bearing rather than
  stylistic.** On first run the postgres entrypoint starts a *temporary* bootstrap server that
  listens on the unix socket only. The obvious `pg_isready -U … -d …` talks to that socket, so
  it reports "accepting connections" during initialisation — the healthcheck would pass,
  `depends_on` would release the app, and the temporary server would then be shut down and
  restarted underneath it. Measured rather than assumed, with a 20-second init script:

  | during init | `pg_isready` (socket) | `pg_isready -h 127.0.0.1` |
  |---|---|---|
  | t=6s | **accepting** ❌ | refused ✅ |
  | t=9s | **accepting** ❌ | refused ✅ |
  | t=12s | **accepting** ❌ | refused ✅ |
  | t=18s (init done) | accepting | accepting ✅ |

  So the socket form is wrong for exactly the window the healthcheck exists to cover.

  **Other decisions worth recording.**
  - **Postgres timezone set deliberately**, closing T3.4's note: `-c timezone=UTC -c
    log_timezone=UTC` as explicit server flags rather than relying on whatever the OS TZ was at
    `initdb` time. It changes nothing about correctness — the 78 `timestamptz` columns store
    absolute instants either way — only that psql now prints the same instants the app logs.
  - **Neither 5432 nor 3333 is published.** Caddy is the only ingress, so the proxy cannot be
    bypassed, and the container's Postgres cannot collide with the development one on the host.
    Maintenance goes through `docker compose exec db psql`.
  - **Database credentials interpolate from the app's own `DB_*` variables** into `POSTGRES_*`,
    so the two cannot drift into "password authentication failed". Each uses `${VAR:?message}`,
    which fails before anything starts.
  - **The app healthcheck uses Node's global `fetch`.** `node:22-bookworm-slim` has neither
    curl nor wget, and adding one purely for a healthcheck would be a dependency for its own
    sake.
  - **`HOST` and `TRUST_PROXY` are pinned in the service rather than left to the env file**,
    because both fail invisibly: the wrong `HOST` gives a 502 with a clean application log, and
    the default `TRUST_PROXY=loopback` silently logs Caddy's address as every client's IP,
    since a sibling container is not loopback.
  - Managed Postgres (T6.4) stays available: drop the `db` service and its `depends_on`, point
    `DB_HOST` at the provider. Noted in the file.
  - Migrations are deliberately absent from every service (T4.3), with a comment saying so, so
    that nobody helpfully adds them to the entrypoint later.

  ⚠️ **Compose interpolation and container environment are two different mechanisms**, and
  conflating them is easy. `--env-file` sets what Compose substitutes into `compose.yaml`;
  `env_file:` sets what exists inside the container. On the server they coincide, because `.env`
  *is* the production file (T6.3) and `docker compose up -d` needs no flags. Locally they must
  not, or the stack would consume the development `.env`. `env_file: ${ENV_FILE:-.env}` ties the
  two together so one flag is enough:

  ```
  cp .env.production.example .env.docker   # fill in; set ENV_FILE=.env.docker, DB_HOST=db
  docker compose --env-file .env.docker up -d
  ```

  `.env.docker` was added to **both** `.gitignore` and `.dockerignore` — it holds the same
  secrets as `.env`, so it must reach neither git nor an image layer.

  ⚠️ **Found while testing: the development `.env` is not parseable by Compose.** Line 16 is a
  comment missing its `#` (`For local development, you can use Mailpit or similar:`). Adonis's
  dotenv reader ignores the line; Compose rejects the whole file with `unexpected character ","
  in variable name`, and then proceeds with **no variables at all**. Left alone — it is the
  developer's gitignored local file and the documented workflow never has Compose read it — but
  the failure mode matters if the same slip ever reaches a production `.env`. It degrades safely
  here: the `${VAR:?}` guards turn "no variables" into an immediate error naming each missing
  one, rather than a database quietly created with unintended credentials. Verified by running
  Compose against `.env.production.example`, whose deliberately blank values produce exactly
  that, naming `DB_USER`, `DB_PASSWORD` and `DB_DATABASE`.

  ⚠️ **Non-standard published ports change the redirect target.** Caddy's automatic HTTP→HTTPS
  redirect names the canonical port, so locally `http://localhost:8080/` returns 308 to
  `https://localhost/`, not `https://localhost:8443/`. Correct on the server, where the ports
  *are* 80 and 443; locally, request the HTTPS URL directly. Noted in `compose.yaml` so T5.3
  does not read it as a bug.

  *Done when:* `docker compose up` brings up all three and the app connects. — verified:

  | check | result |
  |---|---|
  | `docker compose up -d` | all three up; ordering visible as `db Waiting → db Healthy → app Started` |
  | **the app connects** | pg-boss created its **8 tables** in the container's Postgres — a real authenticated connection, not just a boot |
  | database timezone | `timezone` and `log_timezone` both `UTC` |
  | HTTPS through Caddy | 200 over HTTP/2, certificate **validated against Caddy's internal CA root** (`ssl_verify_result=0`), not `--insecure` |
  | Angular bundle through the proxy | 200, 558,213 bytes |
  | named volume for Postgres data | marker row written → `docker compose down` → `up` → **row still present** |
  | healthchecks | `app` and `db` both report `healthy` |
  | missing `DB_*` | Compose refuses to start and names each variable |
  | secrets | no `.env*` inside the built image |
  | development untouched | dev `.env` md5 unchanged (`02c6d37c…` before and after); container 5432 unpublished, the development Postgres was never contacted |

  Validating the certificate against Caddy's own root rather than passing `--insecure` is what
  makes the HTTPS row meaningful — it proves TLS termination genuinely works, which is what
  T5.3's login and session checks will depend on.

  Afterwards the stack was taken down with `down -v` and the test image removed, so no
  throwaway state remains. `.env.docker` is left in place for T5.1.

- [x] **T4.3 — Run migrations as an explicit one-off.** ✅ Done 2026-09-30. Added
  **`scripts/migrate.sh`** as the one documented command, and a **Database migrations** section
  in the README covering it, the rollback position and the managed-Postgres variation. Nothing
  in the image or in `compose.yaml` touches the schema. There are 55 migrations (verified
  against `adonis_schema` on 2026-09-19; the artifact's "59" is stale).

  The script does three things that have to happen together, because each one fails silently
  on its own: it takes a `pg_dump` into `backups/` with a checksum beside it, applies
  migrations with `--force`, and then **verifies by counting** applied migrations against the
  migration files in the image. It refuses to report success unless those match.

  **That count is the whole point, because the exit code is useless here.** Measured
  2026-09-30: in production, non-interactively, `migration:run` *without* `--force`
  auto-answers its own prompt with "no", creates **0 tables**, and exits **0**. A deploy step
  checking `$?` would report success having done nothing.

  ⚠️ **And the application would look fine.** Booted against a completely unmigrated database,
  the app container reaches **`healthy`** — the healthcheck serves the SPA and never touches
  Postgres. So the silent no-op produces a green stack serving a UI whose every API call comes
  back empty. That is worth carrying into **T7.3**, which already calls for an uptime check
  "against a route that touches the database" — this is the concrete reason why.

  **On rollback, recorded in the README rather than left to memory:** `migration:rollback` is
  *not* the rollback procedure. On a fresh database all 55 migrations occupy a single batch and
  the bare command rolls back the last batch — measured, that took 34 tables and 3 materialized
  views down to 2 bookkeeping tables and none. Recovery is restoring the dump this script took
  plus redeploying the previous image tag (T7.4). `migration:fresh`, `reset` and `refresh` are
  documented as not used.

  *Done when:* a documented command applies migrations and the app image never mutates schema.
  — both verified against a throwaway Compose database:

  | check | result |
  |---|---|
  | fresh, empty database | 0 → **55** applied, exit 0, dump written |
  | re-run, already current | 55 → 55, exit 0 — idempotent |
  | migration genuinely fails | **exit 1**, dump already taken, error surfaced, no false success |
  | dump integrity | `sha256sum -c` verifies |
  | **app image mutates schema?** | booted against an empty database: **0 application tables, no `adonis_schema`, 0 matviews** |
  | runtime migrator | no code in `app/`, `bin/`, `start/`, `config/` or `providers/` invokes it |

  **One honest exception to "never mutates schema":** pg-boss creates its own `pgboss` schema
  (8 tables) at runtime, outside the migration system. That is the job system's own
  bookkeeping, not application schema, and it is why a `migration:rollback` would strip the app
  schema while leaving the job schema behind.

  **Two defects found and fixed while writing the script**, both of which would have made it
  fail in exactly the situation it exists for:
  1. The "count applied migrations, tolerating a missing table" query was written as one
     statement with a `CASE` guard. Postgres parses and plans the whole statement before
     evaluating anything, so naming a missing relation in a branch that never runs **still
     fails at parse time** — the script died on its first run against a first deployment, the
     one case the guard was for. Split into an existence check followed by the count.
  2. The checksum sidecar recorded a repo-relative path, so `sha256sum -c` only verified from
     the repository root — useless once **T7.2** copies dumps off the host. Now written from
     inside the backup directory as a bare filename.

  `backups/` is excluded from git and from the Docker build context; the dumps hold the full
  production dataset.

  ⚠️ **Scope limit:** the script expects the `db` service from `compose.yaml`, which is also
  where it gets `pg_dump` — the app image has no Postgres client. For managed Postgres (T6.4)
  the README documents the manual path instead: the provider's snapshot, then
  `docker compose run --rm --no-deps app node ace migration:run --force`, then confirming the
  count. Not abstracted, because T6.4 is still an open decision and guessing at its shape would
  have meant writing untested code.

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
