# Mobile Architecture Plan - Cross-Platform Code Reuse

> **Status**: Implemented v1.0  
> **Date**: 2026-01-27  
> **Goal**: Minimize mobile-specific code, maximize "write once, run everywhere"

---

## Implementation Status

| Component             | Status   | Location                               |
| --------------------- | -------- | -------------------------------------- |
| `@nce/store`          | **DONE** | `packages/store/`                      |
| `@nce/ui-tokens`      | **DONE** | `packages/ui-tokens/`                  |
| `@nce/api` endpoints  | **DONE** | `packages/api/src/endpoints/`          |
| Platform Adapter      | **DONE** | `packages/shared/src/platform/`        |
| `useReadingTracker`   | **DONE** | `packages/shared/src/hooks/`           |
| Mobile initialization | **DONE** | `apps/mobile/src/lib/platform-init.ts` |

---

## Executive Summary

### Current State Analysis

| Aspect         | Web (`apps/web`)    | Mobile (`apps/mobile`) | Gap                   |
| -------------- | ------------------- | ---------------------- | --------------------- |
| **Views**      | 15+ complete views  | 4 basic screens        | Missing 70%+ features |
| **Components** | 50+ components      | 5 components           | No shared UI          |
| **Hooks**      | 3 custom hooks      | Duplicated logic       | Partial reuse         |
| **API Layer**  | `authFetch` wrapper | Duplicated in `api.ts` | Redundant code        |
| **State**      | Context-based       | Duplicated context     | No Zustand            |
| **Styling**    | Tailwind (web)      | NativeWind (mobile)    | Config not shared     |

### Target Architecture (Inspired by Folo)

```
/
├── apps/
│   ├── web/                # Vite + React (Browser)
│   └── mobile/             # Expo + React Native (iOS/Android/Web)
│
├── packages/
│   ├── api/                # ✓ Exists - Auth, API client, Types
│   ├── shared/             # ✓ Exists - Business logic hooks
│   ├── store/              # NEW - Zustand global state
│   ├── ui-tokens/          # NEW - Design tokens (colors, typography)
│   └── constants/          # NEW - Shared constants
│
├── backend/                # Python FastAPI
└── turbo.json              # Build orchestration
```

---

## Phase 1: Foundation (Week 1-2)

### 1.1 Create `packages/store` - Centralized State Management

**Why**: Currently, auth state is duplicated in `apps/web/src/context/AuthContext.jsx` and `apps/mobile/src/context/AuthContext.tsx`. Zustand works identically on Web and React Native.

**Structure**:

```
packages/store/
├── src/
│   ├── index.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── store.ts      # useAuthStore
│   │   │   ├── hooks.ts      # useCurrentUser, useIsLoggedIn
│   │   │   └── types.ts
│   │   ├── reading/
│   │   │   ├── store.ts      # useReadingStore
│   │   │   └── hooks.ts      # useCurrentArticle, useReadingProgress
│   │   ├── dictionary/
│   │   │   ├── store.ts      # useDictionaryStore
│   │   │   └── hooks.ts      # useWordLookup, useRecentWords
│   │   └── podcast/
│   │       ├── store.ts      # usePodcastStore
│   │       └── hooks.ts      # usePlayback, useDownloads
│   └── lib/
│       ├── persist.ts        # AsyncStorage adapter for RN
│       └── helpers.ts
├── package.json
└── tsconfig.json
```

**Example - Auth Store**:

```typescript
// packages/store/src/modules/auth/store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorageAdapter } from "../../lib/persist";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,
      login: async (email, password) => {
        set({ isLoading: true });
        const { user, access_token } = await authApi.login(email, password);
        set({ user, accessToken: access_token, isLoading: false });
      },
      logout: () => set({ user: null, accessToken: null }),
    }),
    {
      name: "auth-storage",
      storage: createStorageAdapter(), // Works on both Web & RN
    },
  ),
);
```

**Migration Path**:

1. Create package structure
2. Move `packages/api/src/auth.ts` logic into store
3. Update `apps/web` to use `@nce/store`
4. Update `apps/mobile` to use `@nce/store`
5. Delete duplicated auth contexts

