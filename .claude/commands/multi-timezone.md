---
description: Finish multi-timezone support after deployment — per-user timezones, migrations, and the latent bugs found during T3.4
---

# Multi-timezone rollout

**Run this after the application is deployed and stable**, when users outside
India are actually coming, or sooner if the Phase A bugs start showing.

`T3.4` in [deploy-prep.md](deploy-prep.md) deliberately stopped at groundwork:
it separated the process timezone from the business timezone and isolated all
timezone anchoring into one function, with no schema change. This command
finishes the job.

## How to run this command

1. Work out where things stand — check whether `users.timezone` exists, whether
   `ReminderService.anchorCalendarDate` is still called without a zone argument,
   and whether the Phase A fixes have landed.
2. Report the current position: which tasks are done, which is next.
3. If `$ARGUMENTS` names a phase or task (`phase A`, `M2.1`), start there.
4. Do the next task, verify its "done when", then stop and report.

## The standing constraint

**India-based users must see no change.** Every step defaults to
`APP_TIMEZONE` (currently `Asia/Kolkata`), so a user who never sets a timezone
behaves exactly as today. Phase C exists to prove that.

## Background: the two kinds of time in this schema

Established by investigation on 2026-09-27. Worth reading before changing
anything, because the instinct to "store everything as UTC timestamps" would
break the second category.

**Instants — 78 `timestamptz` columns.** `created_at`, `submitted_at`,
`started_at`, `next_scheduled_at`. A moment that happened. Correctly typed,
already timezone-safe. Comparisons against `DateTime.now()` throughout the
services are instant-vs-instant and need no change.

**Calendar dates — 8 `date` columns.**

```
users.date_of_joining          dp_action_plans.start_date
users.last_role_change         dp_action_plans.milestone_1_date
emp_data.date_of_joining       dp_action_plans.milestone_2_date
emp_data.last_role_change      dp_action_plans.completion_date
```

"Joined on 15 June" is the same day wherever it is read. These are **correctly**
`date` and must stay that way. **Do not convert them to `timestamptz`** — a
London viewer would see joining dates slip to the 14th. They serialize to the
API as plain `"2014-04-25"` strings, which is right.

The only place the two categories meet is where a calendar date must become an
instant, for scheduling. That is `ReminderService.anchorCalendarDate`, and it is
the seam this whole command plugs into.

---

## Phase A — Fix what is already wrong (no schema change)

These are latent today because every user is in one zone. They are bugs now, not
consequences of going multi-timezone.

