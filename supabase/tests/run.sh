#!/usr/bin/env bash
# Applies the migrations to a throwaway database and runs the SQL tests.
# Usage: DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres bash supabase/tests/run.sh
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$here/.."
base="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/postgres}"
db="i_events_test_$$"
psql -qX "$base" -c "create database $db" >/dev/null
trap 'psql -qX "$base" -c "drop database if exists $db with (force)" >/dev/null' EXIT
url="${base%/*}/$db"
run() { psql -qX -v ON_ERROR_STOP=1 "$url" -f "$1" >/dev/null; }
run "$here/stub_supabase.sql"
for f in "$root"/migrations/*.sql; do run "$f"; done
for f in "$root"/seed/*.sql; do run "$f"; done
run "$here/_helpers.sql"
status=0
for t in "$here"/*.test.sql; do
  if psql -qX -v ON_ERROR_STOP=1 "$url" -f "$t" >/dev/null; then
    echo "ok   $(basename "$t")"
  else
    echo "FAIL $(basename "$t")"; status=1
  fi
done
exit $status