---

### 1.2 Create `packages/ui-tokens` - Shared Design System

**Why**: Currently, Tailwind config exists separately in `apps/web/tailwind.config.js` and `apps/mobile/tailwind.config.ts`. Color tokens should be defined once.

**Structure**:

```
packages/ui-tokens/
├── src/
│   ├── index.ts
│   ├── colors.ts          # Semantic color tokens
│   ├── typography.ts      # Font families, sizes
│   ├── spacing.ts         # Consistent spacing scale
│   └── tailwind-preset.ts # Shared Tailwind preset
├── package.json
└── tsconfig.json
```

**Example - Colors**:

```typescript
// packages/ui-tokens/src/colors.ts
export const colors = {
  // Base (OLED-optimized)
  bg: {
    base: "#050505",
    surface: "#0A0A0A",
    elevated: "#121212",
  },

  // Text
  text: {
    primary: "#E0E0E0",
    secondary: "#888888",
    muted: "#555555",
  },

  // Accent (Matrix Green)
  accent: {
    primary: "#00FF94",
    success: "#00FF94",
    danger: "#FF4444",
    warning: "#FFB800",
  },

  // Border
  border: {
    DEFAULT: "#1A1A1A",
    focus: "#00FF94",
  },
} as const;

// packages/ui-tokens/src/tailwind-preset.ts
import { colors } from "./colors";

export const cyberNoirPreset = {
  theme: {
    extend: {
      colors: {
        "bg-base": colors.bg.base,
        "bg-surface": colors.bg.surface,
        "text-primary": colors.text.primary,
        "accent-primary": colors.accent.primary,
        // ... etc
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Merriweather", "Georgia", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
};
```

**Usage in Apps**:

```javascript
// apps/web/tailwind.config.js
const { cyberNoirPreset } = require("@nce/ui-tokens");

module.exports = {
  presets: [cyberNoirPreset],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
};

// apps/mobile/tailwind.config.ts
import { cyberNoirPreset } from "@nce/ui-tokens";

export default {
  presets: [cyberNoirPreset],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}"],
};
```

---

### 1.3 Expand `packages/api` - Unified API Layer

**Why**: API calls are duplicated in `apps/mobile/src/modules/study/api.ts`. All API logic should live in `packages/api`.

**Current**:

```
packages/api/
├── src/
│   ├── auth.ts     # Only auth utilities
│   ├── storage.ts  # Storage adapter
│   └── schema.d.ts # OpenAPI types
```

**Target**:

```
packages/api/
├── src/
│   ├── index.ts
│   ├── client.ts           # Base fetch wrapper with auth
│   ├── auth.ts             # Auth-specific methods
│   ├── storage.ts          # Storage adapter
│   ├── schema.d.ts         # OpenAPI types
│   └── endpoints/
│       ├── reading.ts      # readingApi.startSession, etc.
│       ├── dictionary.ts   # dictionaryApi.lookup, etc.
│       ├── podcast.ts      # podcastApi.subscribe, etc.
│       ├── review.ts       # reviewApi.getQueue, etc.
│       └── voice.ts        # voiceApi.getTTS, etc.
└── package.json
```

**Example - Reading API**:

```typescript
// packages/api/src/endpoints/reading.ts
import { authFetch } from "../client";

export const readingApi = {
  async getArticles() {
    const res = await authFetch("/api/reading/epub/list-with-status");
    return res.json();
  },

  async getArticleDetail(id: string) {
    const res = await authFetch(`/api/reading/article?id=${id}`);
    return res.json();
  },

  async startSession(data: StartSessionRequest) {
    const res = await authFetch("/api/reading/start", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // ... heartbeat, end, etc.
};
```

---

## Phase 2: Shared Business Logic (Week 3-4)

### 2.1 Expand `packages/shared` - View Model Hooks

**Current**: Only `useWordExplainer` exists.

**Target Structure**:

