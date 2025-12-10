# Use official Python image
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

# Copy dependency files
COPY pyproject.toml .
COPY uv.lock .

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Install dependencies using uv
# We install the 'dictionary' extra to ensure all features are available in the container
RUN uv sync --frozen --extra dictionary

# Copy application code
COPY . .

# Environment variables
ENV PYTHONUNBUFFERED=1
# Add virtualenv to PATH
ENV PATH="/app/.venv/bin:$PATH"

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
