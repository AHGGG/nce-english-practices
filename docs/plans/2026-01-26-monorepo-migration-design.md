# Monorepo Migration & Multi-platform Architecture Design
**Date**: 2026-01-26
**Status**: Approved

## 1. Context & Objectives
The project currently consists of a Python FastAPI backend and a React (Vite) frontend in a standard repository structure. The goal is to evolve this into a **Multi-platform Monorepo** ("Universal App" architecture) to support future Mobile (iOS/Android via Expo) and Desktop (Electron) applications while maximizing code reuse.

**Key Goals:**
1.  **Single Source of Truth**: Backend API schemas drive frontend TypeScript types automatically.
2.  **Shared Logic**: Business logic (Auth, State, Data Fetching) is written once in `packages/shared` and reused across Web and Mobile.
3.  **Native Experience**: UI is platform-specific (Web vs. Native) but shares design tokens (`packages/ui-tokens`).
4.  **Zero Downtime**: The migration must be incremental, keeping the existing Web application functional at all times.

## 2. Target Architecture
We will adopt a **Turborepo** + **pnpm workspaces** structure.

```text
/
├── apps/
│   ├── web/                # (Moved) Current React frontend
│   ├── mobile/             # (New) Expo React Native app
│   └── backend/            # (Logical) Task runner for Python root
├── packages/
│   ├── api/                # Generated Types + Typed API Client
│   ├── shared/             # Hooks, Stores (Zustand), Logic
│   ├── ui-tokens/          # Shared Design Tokens (Tailwind config)
│   └── ts-config/          # Shared TS configurations
├── backend/                # (Physical) Existing Python Code (remains in root for now)
├── turbo.json              # Orchestration
├── package.json            # Root workspace config
└── pnpm-workspace.yaml     # Workspace definition
```

## 3. Implementation Roadmap

### Phase 1: The Contract (Type Safety) - [COMPLETED]
**Goal**: Establish a strictly typed link between FastAPI and Frontend without moving files yet.

1.  **Backend Exporter**: Create `scripts/export_openapi.py` to dump `openapi.json` without starting the server.
2.  **Frontend TypeScript**: Enable TypeScript in `frontend/` (allowJs mode) without breaking existing JSX.
3.  **Codegen Pipeline**:
    *   Add `openapi-typescript` to frontend.
    *   Create npm script `gen:types` to run the exporter -> generate `src/types/schema.d.ts`.
4.  **Verification**: Ensure `npm run gen:types` produces a valid TS definition file matching the current backend models.

### Phase 2: Monorepo Restructure - [COMPLETED]
**Goal**: Establish the physical workspace structure.

1.  **Init Monorepo**: Create root `package.json`, `pnpm-workspace.yaml`, and `turbo.json`.
2.  **Move Web**: Move `frontend/` to `apps/web/`. Update CI/CD paths.
3.  **Virtual Backend Package**: Create `apps/backend/package.json` to proxy npm scripts (e.g., `npm run dev`) to root-level `uv` commands.
4.  **Turbo Orchestration**: Configure `turbo.json` to run `web#dev` and `backend#dev` in parallel.

### Phase 3: Logic Extraction (The "Brain") - [COMPLETED]
**Goal**: Extract business logic from UI components into shared packages.

1.  **Shared Package Init**: Create `packages/shared` and `packages/api`.
2.  **Auth Abstraction**:
    *   Move `auth.js` logic to `packages/api`.
    *   Implement `TokenStorage` interface (LocalStorage adapter for Web).
    *   Refactor Auth State to **Zustand** store in `packages/shared`.
3.  **Pilot Feature**: Extract `useWordExplainer` (Dictionary Lookup) from components.
    *   Create `packages/shared/src/hooks/useWordExplainer.ts`.
    *   Update Web app to consume this hook.

### Phase 4: Mobile Foundation (Future)
**Goal**: Validate reuse by spinning up the mobile shell.

1.  Initialize `apps/mobile` (Expo).
2.  Install `packages/shared`.
3.  Implement `SecureStore` adapter for Auth.
4.  Build a simple Login Screen using shared Auth logic.

## 4. Technical Details

### 4.1 OpenAPI Export Workflow
We prefer **Static Export** over Runtime Fetch to ensure CI reliability.

*   **Script**: `scripts/export_openapi.py` loads `app.main:app` and prints `json.dumps(app.openapi())`.
*   **Safety**: Must ensure `lifespan` events (DB connection) are NOT triggered during import, or are mocked.

### 4.2 Python Integration in Turborepo
Since Python tooling (`uv`) is separate from Node (`pnpm`), we bridge them via `apps/backend/package.json`:

```json
{
  "name": "backend",
  "scripts": {
    "dev": "cd ../.. && uv run fastapi dev app/main.py",
    "lint": "cd ../.. && uv run ruff check ."
  }
}
```

### 4.3 Authentication Strategy
*   **Web**: Continues using **HttpOnly Cookies** (for Refresh Token) + **LocalStorage** (for Access Token).
*   **Mobile**: Uses **Bearer Token** flow exclusively.
*   **Shared Logic**: The `AuthService` in `packages/api` will accept a `storage` strategy.
    *   `web-storage.ts`: Wraps `localStorage`.
    *   `mobile-storage.ts`: Wraps `expo-secure-store`.

## 5. Verification Plan
*   **Phase 1**: `npm run gen:types` succeeds and `schema.d.ts` contains `User` model.
*   **Phase 2**: `pnpm turbo dev` starts both FastAPI and Vite successfully.
*   **Phase 3**: Web app functions normally (Login, Dictionary lookup) using code imported from `packages/shared`.