```
packages/shared/
├── src/
│   ├── index.ts
│   ├── hooks/
│   │   ├── useWordExplainer.ts     # ✓ Exists
│   │   ├── useArticleList.ts       # NEW - Fetch & filter articles
│   │   ├── useArticleReader.ts     # NEW - Reading progress, sentences
│   │   ├── useSentenceStudy.ts     # NEW - Deep study flow
│   │   ├── usePodcastPlayer.ts     # NEW - Playback control
│   │   ├── useReviewQueue.ts       # NEW - SM-2 review logic
│   │   └── useDictionary.ts        # NEW - Dictionary lookup
│   └── utils/
│       ├── sseParser.ts            # ✓ Exists
│       ├── formatters.ts           # Date, time, duration formatters
│       └── validators.ts           # Input validation helpers
└── package.json
```

**Example - useArticleList Hook**:

```typescript
// packages/shared/src/hooks/useArticleList.ts
import { useQuery } from "@tanstack/react-query";
import { readingApi } from "@nce/api";

export interface UseArticleListOptions {
  bookId?: string;
  searchQuery?: string;
}

export function useArticleList(options: UseArticleListOptions = {}) {
  const query = useQuery({
    queryKey: ["articles", options.bookId, options.searchQuery],
    queryFn: () => readingApi.getArticles(),
    select: (data) => {
      let articles = data.articles || [];

      if (options.bookId) {
        articles = articles.filter((a) => a.book_id === options.bookId);
      }

      if (options.searchQuery) {
        const q = options.searchQuery.toLowerCase();
        articles = articles.filter((a) => a.title.toLowerCase().includes(q));
      }

      return articles;
    },
  });

  return {
    articles: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message,
    refetch: query.refetch,
  };
}
```

**Usage in Both Apps**:

```tsx
// apps/web/src/views/ReadingMode.jsx
import { useArticleList } from "@nce/shared";

function ArticleListView() {
  const { articles, isLoading } = useArticleList({ bookId: selectedBook });

  return (
    <div className="grid grid-cols-2 gap-4">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}

// apps/mobile/app/(tabs)/index.tsx
import { useArticleList } from "@nce/shared";

function LibraryScreen() {
  const { articles, isLoading } = useArticleList();

  return (
    <FlatList
      data={articles}
      renderItem={({ item }) => <ArticleRow article={item} />}
    />
  );
}
```

---

### 2.2 Move Reading Tracker to Shared

**Current Location**: `apps/mobile/src/modules/study/useReadingTracker.ts`

**Problem**: This hook should be in `packages/shared` so web can also use it.

**Migration**:

1. Move `useReadingTracker.ts` to `packages/shared/src/hooks/`
2. Abstract platform-specific parts:
   - `AppState` (React Native) → `document.visibilitychange` (Web)
   - Use a platform adapter pattern

**Platform Adapter Pattern**:

```typescript
// packages/shared/src/hooks/useReadingTracker.ts
import { useEffect, useRef, useState, useCallback } from "react";
import { readingApi } from "@nce/api";

interface PlatformAdapter {
  onVisibilityChange: (callback: (isVisible: boolean) => void) => () => void;
}

// Injected by the app shell
let platformAdapter: PlatformAdapter;

export function setPlatformAdapter(adapter: PlatformAdapter) {
  platformAdapter = adapter;
}

export function useReadingTracker(props: UseReadingTrackerProps) {
  // ... core logic unchanged ...

  useEffect(() => {
    if (!platformAdapter) {
      console.warn("PlatformAdapter not set for useReadingTracker");
      return;
    }

    const cleanup = platformAdapter.onVisibilityChange((isVisible) => {
      if (isVisible) {
        stateRef.current.isActive = true;
        stateRef.current.activeStartTime = Date.now();
        resetIdleTimer();
      } else {
        recordActiveTime();
        stateRef.current.isActive = false;
      }
    });

    return cleanup;
  }, [sessionId]);

  // ... rest unchanged ...
}

// apps/mobile/_layout.tsx
import { setPlatformAdapter } from "@nce/shared";
import { AppState } from "react-native";

setPlatformAdapter({
  onVisibilityChange: (callback) => {
    const subscription = AppState.addEventListener("change", (state) => {
      callback(state === "active");
    });
    return () => subscription.remove();
  },
});

// apps/web/src/main.jsx
import { setPlatformAdapter } from "@nce/shared";

setPlatformAdapter({
  onVisibilityChange: (callback) => {
    const handler = () => callback(!document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  },
});
```

