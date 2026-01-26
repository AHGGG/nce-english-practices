---
name: Post-Change Verification
description: Guidelines for automatically verifying code changes before notifying the user.
---

# Post-Change Verification Skill

> **Purpose**: Ensure AI automatically verifies code changes before notifying the user.

## When to Trigger

**Trigger this skill**: After completing code changes, **before** calling `notify_user`.

## Core Principles

- 🎯 **Only verify what you changed** - Don't do full-site testing
- 🧠 **Use multimodal flexibly** - Like a real engineer, decide what needs visual verification
- ⚡ **Fast feedback loop** - If something breaks, fix it before telling the user

## Verification Steps

### Step 1: Wait for HMR (3 seconds)

Give Vite and the backend time to reload after file changes.

### Step 2: Health Check (Always Do This)

```bash
# Call the health check endpoint
curl https://localhost:8000/api/verify/health
```

**Check the response:**

- `status: "healthy"` → Continue to next step
- `status: "unhealthy"` → Read the `summary` and `frontend_errors`/`backend_errors`, fix the issues, then re-verify

### Step 3: Visual Verification (When Needed)

**Do this when:**

- ✅ You modified UI components (`.jsx`, `.css`)
- ✅ You changed layouts or styling
- ✅ You added new pages or modified routes

**Skip this when:**

- ❌ Pure backend logic changes
- ❌ Utility functions or helpers
- ❌ Configuration files
- ❌ Tests only

**How to verify:**

1. Use Chrome DevTools MCP to navigate to the affected page
2. Take a screenshot
3. Look at the page snapshot - does it look correct?
4. Check for: blank pages, error text, broken layouts

### Step 4: Interaction Verification (When Needed)

**Do this when:**

- ✅ You modified button click handlers
- ✅ You changed form submissions
- ✅ You updated navigation flows

**How to verify:**

1. Use Chrome DevTools `click` and `fill` tools
2. Simulate the user interaction
3. Verify the expected result happens

## Page Inference Rules

Infer which page to verify based on the files you changed:

| File Pattern                               | Page to Verify    |
| ------------------------------------------ | ----------------- |
| `apps/web/src/components/reading/*`        | `/reading`        |
| `apps/web/src/components/sentence-study/*` | `/sentence-study` |
| `apps/web/src/components/review/*`         | `/review`         |
| `apps/web/src/components/performance/*`    | Check via route   |
| `app/api/routers/review.py`                | `/review`         |
| `app/api/routers/reading.py`               | `/reading`        |
| `app/services/*.py`                        | Health check only |

## Decision Tree

```
Change completed
     │
     ▼
[Always] Call /api/verify/health
     │
     ├── status: unhealthy ──► Fix errors, re-verify
     │
     └── status: healthy
           │
           ▼
     Is this a UI change?
           │
     ┌─────┴─────┐
     │           │
    Yes          No
     │           │
     ▼           ▼
  Screenshot   Done ✅
  + Check
     │
     ▼
  Looks OK?
     │
  ┌──┴──┐
  │     │
 Yes    No
  │     │
  ▼     ▼
Done ✅ Fix it
```

## Example Usage

### Backend-only change (e.g., fixing a service function)

```
1. Wait 3 seconds
2. GET /api/verify/health → healthy
3. Done ✅ (no visual verification needed)
```

### Frontend UI change (e.g., fixing a button layout)

```
1. Wait 3 seconds
2. GET /api/verify/health → healthy
3. Navigate to /review
4. Take screenshot
5. Screenshot shows button correctly positioned → Done ✅
```

### Change that broke something

```
1. Wait 3 seconds
2. GET /api/verify/health → unhealthy
   - frontend_errors: ["Cannot read property 'map' of undefined"]
3. Analyze error → Fix the code
4. Wait 3 seconds
5. GET /api/verify/health → healthy
6. Done ✅
```
