---
name: User Administration
description: Guide for managing users via the admin CLI, including creation, migration, and password management.
---

# User Administration

This skill covers user management operations using the `scripts/user_admin.py` CLI.

## Admin CLI Usage

The script is located at `scripts/user_admin.py`.

```bash
# List all users
uv run python scripts/user_admin.py list-users

# Create a new user (when registration is closed)
uv run python scripts/user_admin.py create-user --email admin@example.com --password secret123 --role admin

# Migrate data from 'default_user' to a registered user
uv run python scripts/user_admin.py migrate-data --to-user-id 1 --dry-run  # Preview
uv run python scripts/user_admin.py migrate-data --to-user-id 1            # Execute

# Migrate data between users
uv run python scripts/user_admin.py migrate-data --from-user "2" --to-user-id 3

# Reset user password
uv run python scripts/user_admin.py set-password --user-id 1 --password newpassword

# Deactivate/Activate user
uv run python scripts/user_admin.py deactivate-user --user-id 2
uv run python scripts/user_admin.py activate-user --user-id 2
```
