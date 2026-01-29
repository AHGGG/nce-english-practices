# Mobile Architecture Plan - Cross-Platform Code Reuse

> **Status**: v2.0 - Feature Parity Phase  
> **Last Updated**: 2026-01-29  
> **Goal**: Minimize mobile-specific code, maximize "write once, run everywhere"

---

## Quick Status Overview

| Metric                    | Current | Target | Notes                            |
| ------------------------- | ------- | ------ | -------------------------------- |
| **Mobile 屏幕数**         | 16      | 20     | 缺少注册、词典独立页等           |
| **共享 Hooks 使用率**     | 100%    | 100%   | ✅ 所有11个hooks已被Mobile使用   |
| **API 复用率**            | 100%    | 100%   | ✅ 全部通过@nce/api              |
| **业务逻辑复用率**        | 95%+    | 95%+   | ✅ 仅UI层平台特定                |
| **@nce/ui-tokens 使用率** | 50%     | 90%    | ⚠️ 存在但未完全集成到tailwind    |
| **Web 功能对等度**        | 80%     | 95%    | 缺少注册、离线下载、全局播放条等 |

---

## Implementation Status (Infrastructure)

| Component                | Status   | Location                                 |
| ------------------------ | -------- | ---------------------------------------- |
| `@nce/store`             | **DONE** | `packages/store/`                        |
| `@nce/ui-tokens`         | **DONE** | `packages/ui-tokens/`                    |
| `@nce/api` endpoints     | **DONE** | `packages/api/src/endpoints/`            |
| Platform Adapter         | **DONE** | `packages/shared/src/platform/`          |
| Mobile initialization    | **DONE** | `apps/mobile/src/lib/platform-init.ts`   |
| SSE Parser (with buffer) | **DONE** | `packages/shared/src/utils/sseParser.ts` |

## Implementation Status (Shared Hooks)

| Hook                    | Status   | Location                     | Mobile Usage |
| ----------------------- | -------- | ---------------------------- | ------------ |
| `useWordExplainer`      | **DONE** | `packages/shared/src/hooks/` | ✅ Active    |
| `useArticleList`        | **DONE** | `packages/shared/src/hooks/` | ✅ Active    |
| `useArticleReader`      | **DONE** | `packages/shared/src/hooks/` | ✅ Active    |
| `useReadingTracker`     | **DONE** | `packages/shared/src/hooks/` | ✅ Active    |
| `useSentenceStudy`      | **DONE** | `packages/shared/src/hooks/` | ✅ Active    |
| `useSentenceExplainer`  | **DONE** | `packages/shared/src/hooks/` | ✅ Active    |
| `useReviewQueue`        | **DONE** | `packages/shared/src/hooks/` | ✅ Active    |
| `usePerformanceStats`   | **DONE** | `packages/shared/src/hooks/` | ✅ Active    |
| `useNegotiationSession` | **DONE** | `packages/shared/src/hooks/` | ✅ Active    |
| `usePodcast*` (5个)     | **DONE** | `packages/shared/src/hooks/` | ✅ Active    |

## Implementation Status (Mobile Screens)

