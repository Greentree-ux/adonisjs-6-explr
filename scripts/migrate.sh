#!/usr/bin/env bash
#
# Apply database migrations to a deployed stack — the one documented way.
#
#   ./scripts/migrate.sh                          # uses ./.env, as on the server
#   ./scripts/migrate.sh --env-file .env.docker   # local stack
#
# Run this BEFORE starting or upgrading the application. Migrations are
# deliberately absent from the container entrypoint (T4.3): schema change is a
# deliberate, observed step, not a side effect of a container restart.
#
# The script does three things that must happen together, because skipping any
# one of them fails silently:
#
#   1. Takes a pg_dump first. That dump, plus the previous image tag, IS the
#      rollback procedure (T7.4). `migration:rollback` is NOT — see below.
#
#   2. Passes --force. Without it, `migration:run` in production auto-answers
#      its own confirmation prompt with "no", applies NOTHING, and exits 0.
#      Measured on 2026-09-30: zero tables created, exit code 0. A deploy step
#      that checks $? would report success having done nothing.
#
#   3. Counts applied migrations afterwards and compares them with the number
#      of migration files in the image. This is the check that catches the
#      failure in (2), because the exit code cannot.
#
# ---------------------------------------------------------------------------
# What this script deliberately does NOT do
# ---------------------------------------------------------------------------
# It never rolls back. On a fresh database all migrations are applied in a
# SINGLE batch, and `migration:rollback` with no argument rolls back the last
# batch — measured, that took a freshly migrated database from 34 tables and 3
# materialized views down to 2 bookkeeping tables and none. Every migration
# implements a destructive down(), so nothing softens it, and the lost
# materialized views are the application's read path, so the symptom is an API
# returning empty results rather than an error.
#
# To undo a deployment, restore the dump this script took and redeploy the
# previous image tag. If you ever genuinely need `migration:rollback`, pass an
# explicit --batch or --step and take a fresh dump first.
#
# `migration:fresh`, `migration:reset` and `migration:refresh` are not used
# here and should not be. `fresh` drops every table.
# ---------------------------------------------------------------------------

set -euo pipefail

ENV_FILE=".env"
BACKUP_DIR="./backups"
SKIP_DUMP=0

usage() {
  sed -n '2,45p' "$0" | sed 's/^#\{1,2\} \{0,1\}//'
  cat <<'USAGE'

Options:
  --env-file PATH     Environment file for Compose and the container (default: .env)
  --backup-dir PATH   Where the pre-migration dump is written (default: ./backups)
  --skip-dump         Skip the dump. Only for a database you are willing to lose.
  -h, --help          This message
USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    --env-file)   ENV_FILE="${2:?--env-file needs a path}"; shift 2 ;;
    --backup-dir) BACKUP_DIR="${2:?--backup-dir needs a path}"; shift 2 ;;
    --skip-dump)  SKIP_DUMP=1; shift ;;
    -h|--help)    usage; exit 0 ;;
    *)            echo "error: unknown argument '$1' (try --help)" >&2; exit 2 ;;
  esac
done

cd "$(dirname "$(readlink -f "$0")")/.."

[ -f "$ENV_FILE" ] || { echo "error: environment file '$ENV_FILE' not found" >&2; exit 1; }

compose() { docker compose --env-file "$ENV_FILE" "$@"; }

# psql helper. -tA gives a bare value with no header or padding, so the result
# can be compared as a number.
db_query() { compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -tAc "$1"; }

# Number of applied migrations, or 0 when adonis_schema does not exist yet.
#
# This cannot be done as one query with a CASE guard: Postgres parses and plans
# the whole statement before evaluating anything, so naming a missing relation
# in a branch that would never run still fails at parse time. Hence the
# separate existence check.
applied_count() {
  if [ "$(db_query "select to_regclass('public.adonis_schema') is not null")" = "t" ]; then
    db_query "select count(*) from adonis_schema"
  else
    echo 0
  fi
}

step() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

# ---------------------------------------------------------------------------
step "1/5  Bringing the database up"
# ---------------------------------------------------------------------------
# Only the database. The application is deliberately not started: migrating
# before the app boots is the entire point of running this separately.
compose up -d db

