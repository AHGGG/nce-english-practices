# Authentication System

Multi-user authentication with JWT tokens, designed for future public deployment.

## Backend Components

- **Model**: `app/models/orm.py::User` - User accounts with email, password hash, roles
- **Schemas**: `app/models/auth_schemas.py` - Registration, login, token DTOs
- **Service**: `app/services/auth.py` - Password hashing, JWT creation/verification
- **Router**: `app/api/routers/auth.py` - REST API endpoints

## API Endpoints

| Endpoint                    | Method | Description                |
| --------------------------- | ------ | -------------------------- |
| `/api/auth/register`        | POST   | Create new account         |
| `/api/auth/login`           | POST   | Login, returns JWT tokens  |
| `/api/auth/refresh`         | POST   | Refresh access token       |
| `/api/auth/logout`          | POST   | Clear refresh token cookie |
| `/api/auth/me`              | GET    | Get current user profile   |
| `/api/auth/change-password` | POST   | Update password            |

## Token Strategy

- **Access Token**: Short-lived (15 min), stored in localStorage
- **Refresh Token**: Long-lived (7 days), stored in HttpOnly cookie
- **Auto-refresh**: Frontend `authFetch()` handles token expiry

## Frontend Components

- `src/api/auth.js` - Auth API utilities with auto-refresh
- `src/context/AuthContext.jsx` - Global auth state provider
- `src/components/ProtectedRoute.jsx` - Route guard component
- `src/views/auth/LoginPage.jsx` - Login form with glassmorphism design
- `src/views/auth/RegisterPage.jsx` - Registration with password strength

## Security Features

- Password strength validation (min 8 chars, letter + digit)
- Failed login attempt tracking
- Account locking support
- Soft delete for users

## Data Migration

Use admin CLI to migrate existing data:

```bash
uv run python scripts/user_admin.py migrate-data --to-user-id <id>
```

See [User Administration Skill](docs/skills/user-administration.md) for full CLI usage.