| Screen                   | Status   | Location                    | Web Equivalent              |
| ------------------------ | -------- | --------------------------- | --------------------------- |
| Root Layout              | **DONE** | `app/_layout.tsx`           | -                           |
| Login                    | **DONE** | `app/auth/login.tsx`        | `LoginPage.jsx`             |
| **Register**             | **TODO** | -                           | `RegisterPage.jsx`          |
| Tab Navigation           | **DONE** | `app/(tabs)/_layout.tsx`    | `NavDashboard.jsx`          |
| Library (Article List)   | **DONE** | `app/(tabs)/library.tsx`    | `ArticleListView.jsx`       |
| Reading                  | **DONE** | `app/reading/[id].tsx`      | `ReaderView.jsx`            |
| Sentence Study           | **DONE** | `app/study/[id].tsx`        | `SentenceStudy.jsx`         |
| Review Queue             | **DONE** | `app/(tabs)/index.tsx`      | `ReviewQueue.jsx`           |
| Stats Dashboard          | **DONE** | `app/(tabs)/stats.tsx`      | `PerformanceReport.jsx`     |
| Podcast Discovery        | **DONE** | `app/(tabs)/podcast.tsx`    | `PodcastLibraryView.jsx`    |
| Podcast Detail           | **DONE** | `app/podcast/[id].tsx`      | `PodcastFeedDetailView.jsx` |
| Podcast Preview          | **DONE** | `app/podcast/preview.tsx`   | (Same)                      |
| Podcast Player           | **DONE** | `app/podcast/player.tsx`    | Context-based               |
| Voice Mode               | **DONE** | `app/(tabs)/voice.tsx`      | `NegotiationInterface.jsx`  |
| Settings                 | **DONE** | `app/settings.tsx`          | `SettingsPage.jsx`          |
| Dictionary (Placeholder) | **TODO** | `app/(tabs)/dictionary.tsx` | `DictionaryModal.jsx`       |
| **Podcast Downloads**    | **TODO** | -                           | `PodcastDownloadsView.jsx`  |
| **Global Player Bar**    | **TODO** | -                           | `PlayerBar.jsx`             |

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

## Phase 3: Feature Parity Matrix (Updated 2026-01-29)

### Complete Feature Comparison

| Feature                 | Web Status  | Mobile Status  | Shared Hook/Logic                      | Notes              |
| ----------------------- | ----------- | -------------- | -------------------------------------- | ------------------ |
| **Login**               | ✅ Complete | ✅ Complete    | `@nce/store/useAuthStore`              |                    |
| **Register**            | ✅ Complete | ❌ Missing     | `@nce/store/useAuthStore`              | **Task M-01**      |
| **Article List**        | ✅ Complete | ✅ Complete    | `@nce/shared/useArticleList`           |                    |
| **Article Reader**      | ✅ Complete | ✅ Complete    | `@nce/shared/useArticleReader`         | WebView实现        |
| **Word Inspector**      | ✅ Complete | ✅ Complete    | `@nce/shared/useWordExplainer`         | Modal形式          |
| **Sentence Inspector**  | ✅ Complete | ✅ Complete    | `@nce/shared/useSentenceExplainer`     | Modal形式          |
| **Sentence Study**      | ✅ Complete | ✅ Complete    | `@nce/shared/useSentenceStudy`         | 4阶段AI辅助        |
| **Review Queue**        | ✅ Complete | ✅ Complete    | `@nce/shared/useReviewQueue`           | SM-2算法           |
| **Performance Stats**   | ✅ Complete | ✅ Complete    | `@nce/shared/usePerformanceStats`      |                    |
| **Podcast Discovery**   | ✅ Complete | ✅ Complete    | `@nce/shared/usePodcast*`              | 搜索+订阅          |
| **Podcast Detail**      | ✅ Complete | ✅ Complete    | `@nce/shared/usePodcastFeed`           |                    |
| **Podcast Player**      | ✅ Complete | ✅ Complete    | Context-based                          | 全屏播放器         |
| **Global Player Bar**   | ✅ Complete | ❌ Missing     | -                                      | **Task M-02**      |
| **Podcast Downloads**   | ✅ Complete | ❌ Missing     | `@nce/shared/usePodcast*` + FileSystem | **Task M-03**      |
| **Voice Mode**          | ✅ Complete | ✅ Complete    | `@nce/shared/useNegotiationSession`    | 协商式听力         |
| **Voice Lab**           | ✅ Complete | ❌ Missing     | Platform-specific                      | **Task M-08** (P2) |
| **Dictionary (Screen)** | ✅ Complete | ⚠️ Placeholder | `@nce/shared/useWordExplainer`         | **Task M-04**      |
| **Settings**            | ✅ Complete | ✅ Basic       | `@nce/store/useAuthStore`              | 仅登出，缺偏好设置 |
| **Image Lightbox**      | ✅ Complete | ❌ Missing     | -                                      | **Task M-05**      |
| **Sweep (Bulk Mark)**   | ✅ Complete | ❌ Missing     | -                                      | **Task M-06**      |
| **Proficiency Lab**     | ✅ Complete | ❌ Missing     | -                                      | **Task M-09** (P2) |
| **AUI Demo**            | ✅ Complete | ❌ Missing     | -                                      | **Task M-10** (P3) |

