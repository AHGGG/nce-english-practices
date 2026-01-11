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

echo -e "${YELLOW}Starting Deployment...${NC}"

# 1. Prerequisites Check
echo -e "\n${YELLOW}1. Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: docker is not installed.${NC}"
    exit 1
fi

if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found. Please copy .env.example to .env and configure it.${NC}"
    exit 1
fi

if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
    echo -e "${RED}Error: SSL certificates not found in nginx/ssl/. Please run generate_cert.py first.${NC}"
    exit 1
fi

# 2. Cleanup old build artifacts
echo -e "\n${YELLOW}2. Cleaning up old Docker artifacts...${NC}"
docker compose down --remove-orphans 2>/dev/null || true
docker system prune -f --filter "until=24h" 2>/dev/null || true
echo -e "${GREEN}Cleanup complete.${NC}"

# 3. Build and Start
echo -e "\n${YELLOW}3. Building and starting services...${NC}"
docker compose build --no-cache
docker compose up -d

# 4. Wait for Database
echo -e "\n${YELLOW}4. Waiting for database...${NC}"
echo "Waiting for postgres to be healthy..."
until docker compose exec postgres pg_isready -U postgres; do
  echo "..."
  sleep 2
done

# 5. Run Migrations
echo -e "\n${YELLOW}5. Running database migrations...${NC}"
docker compose exec app alembic upgrade head

# 6. Seed Initial Data
echo -e "\n${YELLOW}6. Seeding initial data...${NC}"
docker compose exec app uv run python scripts/seed_word_lists.py

# 7. Status
echo -e "\n${GREEN}✅ Deployment complete!${NC}"
echo -e "Access the application at: ${GREEN}https://localhost${NC} (or your server IP)"
docker compose ps
