#!/bin/bash
set -euo pipefail

DEPLOY_DIR=$(dirname "$0")/..
cd "$DEPLOY_DIR"

BACKUP_DIR="./backups/prod"
TAG=""

usage() {
    echo "Usage: $0 [--tag <label>]"
    echo "  --tag <label>  Optional suffix in backup filename (letters/numbers/_/- only)"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --tag)
            TAG="${2:-}"
            shift 2
            ;;
        --help|-h)
            usage
            ;;
        *)
            echo "Unknown argument: $1"
            usage
            ;;
    esac
done

if [[ -n "$TAG" ]]; then
    if [[ ! "$TAG" =~ ^[A-Za-z0-9_-]+$ ]]; then
        echo "Error: tag must match [A-Za-z0-9_-]"
        exit 1
    fi
    TAG="_${TAG}"
fi

if [[ ! -f .env ]]; then
    echo "Error: .env file not found in deploy/"
    exit 1
fi

set -a
source .env
set +a

required_vars=(DB_USER DB_PASSWORD DB_NAME)
for var in "${required_vars[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        echo "Error: required env var '$var' is missing in deploy/.env"
        exit 1
    fi
done

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/nce_${DB_NAME}_${TIMESTAMP}${TAG}.sql.gz"
META_FILE="${BACKUP_FILE}.meta"

echo "Creating production backup: ${BACKUP_FILE}"

docker compose exec -T -e PGPASSWORD="$DB_PASSWORD" postgres pg_isready -U "$DB_USER" > /dev/null

docker compose exec -T -e PGPASSWORD="$DB_PASSWORD" postgres \
    pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges \
    | gzip -9 > "$BACKUP_FILE"

if [[ ! -s "$BACKUP_FILE" ]]; then
    echo "Error: backup file is empty: $BACKUP_FILE"
    exit 1
fi

GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
ALEMBIC_REV=$(docker compose exec -T app alembic current 2>/dev/null | tr '\n' ' ' || echo "unknown")

{
    echo "created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "db_name=${DB_NAME}"
    echo "git_sha=${GIT_SHA}"
    echo "alembic_current=${ALEMBIC_REV}"
    echo "backup_file=$(basename "$BACKUP_FILE")"
} > "$META_FILE"

echo "Backup created: $BACKUP_FILE"
echo "Metadata file: $META_FILE"
