#!/bin/bash
set -e

echo "Running Pre-commit Checks..."

# 1. Run Backend Tests
echo "--> Running Backend Tests (pytest)..."
# We exclude e2e tests as they require a browser and frontend
uv run pytest tests/test_*.py

echo "--> Checks Passed!"
