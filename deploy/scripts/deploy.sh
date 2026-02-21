#!/bin/bash
set -e

# Configuration
DEPLOY_DIR=$(dirname "$0")/..
cd "$DEPLOY_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Parse Arguments
MODE="quick"
SEED_DATA=false
PRUNE_DANGLING=true

help() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  --quick     (Default) Incremental update using cache. Fast."
    echo "  --full      Clean install. Removes cache, prune resources, reseeds data. Slow."
    echo "  --no-prune  Keep dangling images after deploy (default is auto-prune)."
    echo "  --help      Show this help message."
    exit 0
}

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --full) MODE="full"; SEED_DATA=true ;;
        --quick) MODE="quick" ;;
        --no-prune) PRUNE_DANGLING=false ;;
        --help) help ;;
        *) echo "Unknown parameter passed: $1"; help ;;
    esac
    shift
done

echo -e "${YELLOW}Starting Deployment (${MODE} mode)...${NC}"

# 1. Prerequisites Check (Common)
echo -e "\n${YELLOW}1. Checking prerequisites...${NC}"

# Enable BuildKit for better caching
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: docker is not installed.${NC}"
    exit 1
fi

if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found. Please copy .env.example to .env and configure it.${NC}"
    exit 1
fi

# Load environment variables and validate required values
set -a
source .env
set +a

required_vars=(DB_USER DB_PASSWORD DB_NAME SECRET_KEY)
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}Error: required env var '$var' is missing or empty in .env.${NC}"
        exit 1
    fi
done

if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
    echo -e "${RED}Error: SSL certificates not found in nginx/ssl/. Please run generate_cert.py first.${NC}"
    exit 1
fi

# 2. Cleanup (Conditional)
if [ "$MODE" == "full" ]; then
    echo -e "\n${YELLOW}2. Cleaning up old Docker artifacts (Full Mode)...${NC}"
    # Stop everything first
    docker compose down --remove-orphans 2>/dev/null || true
    # Prune unused images to ensure clean slate
    docker system prune -f --filter "until=24h" 2>/dev/null || true
    echo -e "${GREEN}Cleanup complete.${NC}"
else
    echo -e "\n${YELLOW}2. Skipping exhaustive cleanup (Quick Mode)...${NC}"
fi

# 3. Build and Start
echo -e "\n${YELLOW}3. Building and starting services...${NC}"

BUILD_ARGS=""
if [ "$MODE" == "full" ]; then
    BUILD_ARGS="--no-cache"
fi

# Build
docker compose build $BUILD_ARGS

# Start (recreate changed containers)
docker compose up -d --remove-orphans

# 4. Wait for Database
echo -e "\n${YELLOW}4. Waiting for database...${NC}"
echo "Waiting for postgres to be healthy..."
until docker compose exec postgres pg_isready -U "$DB_USER"; do
  echo "..."
  sleep 2
done

# 5. Run Migrations
echo -e "\n${YELLOW}5. Running database migrations...${NC}"
docker compose exec app alembic upgrade head

# 6. Seed Initial Data (Conditional)
if [ "$SEED_DATA" = true ]; then
    echo -e "\n${YELLOW}6. Seeding initial data...${NC}"
    docker compose exec app uv run python scripts/seed_word_lists.py
else
    echo -e "\n${YELLOW}6. Skipping data seeding (use --full to seed)...${NC}"
fi

# 7. Cleanup dangling images from repeated rebuilds
if [ "$PRUNE_DANGLING" = true ]; then
    echo -e "\n${YELLOW}7. Pruning dangling images...${NC}"
    docker image prune -f --filter "dangling=true" 2>/dev/null || true
else
    echo -e "\n${YELLOW}7. Skipping dangling image prune (--no-prune).${NC}"
fi

# 8. Status
echo -e "\n${GREEN}✅ Deployment complete!${NC}"
echo -e "Access the application at: ${GREEN}https://localhost${NC} (or your server IP)"
docker compose ps