---

## Phase 3: Feature Parity Matrix (Week 5-8)

### Current Features to Port to Mobile

| Feature            | Web Status | Mobile Status | Shared Logic Location                       |
| ------------------ | ---------- | ------------- | ------------------------------------------- |
| **Auth**           | Complete   | Basic         | `packages/store/modules/auth`               |
| **Article List**   | Complete   | Basic         | `packages/shared/hooks/useArticleList`      |
| **Article Reader** | Complete   | Basic         | `packages/shared/hooks/useArticleReader`    |
| **Word Inspector** | Complete   | Basic         | `packages/shared/hooks/useWordExplainer`    |
| **Deep Study**     | Complete   | Basic         | `packages/shared/hooks/useSentenceStudy`    |
| **Review Queue**   | Complete   | Missing       | `packages/shared/hooks/useReviewQueue`      |
| **Podcast**        | Complete   | Missing       | `packages/shared/hooks/usePodcastPlayer`    |
| **Performance**    | Complete   | Missing       | `packages/shared/hooks/usePerformanceStats` |
| **Voice Lab**      | Complete   | Missing       | Platform-specific (WebSocket)               |
| **Settings**       | Complete   | Missing       | `packages/store/modules/settings`           |

### Priority Order for Mobile Implementation

**P0 - Core Reading Flow** (Week 5):

1. Article List with proper book grouping
2. Article Reader with full WebView
3. Word Inspector (already uses `useWordExplainer`)
4. Deep Study with TTS

**P1 - Learning Retention** (Week 6):

1. Review Queue (SM-2 flashcard system)
2. Performance Dashboard (basic stats)

**P2 - Content Discovery** (Week 7):

1. Podcast Browse/Subscribe
2. Podcast Player with offline support

**P3 - Advanced Features** (Week 8):

1. Voice Lab (Gemini Live API)
2. Settings & Preferences

---

## Phase 4: Developer Guidelines

### 4.1 Adding a New Feature Checklist

When adding ANY new feature:

1. **Define Types in `packages/api/src/schema.d.ts`**
   - Run `pnpm turbo gen:types` after backend changes

2. **Create API endpoint in `packages/api/src/endpoints/`**

   ```typescript
   // packages/api/src/endpoints/feature.ts
   export const featureApi = {
     async getData() { ... },
     async update(data: UpdateRequest) { ... },
   };
   ```

3. **Create shared hook in `packages/shared/src/hooks/`**

   ```typescript
   // packages/shared/src/hooks/useFeature.ts
   export function useFeature() {
     const query = useQuery({...});
     const mutation = useMutation({...});

     return {
       data: query.data,
       isLoading: query.isLoading,
       actions: {
         update: mutation.mutate,
       },
     };
   }
   ```

4. **Create UI in both apps using the shared hook**
   - Web: `apps/web/src/views/FeatureView.jsx`
   - Mobile: `apps/mobile/app/feature/index.tsx`
   - UI is DIFFERENT, logic is IDENTICAL

### 4.2 Platform-Specific Code Patterns

**Pattern 1: Shared Hook with Platform Adapter**

```typescript
// For features that need platform APIs (vibration, notifications, etc.)
export interface PlatformFeatureAdapter {
  vibrate: () => void;
  notify: (title: string, body: string) => void;
}

// Injected by app shell
```

**Pattern 2: Conditional Exports**

```typescript
// packages/shared/src/utils/audio.ts
export const playSound = async (url: string) => {
  // Works in both environments
  if (typeof Audio !== "undefined") {
    // Web
    const audio = new Audio(url);
    await audio.play();
  } else {
    // React Native - let expo-av handle it
    throw new Error("Use expo-av directly in mobile");
  }
};
```

