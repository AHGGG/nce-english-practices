#!/bin/bash

# Configuration
DEPLOY_DIR=$(dirname "$0")/..
cd "$DEPLOY_DIR"

if [ -z "$1" ]; then
    # Default: Show all logs
    docker compose logs --tail=50
else
    # Show specific service logs, potentially with follow flag
    docker compose logs "$@"
fi
