# Stage 1: Build React Frontend
FROM node:20 AS builder

WORKDIR /frontend

# Copy frontend dependency files
COPY frontend/package.json frontend/package-lock.json ./

# Install dependencies
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Build the React application
RUN npm run build


# Stage 2: Python Backend
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
# liblzo2-dev is required for python-lzo (dictionary feature)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    liblzo2-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy backend dependency files
COPY pyproject.toml .
COPY uv.lock .

# Install uv (Python package manager)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Install Python dependencies
# We install the 'dictionary' extra to ensure all features are available
# Removed --frozen to allow picking up pyproject.toml changes without updating uv.lock locally first
RUN uv sync --extra dictionary

# Copy application code
COPY . .

# Copy built frontend assets from Stage 1
# This places 'dist' into '/app/frontend/dist', which main.py expects
COPY --from=builder /frontend/dist /app/frontend/dist

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PATH="/app/.venv/bin:$PATH"

# Expose port
EXPOSE 8000

# Run the application
# We use app.main:app (FastAPI) which now serves static files too
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