### Task Backlog for Mobile Feature Parity

#### P0 - Critical Missing (用户无法完成核心流程)

| Task ID  | Feature           | Description                                 | Effort | Dependencies    |
| -------- | ----------------- | ------------------------------------------- | ------ | --------------- |
| **M-01** | Register Screen   | 创建注册页面，复用`useAuthStore.register()` | 0.5d   | None            |
| **M-02** | Global Player Bar | 底部持久化播放条，跨页面播放控制            | 2d     | Expo AV Context |
| **M-03** | Podcast Downloads | 离线下载管理(进度显示、删除、空间统计)      | 3d     | FileSystem API  |

#### P1 - Important Enhancement (体验提升)

| Task ID  | Feature           | Description                         | Effort | Dependencies            |
| -------- | ----------------- | ----------------------------------- | ------ | ----------------------- |
| **M-04** | Dictionary Screen | 独立词典页面(非Modal)，支持搜索历史 | 1d     | useWordExplainer        |
| **M-05** | Image Lightbox    | 阅读中图片点击放大(Pinch-to-zoom)   | 1d     | react-native-reanimated |
| **M-06** | Sweep Bulk Mark   | 阅读模式批量标记已知词              | 0.5d   | None                    |
| **M-07** | Rich Settings     | 偏好设置(TTS语速、主题、通知)       | 1d     | AsyncStorage            |

#### P2 - Advanced Features (高级功能)

| Task ID  | Feature         | Description                 | Effort | Dependencies       |
| -------- | --------------- | --------------------------- | ------ | ------------------ |
| **M-08** | Voice Lab       | Neural Link (WS + PTT)      | DONE   | expo-av, WebSocket |
| **M-09** | Proficiency Lab | 能力校准界面(阅读测试→分级) | DONE   | None               |

#### P3 - Optional (可选)

| Task ID  | Feature     | Description                                | Effort | Dependencies         |
| -------- | ----------- | ------------------------------------------ | ------ | -------------------- |
| **M-10** | AUI Demo    | Agent流式UI演示                            | 2d     | WebSocket            |
| **M-11** | Debug Views | ReviewDebug, MemoryCurveDebug (开发者工具) | 1d     | None                 |
| **M-12** | OPML Import | 播客订阅导入/导出                          | 1d     | expo-document-picker |

---

## Phase 4: Developer Guidelines