- [ ] **M1.1 — Learning period labels are formatted in the process timezone.**
  ⚠️ *user-visible off-by-one.*
  `LearningPeriodService.formatPeriodLabel` does
  `startedAt.toFormat('dd LLL yyyy')` on a `timestamptz` value. Lucid hands
  those over in the **process** zone, which `T3.4` fixed to UTC — so a period
  started at 03:00 IST (21:30 UTC the previous day) is labelled
  "Period 31 Mar 2026 onwards" when the user started it on 1 April.

  Affects any period created between 00:00 and 05:30 IST. Checked against live
  data on 2026-09-27: **0 of 3 rows currently affected**, so this is latent, not
  yet wrong on screen — but it will bite silently and the label is stored in
  user-facing text.

  Fix: format in `APP_TIMEZONE` (later, the user's own zone) via
  `.setZone(...)` before `toFormat`. Then audit for the same mistake anywhere
  else an instant is rendered server-side rather than by the Angular pipe:
  `grep -rn "toFormat\|toLocaleString" app/`.
  *Done when:* a period started at 03:00 IST is labelled with that day, and
  existing labels are checked for rows needing correction.

- [ ] **M1.2 — Decide what a learning period's boundaries mean.**
  `learning_periods.started_at` and `ended_at` are `timestamptz` — instants. If a
  learning period is conceptually "1 April to 31 March", they are calendar dates
  wearing the wrong type, and every boundary comparison will drift by the offset
  for users in other zones. If it genuinely starts the moment an org admin
  clicks the button, `timestamptz` is right and only the *label* (M1.1) was
  wrong.

  This is a product question, not a technical one. Answer it before Phase B,
  because the answer decides whether a migration is needed here.
  *Done when:* the intended meaning is written down, and the column type either
  confirmed correct or migrated with a plan for existing rows.

- [ ] **M1.3 — Set the Postgres container timezone deliberately.**
  Carried over from `T4.2`. The database session zone is `Asia/Kolkata` while the
  app runs UTC. Harmless for `timestamptz` correctness — it only changes how
  psql prints values — but it makes every manual query ambiguous during an
  incident. Set it to UTC to match the app, and note it in the README.
  *Done when:* `show TimeZone` in the deployed database matches the documented
  intent.

---

## Phase B — Per-user timezones (schema)

- [ ] **M2.1 — Add `users.timezone`.**
  Nullable `varchar`, no default. **Nullable rather than defaulting to
  `'Asia/Kolkata'` on purpose**: null means "not chosen, follow
  `APP_TIMEZONE`", which keeps one source of truth and lets the org-wide default
  be changed later without rewriting every row. A column defaulted at migration
  time freezes today's answer into data.

  Validate on write against the IANA database (`Intl.DateTimeFormat` throws for
  unknown zones — the same check `start/env.ts` uses for `APP_TIMEZONE`), so a
  bad value cannot reach a row.
  *Done when:* the migration applies and rolls back cleanly, existing rows are
  null, and invalid zones are rejected at the API.

- [ ] **M2.2 — Schedule reminders in the recipient's timezone.**
  `anchorCalendarDate(date, zone)` already takes the zone parameter — this is
  the payoff from `T3.4`. The work is deciding *whose* zone, which is a product
  question the code cannot answer: a reminder can go to the employee, the
  manager, or both (`recipientList`), and they may be in different zones.

  Options, in increasing order of effort: use the employee's zone for all
  recipients; use the action plan owner's; or split into one scheduled job per
  recipient. The third is the only one that is actually correct for "both", and
  it changes the job model — `dp_reminders` currently holds a single
  `next_scheduled_at`.
  *Done when:* the chosen rule is documented, and a reminder for a user in
  `America/New_York` fires at `REMINDER_SEND_HOUR` **New York time**.

- [ ] **M2.3 — Expose timezone in the UI.**
  A profile setting, defaulting to "Organisation default (`APP_TIMEZONE`)"
  rather than preselecting a zone — so the null state is visible and meaningful.
  Consider detecting the browser zone with
  `Intl.DateTimeFormat().resolvedOptions().timeZone` and *offering* it, never
  silently saving it.
  *Done when:* a user can set and clear their timezone, and clearing it returns
  them to the organisation default.

- [ ] **M2.4 — Consider an organisation-level timezone.**
  `users.co_id` and `emp_data.co_id` already exist. If one deployment serves
  organisations in different countries, the resolution order wants to be
  **user → organisation → `APP_TIMEZONE`**, and `APP_TIMEZONE` becomes only the
  final fallback. Skip this if the deployment is single-organisation; do it
  before onboarding a second country, not after.
  *Done when:* decided, and the resolution order is implemented and documented
  as one function.

- [ ] **M2.5 — Decide what happens to reminders already scheduled.**
  `T3.4` changed the anchor from accidental midnight to `REMINDER_SEND_HOUR`,
  and existing rows keep their old `next_scheduled_at` until their action plan
  is next edited. At the time it was harmless — both rows were in the past and
  pg-boss had no queued jobs — but after deployment there will be future
  reminders, and each of Phase B's changes moves the anchor again.

  Either recalculate in a data migration, or leave them and accept that older
  reminders fire at the old hour. Recalculating is only safe if `remind_ref`,
  `remind_days` and `remind_before_after` are all still present on the row —
  check before assuming.
  *Done when:* the decision is recorded, and if recalculating, the migration is
  rehearsed against a restored dump rather than run first on production.

---

## Phase C — Verification

- [ ] **M3.1 — Prove India is unaffected.**
  The standing constraint. With `users.timezone` null everywhere, reminder
  instants, period labels and displayed dates must be identical to before
  Phase B. Compare against a restored pre-change dump.
  *Done when:* a row-level comparison of computed reminder times shows no
  change for null-timezone users.

- [ ] **M3.2 — Multi-zone matrix.**
  For `Asia/Kolkata`, `Europe/London`, `America/New_York` and `Pacific/Auckland`
  (southern-hemisphere DST, so it moves the opposite way): a calendar date
  anchors to `REMINDER_SEND_HOUR` local, and the **calendar day does not
  shift**. This was verified for the first three during `T3.4`; redo it with
  per-user zones in play.
  *Done when:* all four pass, including the day-preservation check.

- [ ] **M3.3 — DST boundary.**
  A monthly repeating reminder crossing a clock change must keep its local hour.
  `T3.4` fixed and verified this for the global zone — zone-aware arithmetic
  held 09:00 where naive UTC arithmetic drifted to 10:00. Re-verify per-user,
  and add the southern-hemisphere direction.
  *Done when:* local send hour is stable across spring-forward and fall-back in
  both hemispheres.

- [ ] **M3.4 — Add regression tests.**
  None of the above is covered by the current suite — `node ace test` is two
  functional spec files and touches none of this. At minimum: anchoring in three
  zones, day-preservation, DST repeat stability, and null-timezone fallback.
  *Done when:* the tests exist and fail if `anchorCalendarDate` loses its zone
  argument.

---

## Already verified safe — do not "fix" these

Checked on 2026-09-27. Each looks like a timezone bug and is not. Changing them
would *introduce* the bug.

- **Angular's `| date` pipe with date-only strings.** `"2014-04-25"` is not
  parsed as UTC midnight. Angular's `toDate` special-cases pure date strings and
  builds a **local** date, so the calendar day is preserved in every browser
  zone. Plain `new Date("2014-04-25")` *would* be UTC midnight and would display
  the previous day anywhere west of UTC — which is why the pipe must keep being
  used instead of manual parsing.

- **`web/src/app/development-planning/reminder-utils.ts`.** `parseReminderDate`
  appends `T12:00:00`, parsing as **local noon**. That is a deliberate
  anti-off-by-one guard: no real UTC offset can move midday across a date
  boundary. Leave it.

- **The 78 `timestamptz` columns and every `DateTime.now()` comparison.**
  Instant-vs-instant, zone-independent. `password_reset` expiry, learning-period
  cooldowns and reminder due checks are all correct as written.

- **`date` columns serializing as `"YYYY-MM-DD"`.** Correct. Do not "normalise"
  them to ISO instants.
