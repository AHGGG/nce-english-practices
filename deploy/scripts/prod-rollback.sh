#!/bin/bash
set -euo pipefail

DEPLOY_DIR=$(dirname "$0")/..
cd "$DEPLOY_DIR"

BACKUP_DIR="./backups/prod"
TARGET=""
AUTO_YES=false

usage() {
    echo "Usage: $0 <backup_file|latest> [--yes]"
    echo "Examples:"
    echo "  $0 latest"
    echo "  $0 nce_nce_practice_20260222_163000.sql.gz"
    echo "  $0 latest --yes"
    exit 1
}

if [[ $# -lt 1 ]]; then
    usage
fi

if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    usage
fi

TARGET="$1"
shift

while [[ $# -gt 0 ]]; do
    case "$1" in
        --yes)
            AUTO_YES=true
            shift
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

if [[ "$TARGET" == "latest" ]]; then
    BACKUP_FILE=$(ls -1t "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | head -n 1 || true)
    if [[ -z "$BACKUP_FILE" ]]; then
        echo "Error: no backup files found in ${BACKUP_DIR}"
        exit 1
    fi
else
    if [[ -f "$TARGET" ]]; then
        BACKUP_FILE="$TARGET"
    else
        BACKUP_FILE="${BACKUP_DIR}/${TARGET}"
    fi
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
    echo "Error: backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Target rollback backup: $BACKUP_FILE"

if [[ "$AUTO_YES" != "true" ]]; then
    echo "WARNING: rollback will overwrite current database '${DB_NAME}'."
    read -r -p "Continue? (y/N) " REPLY
    if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
        echo "Rollback cancelled."
        exit 1
    fi
fi

echo "Creating safety snapshot before rollback..."
./scripts/prod-backup.sh --tag pre_rollback

echo "Stopping app writes..."
docker compose stop app

echo "Resetting public schema..."
docker compose exec -T -e PGPASSWORD="$DB_PASSWORD" postgres \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "Restoring backup into database..."
gunzip -c "$BACKUP_FILE" | docker compose exec -T -e PGPASSWORD="$DB_PASSWORD" postgres \
    psql -U "$DB_USER" -d "$DB_NAME"

echo "Restarting app..."
docker compose start app

echo "Verifying services..."
docker compose exec -T -e PGPASSWORD="$DB_PASSWORD" postgres pg_isready -U "$DB_USER" > /dev/null
if ! curl -k -sSf https://localhost/health > /dev/null; then
    echo "Warning: /health check failed after rollback. Check logs with ./scripts/logs.sh"
    exit 1
fi

echo "Rollback completed successfully."
