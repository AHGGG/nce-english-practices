---
name: Database Management
description: Guide for database operations including migrations and history using Alembic.
---

# Database Management

This skill covers common database maintenance tasks using Alembic.

## Migration Commands

```bash
# Initialize/migrate database to the latest version
uv run alembic upgrade head

# Create a new migration after modifying SQLAlchemy models
# The --autogenerate flag automatically detects schema changes
uv run alembic revision --autogenerate -m "description_of_changes"

# Downgrade the database by one version
uv run alembic downgrade -1

# View migration history (current and past revisions)
uv run alembic history
```

## Common Issues

**Alembic `NotNullViolationError`**
If adding a non-nullable column to an existing table fails:
- **Fix**: Always add `server_default='...'` to `op.add_column` for non-nullable columns in the generated migration script.