container="$(compose ps -q db)"
[ -n "$container" ] || { echo "error: no 'db' service. Managed Postgres? See README." >&2; exit 1; }

printf 'waiting for the database to become healthy'
for _ in $(seq 1 60); do
  [ "$(docker inspect -f '{{.State.Health.Status}}' "$container")" = "healthy" ] && break
  printf '.'; sleep 2
done
echo
[ "$(docker inspect -f '{{.State.Health.Status}}' "$container")" = "healthy" ] \
  || { echo "error: database did not become healthy" >&2; exit 1; }

# Read the credentials from the running container rather than parsing the env
# file. It is authoritative, and it sidesteps dotenv syntax the shell would
# read differently from Compose.
DB_USER="$(docker exec "$container" printenv POSTGRES_USER)"
DB_NAME="$(docker exec "$container" printenv POSTGRES_DB)"
echo "database '$DB_NAME' as '$DB_USER' is ready"

# ---------------------------------------------------------------------------
step "2/5  Recording the current state"
# ---------------------------------------------------------------------------
applied_before="$(applied_count)"
echo "migrations already applied: $applied_before"

# ---------------------------------------------------------------------------
step "3/5  Taking a pre-migration dump"
# ---------------------------------------------------------------------------
if [ "$SKIP_DUMP" -eq 1 ]; then
  echo "SKIPPED by --skip-dump. There is no way back from this migration."
else
  mkdir -p "$BACKUP_DIR"
  stamp="$(date +%Y%m%d-%H%M%S)"
  dump="$BACKUP_DIR/${DB_NAME}-pre-migration-${stamp}.dump"

  # Custom format (-Fc): compressed, and restorable selectively with pg_restore.
  # The same format T0.2 verified a restore from.
  compose exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$dump"

  size="$(stat -c%s "$dump")"
  [ "$size" -gt 0 ] || { echo "error: dump is empty, refusing to migrate" >&2; exit 1; }

  # Recorded alongside so a later restore can prove it is reading the same
  # bytes that were written here. Stored as a bare filename, generated from
  # inside the directory, so `sha256sum -c` still works after T7.2 copies the
  # dump somewhere else — a repo-relative path would only verify from the
  # repository root.
  ( cd "$BACKUP_DIR" && sha256sum "$(basename "$dump")" > "$(basename "$dump").sha256" )
  echo "wrote $dump ($size bytes)"
  [ "$applied_before" -eq 0 ] && echo "note: database was empty, so this dump is a formality"
fi

# ---------------------------------------------------------------------------
step "4/5  Applying migrations"
# ---------------------------------------------------------------------------
# --no-deps because the database is already up and healthy; without it Compose
# would try to start the app's dependencies again.
#
# --force is REQUIRED. See the header: without it this exits 0 having done
# nothing at all.
compose run --rm --no-deps -T app node ace migration:run --force

# ---------------------------------------------------------------------------
step "5/5  Verifying"
# ---------------------------------------------------------------------------
# The exit code above cannot be trusted on its own, so compare what the
# database now reports against what the image actually ships.
expected="$(compose run --rm --no-deps -T app \
  sh -c 'ls database/migrations/*.js 2>/dev/null | wc -l' | tr -d '[:space:]')"

# Same safe helper: if migrations silently did nothing on a first deployment
# the table is still absent, and this must report 0 so the check below prints
# its explanation rather than a raw SQL error.
applied_after="$(applied_count)"

echo "migration files in the image: $expected"
echo "applied before:               $applied_before"
echo "applied now:                  $applied_after"

if [ "$applied_after" -ne "$expected" ]; then
  cat >&2 <<EOF

FAILED: $applied_after of $expected migrations are applied.

The migration command exited 0, so the exit code alone would have called this
a success. Do not start the application against this database. Investigate
with:

  docker compose --env-file $ENV_FILE run --rm --no-deps app node ace migration:status
EOF
  exit 1
fi

printf '\n\033[1mOK — %s migrations applied, database is up to date.\033[0m\n' "$applied_after"
[ "$SKIP_DUMP" -eq 1 ] || echo "Pre-migration dump: $dump"
echo "Start or upgrade the application now (e.g. docker compose --env-file $ENV_FILE up -d)."
