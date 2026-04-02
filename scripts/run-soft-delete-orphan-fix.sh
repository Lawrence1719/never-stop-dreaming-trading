#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
SQL_FILE="${ROOT_DIR}/supabase/migrations/045_fix_orphaned_records_and_soft_delete.sql"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

if [[ ! -f "${SQL_FILE}" ]]; then
  echo "Missing ${SQL_FILE}" >&2
  exit 1
fi

read_env_value() {
  local key="$1"
  awk -F= -v search_key="$key" '
    $0 ~ "^[[:space:]]*" search_key "[[:space:]]*=" {
      value = substr($0, index($0, "=") + 1)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      print value
      exit
    }
  ' "${ENV_FILE}"
}

SUPABASE_URL="$(read_env_value "NEXT_PUBLIC_SUPABASE_URL")"
DATABASE_PASSWORD="$(read_env_value "DATABASE_PASSWORD")"

if [[ -z "${SUPABASE_URL}" || -z "${DATABASE_PASSWORD}" ]]; then
  echo "NEXT_PUBLIC_SUPABASE_URL or DATABASE_PASSWORD is missing from .env" >&2
  exit 1
fi

PROJECT_REF="${SUPABASE_URL#https://}"
PROJECT_REF="${PROJECT_REF%%.*}"
DATABASE_URL="postgresql://postgres:${DATABASE_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres?sslmode=require"

echo "Running one-time soft-delete/orphan fix against project ${PROJECT_REF}..."
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${SQL_FILE}"
