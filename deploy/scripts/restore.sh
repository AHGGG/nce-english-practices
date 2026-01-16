#!/bin/bash
set -e

# Configuration
DEPLOY_DIR=$(dirname "$0")/..
cd "$DEPLOY_DIR"

BACKUP_DIR="./backups"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ "$1" == "list" ]; then
    echo "Available backups:"
    ls -lh ${BACKUP_DIR}
    exit 0
fi

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_filename> | list"
    exit 1
fi

BACKUP_FILE="${BACKUP_DIR}/$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}WARNING: This will overwrite the current database!${NC}"
read -p "Are you sure you want to proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 1
fi

echo -e "\n${YELLOW}1. Stopping application...${NC}"
docker compose stop app

echo -e "\n${YELLOW}2. Restoring database...${NC}"
# Drop and recreate schema (simplified approach: drop public schema)
# Note: In production, might be safer to create a new DB
docker compose exec -T postgres psql -U postgres -d nce_practice -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Restore
gunzip -c "$BACKUP_FILE" | docker compose exec -T postgres psql -U postgres -d nce_practice

echo -e "\n${YELLOW}3. Restarting application...${NC}"
docker compose start app

echo -e "\n${GREEN}✅ Restore complete!${NC}"
