#!/bin/bash

# Configuration
DEPLOY_DIR=$(dirname "$0")/..
cd "$DEPLOY_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=== System Health Report ==="

# 1. Container Status
RUNNING_CONTAINERS=$(docker compose ps --filter "status=running" --format "{{.Service}}")
EXPECTED_CONTAINERS="nginx app postgres backup-cron"
ALL_RUNNING=true

for service in $EXPECTED_CONTAINERS; do
    if echo "$RUNNING_CONTAINERS" | grep -q "$service"; then
        echo -e "✅ Container $service: ${GREEN}Running${NC}"
    else
        echo -e "❌ Container $service: ${RED}Stopped${NC}"
        ALL_RUNNING=false
    fi
done

# 2. Database Check
if docker compose exec postgres pg_isready -U postgres > /dev/null 2>&1; then
     echo -e "✅ Database: ${GREEN}Responding${NC}"
else
     echo -e "❌ Database: ${RED}Unresponsive${NC}"
fi

# 3. App Health Check
HTTP_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" https://localhost/health)
if [ "$HTTP_CODE" == "200" ]; then
    echo -e "✅ App Health: ${GREEN}OK (200)${NC}"
else
    echo -e "❌ App Health: ${RED}Error ($HTTP_CODE)${NC}"
fi

# 4. Disk Usage
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo -e "⚠️  Disk Usage: ${YELLOW}${DISK_USAGE}% (High)${NC}"
else
    echo -e "✅ Disk Usage: ${GREEN}${DISK_USAGE}%${NC}"
fi