> **Expo Official**: [Using Libraries](https://docs.expo.dev/workflow/using-libraries/)

### 4.0 Critical: Development Builds & Background Audio

**Background Audio** (and other native capabilities like Notifications) **DO NOT work** reliably in the standard Expo Go app on the App Store/Play Store.

To test these features, you must create a **Development Build**:

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

#### Audio Strategy 2025

- **Current**: We use `expo-av` for simplicity. It handles playback well but lacks native Lock Screen / Notification Center controls (Play/Pause/Next buttons outside the app).
- **Recommendation**: For a production-grade Podcast experience, migrate to **`react-native-track-player`**. This library provides full OS integration for media controls but requires custom native code (config plugins), which reinforces the need for Development Builds.

### 4.1 Expo Library Selection Guidelines

选择第三方库时遵循以下优先级:

1. **Expo SDK 优先**: 优先使用 `expo-*` 包 (如 `expo-av`, `expo-file-system`)
2. **React Native Directory**: 查阅 [reactnative.directory](https://reactnative.directory/) 确认兼容性
3. **Development Build**: 需要原生代码的库必须使用 Development Build，不能在 Expo Go 中运行
4. **版本兼容**: 使用 `npx expo install` 而非 `npm install`，确保版本兼容

```bash
# 安装库的正确方式
npx expo install @react-native-async-storage/async-storage

# 检查库的GitHub页面
npx npm-home --github react-native-track-player
```

**当前项目使用的 Expo SDK 库**:

- `expo-av` - 音频播放 (Podcast)
- `expo-font` - 自定义字体
- `@react-native-async-storage/async-storage` - 本地存储
- `react-native-webview` - WebView (阅读器)
- `lucide-react-native` - 图标

**待评估的库 (用于待实现功能)**:

- `expo-file-system` - 离线下载 (M-03)
- `react-native-reanimated` - 手势动画 (M-05)
- `expo-document-picker` - OPML导入 (M-12)

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

## Migration Roadmap (Updated 2026-01-29)

### Phase 1-2: Foundation (COMPLETED)

- [x] Create `packages/store` with Zustand
- [x] Create `packages/ui-tokens` with shared Tailwind preset
- [x] Migrate auth from Context to Zustand store
- [x] Update both apps to use shared tokens

### Phase 3-4: API & Hooks (COMPLETED)

- [x] Expand `packages/api` with all endpoints
- [x] Create `useArticleList`, `useArticleReader` hooks
- [x] Move `useReadingTracker` to shared with platform adapter
- [x] Create `useSentenceStudy`, `useReviewQueue` hooks
- [x] Create `usePodcast*` hooks (5个)
- [x] Create `useSentenceExplainer` hook
- [x] Fix SSE streaming buffer issue (`sseParser.ts`)

### Phase 5-6: Mobile Core (COMPLETED)

- [x] Implement full Article Reader on mobile (WebView)
- [x] Implement Review Queue on mobile (SM-2)
- [x] Implement Performance Dashboard on mobile
- [x] Implement Podcast features on mobile (Discovery + Player)
- [x] Implement Voice Mode on mobile
- [x] Implement Settings on mobile (Basic)

### Phase 7: Feature Parity (CURRENT - 2026-02)

> **Goal**: Close the remaining 20% feature gap with Web

**Sprint 7.1 (Week 1)** - P0 Critical:

- [ ] **M-01**: Register Screen (0.5d)
- [ ] **M-02**: Global Player Bar (2d) - 需要重构Podcast Context
- [ ] **M-03**: Podcast Downloads View (3d)

**Sprint 7.2 (Week 2)** - P1 Enhancement:

- [ ] **M-04**: Dictionary Screen (1d)
- [ ] **M-05**: Image Lightbox (1d)
- [ ] **M-06**: Sweep Bulk Mark (0.5d)
- [ ] **M-07**: Rich Settings (1d)

### Phase 8: Polish & QA (2026-03)

- [ ] Cross-device testing (iOS/Android/Tablet)
- [ ] Performance optimization (Bundle size, Memory)
- [ ] Accessibility audit (VoiceOver, TalkBack)
- [ ] Store submission preparation

---

## Task Implementation Guides

> 以下是各任务的详细实现指南，供后续开发者参考。

### M-01: Register Screen

**目标**: 创建用户注册页面

**文件位置**: `apps/mobile/app/auth/register.tsx`

**实现步骤**:

1. 复制 `login.tsx` 作为模板
2. 添加 `username` 输入框 (可选)
3. 添加密码确认输入框
4. 添加密码强度指示器 (参考 Web 版 `RegisterPage.jsx`)
5. 调用 `useAuthStore().register(email, password, username)`
6. 成功后自动登录并跳转

**参考代码**:

```tsx
// apps/mobile/app/auth/register.tsx
import { useAuthStore } from "@nce/store";

export default function RegisterScreen() {
  const { register, isLoading, error } = useAuthStore();

  const handleRegister = async () => {
    await register(email, password, username);
    // 成功后 _layout.tsx 会自动检测登录状态并跳转
  };
}
```

---

### M-02: Global Player Bar

**目标**: 创建持久化的底部播放条，支持跨页面播放

**实现策略**: 使用 Expo AV 的全局 `Sound` 实例 + Zustand Store

**文件位置**:

- `apps/mobile/src/components/PlayerBar.tsx` - UI组件
- `packages/store/src/modules/podcast/` - 播放状态

**实现步骤**:

1. 在 `@nce/store` 中创建 `usePodcastPlayerStore`:
   ```typescript
   interface PodcastPlayerState {
     currentEpisode: Episode | null;
     isPlaying: boolean;
     position: number;
     duration: number;
     playbackRate: number;
     // Actions
     play: (episode: Episode) => Promise<void>;
     pause: () => void;
     seek: (position: number) => void;
     setRate: (rate: number) => void;
   }
   ```
2. 在 `_layout.tsx` 中添加全局播放条 (放在 Tabs 外层)
3. 实现 mini 和 expanded 两种状态
4. 处理后台播放 (可能需要 `expo-audio` 的新 API 或 `react-native-track-player`)

**注意事项**:

- Expo AV 的 `Sound` 不支持后台播放，需要 Development Build + 原生配置
- 考虑使用 `react-native-track-player` 作为替代

---

### M-03: Podcast Downloads View

**目标**: 管理离线下载的播客剧集

**文件位置**: `apps/mobile/app/podcast/downloads.tsx`

**技术栈**:

- `expo-file-system` - 文件下载和存储
- `@nce/store` - 下载状态管理

**实现步骤**:

1. 创建下载任务队列 Store:
   ```typescript
   interface DownloadTask {
     episodeId: string;
     progress: number; // 0-100
     status: "pending" | "downloading" | "completed" | "failed";
     localPath?: string;
   }
   ```
2. 实现下载功能:

   ```typescript
   import * as FileSystem from "expo-file-system";

   const downloadEpisode = async (episode) => {
     const callback = (progress) => {
       const percent =
         progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
       updateProgress(episode.id, percent * 100);
     };

     const downloadResumable = FileSystem.createDownloadResumable(
       episode.audio_url,
       FileSystem.documentDirectory + `podcasts/${episode.id}.mp3`,
       {},
       callback,
     );

     await downloadResumable.downloadAsync();
   };
   ```

3. 创建下载管理页面 (列表 + 进度 + 删除)
4. 在 Tab 导航中添加入口 (可作为 Podcast Tab 的子页面)

---

### M-04: Dictionary Screen

**目标**: 独立的词典查询页面 (非 Modal)

**文件位置**: `apps/mobile/app/(tabs)/dictionary.tsx` (替换占位符)

**实现步骤**:

1. 添加搜索框 (TextInput + 防抖)
2. 复用 `useWordExplainer` hook
3. 显示搜索历史 (AsyncStorage)
4. 结果展示 (Collins + LDOCE 切换)

---

### M-05: Image Lightbox

**目标**: 阅读模式中图片点击放大

**技术栈**: `react-native-reanimated` + `react-native-gesture-handler`

**实现步骤**:

1. 安装依赖: `npx expo install react-native-reanimated react-native-gesture-handler`
2. 在 `htmlGenerator.ts` 中为图片添加点击事件
3. 创建 `ImageLightbox.tsx` 组件 (支持 Pinch-to-zoom, Pan)
4. 在 `reading/[id].tsx` 中处理 `imageClick` 消息

---

### M-06: Sweep Bulk Mark

**目标**: 批量标记已知词

**实现步骤**:

1. 在阅读器顶部添加 "Sweep" 按钮
2. 调用 `readingApi.markAllKnown(articleId)` (需后端支持)
3. 刷新高亮状态

---

## Success Metrics (Updated)

| Metric                               | Baseline | Current | Target |
| ------------------------------------ | -------- | ------- | ------ |
| Lines of duplicated code             | ~500+    | <50     | <50    |
| Shared packages used by both apps    | 2        | 4       | 4      |
| Time to add new feature to both apps | 2x       | 1.3x    | 1.2x   |
| Mobile feature parity (%)            | 30%      | 80%     | 95%    |
| Shared hooks usage                   | 0%       | 100%    | 100%   |

---

## References

- [Expo - Using Libraries](https://docs.expo.dev/workflow/using-libraries/)
- [React Native Directory](https://reactnative.directory/)
- [Folo Project Architecture](D:/Documents/GitHub/js/Folo/TECHNICAL_ARCHITECTURE.md)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [TanStack Query for React Native](https://tanstack.com/query/latest/docs/react/react-native)
- [NativeWind v4](https://www.nativewind.dev/)
