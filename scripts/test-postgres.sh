#!/usr/bin/env bash
set -Eeuo pipefail

# Rebuild a disposable local database, replay the Supabase bootstrap and every
# repository migration in filename order, then execute one pgTAP SQL file.
# No connection string or password is read or printed: local peer auth runs as
# the operating-system postgres user.

usage() {
  printf 'Usage: %s path/to/test.sql\n' "${0##*/}" >&2
}

if [[ $# -ne 1 ]]; then
  usage
  exit 64
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_file="$1"
if [[ "$test_file" != /* ]]; then
  test_file="$repo_root/$test_file"
fi

if [[ ! -f "$test_file" ]]; then
  printf 'Test file not found: %s\n' "$test_file" >&2
  exit 66
fi

bootstrap="$repo_root/supabase/tests/support/local_supabase_bootstrap.sql"
migrations_dir="$repo_root/supabase/migrations"
database="${GERIRMAIS_TEST_DB:-gerirmais_test}"

# Database names are interpolated only into command arguments, but constrain the
# value as an additional guard against accidentally targeting an unexpected DB.
if [[ ! "$database" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
  printf 'Invalid GERIRMAIS_TEST_DB name.\n' >&2
  exit 64
fi

for command in runuser dropdb createdb psql pg_prove; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$command" >&2
    exit 69
  fi
done

as_postgres() (
  cd /tmp
  exec runuser -u postgres -- "$@"
)

mapfile -t migrations < <(printf '%s\n' "$migrations_dir"/*.sql | LC_ALL=C sort)
if [[ ${#migrations[@]} -eq 0 || ! -f "${migrations[0]}" ]]; then
  printf 'No migrations found in %s\n' "$migrations_dir" >&2
  exit 66
fi

printf 'Recreating disposable database %s...\n' "$database"
as_postgres dropdb --if-exists --force "$database"
as_postgres createdb --template=template0 "$database"

printf 'Applying local Supabase bootstrap...\n'
as_postgres psql -X --set=ON_ERROR_STOP=1 --dbname="$database" < "$bootstrap" >/dev/null

printf 'Applying %d migrations in filename order...\n' "${#migrations[@]}"
for migration in "${migrations[@]}"; do
  printf '  %s\n' "${migration##*/}"
  as_postgres psql -X --set=ON_ERROR_STOP=1 --dbname="$database" < "$migration" >/dev/null
done

# /root is not traversable by the postgres OS user. Copy only the selected test
# to a short-lived readable path; the trap removes it on PASS, FAIL or signal.
tap_copy="$(mktemp /tmp/gerirmais-pgtap.XXXXXX.sql)"
trap 'rm -f "$tap_copy"' EXIT
install -m 0644 "$test_file" "$tap_copy"

printf 'Running pgTAP test %s...\n' "${test_file#"$repo_root"/}"
as_postgres pg_prove --nocolor --failures --dbname="$database" "$tap_copy"
