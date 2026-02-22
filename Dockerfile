# syntax=docker/dockerfile:1
# Stage 1: Build Web App
FROM node:20-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy root config files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy package.json files for all workspaces to install dependencies effectively
# We copy the source structure but only package.jsons first to leverage layer caching
COPY apps/web/package.json ./apps/web/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json
COPY apps/backend/package.json ./apps/backend/package.json
COPY packages/api/package.json ./packages/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/store/package.json ./packages/store/package.json
COPY packages/ui-tokens/package.json ./packages/ui-tokens/package.json

# Copy patches directory for pnpm patch functionality
COPY patches ./patches

# Install dependencies (frozen lockfile for reproducibility)
# This layer will be cached unless pnpm-lock.yaml or package.json files change
RUN --mount=type=cache,target=/pnpm/store pnpm install --frozen-lockfile

# Copy source code
COPY apps/web ./apps/web
COPY packages ./packages

# Build the web application
# NOTE: On low-memory VPS (2GB), Node can OOM during Vite's chunk rendering.
# --concurrency=1 avoids parallel builds; NODE_OPTIONS caps V8 heap to ~1GB.
RUN --mount=type=cache,target=/pnpm/store NODE_OPTIONS="--max-old-space-size=1024" pnpm turbo build --filter=@nce/web --concurrency=2

# Stage 2: Python Backend
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
# liblzo2-dev is required for python-lzo (dictionary feature)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    liblzo2-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend dependency files
COPY pyproject.toml uv.lock .

# Install uv (Python package manager)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Install Python dependencies with caching
# This layer will be cached unless pyproject.toml or uv.lock changes
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --extra dictionary --no-install-project

# Copy application code (backend logic in root and app folder)
COPY app ./app
COPY scripts ./scripts
COPY alembic ./alembic
COPY alembic.ini .

# Copy built frontend assets from Stage 1
COPY --from=builder /app/apps/web/dist /app/apps/web/dist

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PATH="/app/.venv/bin:$PATH"

# Expose port
EXPOSE 8000

# Run the application
# We use app.main:app (FastAPI) which serves static files from the copied dist
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