**Pattern 3: Module Aliases in Metro**

```javascript
// apps/mobile/metro.config.js
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Redirect web-only modules to RN equivalents
  if (moduleName === "web-only-module") {
    return { filePath: require.resolve("./rn-polyfill"), type: "sourceFile" };
  }
};
```

### 4.3 Testing Strategy

```
packages/
├── api/
│   └── __tests__/
│       └── endpoints.test.ts    # API contract tests
├── shared/
│   └── __tests__/
│       └── hooks.test.ts        # Hook logic tests (React Testing Library)
└── store/
    └── __tests__/
        └── modules.test.ts      # State management tests
```

Run shared tests:

```bash
pnpm turbo test --filter=@nce/shared
```

---

## File Structure Summary (Target State)

```
nce-english-practices/
├── apps/
│   ├── web/                          # Vite + React
│   │   ├── src/
│   │   │   ├── components/           # Web-specific UI components
│   │   │   ├── views/                # Page views (use shared hooks)
│   │   │   └── main.jsx              # Entry (sets platform adapter)
│   │   └── tailwind.config.js        # Extends @nce/ui-tokens preset
│   │
│   └── mobile/                       # Expo + React Native
│       ├── app/                      # Expo Router screens
│       ├── src/
│       │   ├── components/           # RN-specific UI components
│       │   └── lib/                  # Platform adapters
│       ├── metro.config.js           # Module aliasing
│       └── tailwind.config.ts        # Extends @nce/ui-tokens preset
│
├── packages/
│   ├── api/                          # Unified API layer
│   │   └── src/
│   │       ├── client.ts             # authFetch, base URL config
│   │       ├── endpoints/            # readingApi, podcastApi, etc.
│   │       └── schema.d.ts           # Generated from OpenAPI
│   │
│   ├── shared/                       # Business logic hooks
│   │   └── src/
│   │       ├── hooks/                # useArticleList, useReviewQueue, etc.
│   │       └── utils/                # Formatters, parsers
│   │
│   ├── store/                        # Global state (Zustand)
│   │   └── src/
│   │       └── modules/              # auth, reading, podcast, settings
│   │
│   └── ui-tokens/                    # Design system tokens
│       └── src/
│           ├── colors.ts
│           ├── typography.ts
│           └── tailwind-preset.ts
│
├── backend/                          # Python FastAPI
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Migration Roadmap

### Week 1-2: Foundation

- [ ] Create `packages/store` with Zustand
- [ ] Create `packages/ui-tokens` with shared Tailwind preset
- [ ] Migrate auth from Context to Zustand store
- [ ] Update both apps to use shared tokens

### Week 3-4: API & Hooks

- [ ] Expand `packages/api` with all endpoints
- [ ] Create `useArticleList`, `useArticleReader` hooks
- [ ] Move `useReadingTracker` to shared with platform adapter
- [ ] Create `useSentenceStudy`, `useReviewQueue` hooks

### Week 5-6: Mobile Feature Parity (Core)

- [ ] Implement full Article Reader on mobile
- [ ] Implement Review Queue on mobile
- [ ] Implement Performance Dashboard on mobile

### Week 7-8: Mobile Feature Parity (Extended)

- [ ] Implement Podcast features on mobile
- [ ] Implement Voice Lab on mobile
- [ ] Implement Settings on mobile

---

## Success Metrics

| Metric                               | Current | Target |
| ------------------------------------ | ------- | ------ |
| Lines of duplicated code             | ~500+   | <50    |
| Shared packages used by both apps    | 2       | 5      |
| Time to add new feature to both apps | 2x      | 1.2x   |
| Mobile feature parity (%)            | 30%     | 90%    |

---

## References

- [Folo Project Architecture](D:/Documents/GitHub/js/Folo/TECHNICAL_ARCHITECTURE.md)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [TanStack Query for React Native](https://tanstack.com/query/latest/docs/react/react-native)
- [NativeWind v4](https://www.nativewind.dev/)
