# Mobile Architecture Plan - Cross-Platform Code Reuse

> **Status**: v3.0 - Feature Parity Complete (95%+)  
> **Last Updated**: 2026-01-29  
> **Goal**: Minimize mobile-specific code, maximize "write once, run everywhere"

---

## Quick Status Overview

| Metric                    | Current | Target | Notes                                        |
| ------------------------- | ------- | ------ | -------------------------------------------- |
| **Mobile 屏幕数**         | 19      | 20     | 仅缺 VoiceLab (可选)                         |
| **共享 Hooks 使用率**     | 100%    | 100%   | ✅ 所有11个hooks已被Mobile使用               |
| **API 复用率**            | 100%    | 100%   | ✅ 全部通过@nce/api                          |
| **业务逻辑复用率**        | 95%+    | 95%+   | ✅ 仅UI层平台特定                            |
| **@nce/ui-tokens 使用率** | 75%     | 90%    | ⚠️ Tailwind preset 已集成，个别组件需调整    |
| **Web 功能对等度**        | 95%     | 95%    | ✅ 核心功能全部完成，仅缺开发者工具/VoiceLab |

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
| `useProficiencyTest`    | **DONE** | `packages/shared/src/hooks/` | ✅ Active    |

## Implementation Status (Mobile Screens)

| Screen                 | Status   | Location                       | Web Equivalent              |
| ---------------------- | -------- | ------------------------------ | --------------------------- |
| Root Layout            | **DONE** | `app/_layout.tsx`              | -                           |
| Login                  | **DONE** | `app/auth/login.tsx`           | `LoginPage.jsx`             |
| Register               | **DONE** | `app/auth/register.tsx`        | `RegisterPage.jsx`          |
| Tab Navigation         | **DONE** | `app/(tabs)/_layout.tsx`       | `NavDashboard.jsx`          |
| Library (Article List) | **DONE** | `app/(tabs)/library.tsx`       | `ArticleListView.jsx`       |
| Reading                | **DONE** | `app/reading/[id].tsx`         | `ReaderView.jsx`            |
| Sentence Study         | **DONE** | `app/study/[id].tsx`           | `SentenceStudy.jsx`         |
| Review Queue           | **DONE** | `app/(tabs)/index.tsx`         | `ReviewQueue.jsx`           |
| Stats Dashboard        | **DONE** | `app/(tabs)/stats.tsx`         | `PerformanceReport.jsx`     |
| Podcast Discovery      | **DONE** | `app/(tabs)/podcast.tsx`       | `PodcastLibraryView.jsx`    |
| Podcast Detail         | **DONE** | `app/podcast/[id].tsx`         | `PodcastFeedDetailView.jsx` |
| Podcast Preview        | **DONE** | `app/podcast/preview.tsx`      | (Same)                      |
| Podcast Player         | **DONE** | `app/podcast/player.tsx`       | Context-based               |
| Podcast Downloads      | **DONE** | `app/podcast/downloads.tsx`    | `PodcastDownloadsView.jsx`  |
| Global Player Bar      | **DONE** | `src/components/PlayerBar.tsx` | `PlayerBar.jsx`             |
| Voice Mode             | **DONE** | `app/(tabs)/voice.tsx`         | `NegotiationInterface.jsx`  |
| Dictionary             | **DONE** | `app/(tabs)/dictionary.tsx`    | `DictionaryModal.jsx`       |
| Settings               | **DONE** | `app/settings.tsx`             | `SettingsPage.jsx`          |
| Proficiency Lab        | **DONE** | `app/lab/calibration.tsx`      | `LabCalibration.jsx`        |
| Voice Lab              | **TODO** | -                              | `VoiceLab.jsx` (可选)       |

## Implementation Status (Mobile Components)

| Component              | Status   | Location                                       | Notes            |
| ---------------------- | -------- | ---------------------------------------------- | ---------------- |
| PlayerBar              | **DONE** | `src/components/PlayerBar.tsx`                 | 全局持久化播放条 |
| DictionaryModal        | **DONE** | `src/components/DictionaryModal.tsx`           | 词典弹窗         |
| DictionaryResultView   | **DONE** | `src/components/DictionaryResultView.tsx`      | 词典结果展示     |
| SentenceInspectorModal | **DONE** | `src/components/SentenceInspectorModal.tsx`    | 句子检查器       |
| ImageLightbox          | **DONE** | `src/components/ImageLightbox.tsx`             | 图片放大查看     |
| UniversalWebView       | **DONE** | `src/components/UniversalWebView.tsx`          | 跨平台WebView    |
| PodcastDetailView      | **DONE** | `src/components/podcast/PodcastDetailView.tsx` | 播客详情         |

## Implementation Status (Mobile Services)

| Service             | Status   | Location                                  | Notes                     |
| ------------------- | -------- | ----------------------------------------- | ------------------------- |
| AudioService        | **DONE** | `src/services/AudioService.ts`            | expo-av 后台播放          |
| DownloadService     | **DONE** | `src/services/DownloadService.ts`         | expo-file-system 离线下载 |
| NotificationService | **DONE** | `src/services/NotificationService.ts`     | 每日提醒通知              |
| MobileVoiceClient   | **DONE** | `src/services/voice/MobileVoiceClient.ts` | WebSocket PTT 语音        |
| audioUtils          | **DONE** | `src/services/voice/audioUtils.ts`        | PCM/WAV 音频处理          |

---

## Executive Summary

### Current State Analysis (Updated 2026-01-29)

| Aspect         | Web (`apps/web`)  | Mobile (`apps/mobile`) | Gap              |
| -------------- | ----------------- | ---------------------- | ---------------- |
| **Views**      | 18 complete views | 19 screens             | ✅ 仅缺 VoiceLab |
| **Components** | 50+ components    | 8 components           | ✅ 核心组件完成  |
| **Hooks**      | 11 shared hooks   | 100% 复用 @nce/shared  | ✅ 完全复用      |
| **API Layer**  | `@nce/api`        | 100% 复用 @nce/api     | ✅ 完全复用      |
| **State**      | `@nce/store`      | 100% 复用 @nce/store   | ✅ 完全复用      |
| **Styling**    | Tailwind + tokens | NativeWind + tokens    | ✅ 共享 preset   |

### Achieved Architecture

```
/
├── apps/
│   ├── web/                # Vite + React (Browser)
│   └── mobile/             # Expo + React Native (iOS/Android)
│       ├── app/            # 19 Expo Router screens
│       └── src/
│           ├── components/ # 8 platform-specific UI components
│           ├── services/   # 5 native services (Audio, Download, Voice, etc.)
│           └── utils/      # HTML generator for WebView
│
├── packages/
│   ├── api/                # ✓ Auth, 5 endpoint modules, Types
│   ├── shared/             # ✓ 11 business logic hooks, SSE parser
│   ├── store/              # ✓ 4 Zustand stores (auth, podcast, download, settings)
│   └── ui-tokens/          # ✓ Design tokens, Tailwind preset
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

| Feature                 | Web Status  | Mobile Status | Shared Hook/Logic                   | Notes              |
| ----------------------- | ----------- | ------------- | ----------------------------------- | ------------------ |
| **Login**               | ✅ Complete | ✅ Complete   | `@nce/store/useAuthStore`           |                    |
| **Register**            | ✅ Complete | ✅ Complete   | `@nce/store/useAuthStore`           | 密码强度验证完成   |
| **Article List**        | ✅ Complete | ✅ Complete   | `@nce/shared/useArticleList`        |                    |
| **Article Reader**      | ✅ Complete | ✅ Complete   | `@nce/shared/useArticleReader`      | WebView实现        |
| **Word Inspector**      | ✅ Complete | ✅ Complete   | `@nce/shared/useWordExplainer`      | Modal形式          |
| **Sentence Inspector**  | ✅ Complete | ✅ Complete   | `@nce/shared/useSentenceExplainer`  | Modal形式          |
| **Sentence Study**      | ✅ Complete | ✅ Complete   | `@nce/shared/useSentenceStudy`      | 4阶段AI辅助        |
| **Review Queue**        | ✅ Complete | ✅ Complete   | `@nce/shared/useReviewQueue`        | SM-2算法           |
| **Performance Stats**   | ✅ Complete | ✅ Complete   | `@nce/shared/usePerformanceStats`   |                    |
| **Podcast Discovery**   | ✅ Complete | ✅ Complete   | `@nce/shared/usePodcast*`           | 搜索+订阅          |
| **Podcast Detail**      | ✅ Complete | ✅ Complete   | `@nce/shared/usePodcastFeed`        |                    |
| **Podcast Player**      | ✅ Complete | ✅ Complete   | `@nce/store/usePodcastStore`        | 全屏播放器         |
| **Global Player Bar**   | ✅ Complete | ✅ Complete   | `@nce/store/usePodcastStore`        | 跨页面持久化播放条 |
| **Podcast Downloads**   | ✅ Complete | ✅ Complete   | `@nce/store/useDownloadStore`       | expo-file-system   |
| **Voice Mode**          | ✅ Complete | ✅ Complete   | `@nce/shared/useNegotiationSession` | PTT WebSocket实现  |
| **Dictionary (Screen)** | ✅ Complete | ✅ Complete   | `@nce/shared/useWordExplainer`      | 独立搜索页面       |
| **Settings**            | ✅ Complete | ✅ Complete   | `@nce/store/useSettingsStore`       | 偏好+通知+密码修改 |
| **Image Lightbox**      | ✅ Complete | ✅ Complete   | -                                   | 点击放大           |
| **Sweep (Bulk Mark)**   | ✅ Complete | ✅ Complete   | `@nce/api/proficiencyApi`           | 阅读设置中实现     |
| **Proficiency Lab**     | ✅ Complete | ✅ Complete   | `@nce/shared/useProficiencyTest`    | 能力校准完成       |
| **Voice Lab**           | ✅ Complete | ❌ Missing    | Platform-specific                   | **Task M-08** (P3) |
| **AUI Demo**            | ✅ Complete | ❌ Missing    | -                                   | **Task M-10** (P3) |
| **Debug Views**         | ✅ Complete | ❌ Missing    | -                                   | **Task M-11** (P3) |
| **OPML Import**         | ✅ Complete | ❌ Missing    | -                                   | **Task M-12** (P3) |

### Task Backlog for Mobile Feature Parity

#### ~~P0 - Critical Missing~~ (ALL COMPLETED ✅)

| Task ID  | Feature           | Status   | Notes                          |
| -------- | ----------------- | -------- | ------------------------------ |
| ~~M-01~~ | Register Screen   | **DONE** | `app/auth/register.tsx`        |
| ~~M-02~~ | Global Player Bar | **DONE** | `src/components/PlayerBar.tsx` |
| ~~M-03~~ | Podcast Downloads | **DONE** | `app/podcast/downloads.tsx`    |

#### ~~P1 - Important Enhancement~~ (ALL COMPLETED ✅)

| Task ID  | Feature           | Status   | Notes                                 |
| -------- | ----------------- | -------- | ------------------------------------- |
| ~~M-04~~ | Dictionary Screen | **DONE** | `app/(tabs)/dictionary.tsx`           |
| ~~M-05~~ | Image Lightbox    | **DONE** | `src/components/ImageLightbox.tsx`    |
| ~~M-06~~ | Sweep Bulk Mark   | **DONE** | 集成在 `reading/[id].tsx` 设置Modal中 |
| ~~M-07~~ | Rich Settings     | **DONE** | TTS语速、通知、主题、密码修改         |

#### ~~P2 - Advanced Features~~ (ALL COMPLETED ✅)

| Task ID  | Feature         | Status   | Notes                                  |
| -------- | --------------- | -------- | -------------------------------------- |
| ~~M-08~~ | Voice Lab       | **DONE** | `app/(tabs)/voice.tsx` + PTT WebSocket |
| ~~M-09~~ | Proficiency Lab | **DONE** | `app/lab/calibration.tsx`              |

#### P3 - Optional (开发者/高级功能)

> 以下功能为可选，不影响用户核心体验。

| Task ID  | Feature     | Description                                | Effort | Dependencies         | Priority |
| -------- | ----------- | ------------------------------------------ | ------ | -------------------- | -------- |
| **M-10** | AUI Demo    | Agent流式UI演示 (技术展示)                 | 2d     | WebSocket            | Low      |
| **M-11** | Debug Views | ReviewDebug, MemoryCurveDebug (开发者工具) | 1d     | None                 | Low      |
| **M-12** | OPML Import | 播客订阅导入/导出                          | 1d     | expo-document-picker | Low      |
| **M-13** | Voice Lab   | 多厂商语音测试 (ElevenLabs/Deepgram等)     | 3d     | Native audio         | Low      |

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

### Phase 1-2: Foundation (COMPLETED ✅)

- [x] Create `packages/store` with Zustand
- [x] Create `packages/ui-tokens` with shared Tailwind preset
- [x] Migrate auth from Context to Zustand store
- [x] Update both apps to use shared tokens

### Phase 3-4: API & Hooks (COMPLETED ✅)

- [x] Expand `packages/api` with all endpoints
- [x] Create `useArticleList`, `useArticleReader` hooks
- [x] Move `useReadingTracker` to shared with platform adapter
- [x] Create `useSentenceStudy`, `useReviewQueue` hooks
- [x] Create `usePodcast*` hooks (5个)
- [x] Create `useSentenceExplainer` hook
- [x] Fix SSE streaming buffer issue (`sseParser.ts`)
- [x] Create `useProficiencyTest` hook

### Phase 5-6: Mobile Core (COMPLETED ✅)

- [x] Implement full Article Reader on mobile (WebView)
- [x] Implement Review Queue on mobile (SM-2)
- [x] Implement Performance Dashboard on mobile
- [x] Implement Podcast features on mobile (Discovery + Player)
- [x] Implement Voice Mode on mobile (PTT WebSocket)
- [x] Implement Settings on mobile (Basic)

### Phase 7: Feature Parity (COMPLETED ✅ - 2026-01-29)

> **Achieved**: 95%+ feature parity with Web

**Sprint 7.1** - P0 Critical (COMPLETED):

- [x] **M-01**: Register Screen - `app/auth/register.tsx`
- [x] **M-02**: Global Player Bar - `src/components/PlayerBar.tsx`
- [x] **M-03**: Podcast Downloads View - `app/podcast/downloads.tsx`

**Sprint 7.2** - P1 Enhancement (COMPLETED):

- [x] **M-04**: Dictionary Screen - `app/(tabs)/dictionary.tsx`
- [x] **M-05**: Image Lightbox - `src/components/ImageLightbox.tsx`
- [x] **M-06**: Sweep Bulk Mark - Integrated in `reading/[id].tsx`
- [x] **M-07**: Rich Settings - `app/settings.tsx` with notifications, TTS, password

**Sprint 7.3** - P2 Advanced (COMPLETED):

- [x] **M-08**: Voice Mode - `app/(tabs)/voice.tsx` with `MobileVoiceClient.ts`
- [x] **M-09**: Proficiency Lab - `app/lab/calibration.tsx`

### Phase 8: Polish & QA (2026-03 - NEXT)

> **Focus**: Production readiness and store submission

- [ ] Cross-device testing (iOS/Android/Tablet)
- [ ] Performance optimization (Bundle size, Memory, Startup time)
- [ ] Accessibility audit (VoiceOver, TalkBack)
- [ ] Error tracking integration (Sentry)
- [ ] Store submission preparation (App Store / Play Store)
- [ ] OTA update setup (EAS Update)

### Phase 9: Optional Enhancements (Future)

> **Note**: These are nice-to-have features, not blocking for v1.0 release.

- [ ] **M-10**: AUI Streaming Demo
- [ ] **M-11**: Debug Views (ReviewDebug, MemoryCurveDebug)
- [ ] **M-12**: OPML Import/Export
- [ ] **M-13**: Voice Lab (multi-vendor TTS/STT testing)

---

## Task Implementation Guides

> 以下是**未完成**的可选任务实现指南，供后续开发者参考。

### M-10: AUI Streaming Demo

**目标**: 实现 Agent 流式 UI 演示页面

**文件位置**: `apps/mobile/app/aui-demo.tsx`

**技术栈**: WebSocket + React Native 动画

**实现步骤**:

1. 复用 Web 端 `AUIStreamHydrator` 逻辑
2. 创建 RN 版本的 AUI 组件:
   - `VocabularyGrid` → FlatList 实现
   - `FlashCard` → Animated.View 实现
   - `MarkdownMessage` → react-native-markdown-display
3. 建立 WebSocket 连接到 `/api/aui/ws`
4. 处理增量更新事件

**参考代码**:

```tsx
// apps/mobile/app/aui-demo.tsx
import { useEffect, useState } from "react";
import { View, FlatList } from "react-native";

export default function AUIDemo() {
  const [vocabularyCards, setVocabularyCards] = useState([]);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    ws.current = new WebSocket(
      `${getApiBaseUrl().replace("http", "ws")}/api/aui/ws`,
    );
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "vocabulary_update") {
        setVocabularyCards((prev) => [...prev, data.payload]);
      }
    };
    return () => ws.current?.close();
  }, []);

  return (
    <FlatList
      data={vocabularyCards}
      renderItem={({ item }) => <VocabCard word={item} />}
    />
  );
}
```

---

### M-11: Debug Views

**目标**: 移植 ReviewDebug 和 MemoryCurveDebug 到 Mobile

**文件位置**:

- `apps/mobile/app/debug/review.tsx`
- `apps/mobile/app/debug/memory-curve.tsx`

**技术栈**: Chart 库 (react-native-chart-kit 或 victory-native)

**实现步骤**:

1. 安装图表库: `npx expo install react-native-chart-kit react-native-svg`
2. 创建 API 调用 (复用 `@nce/api` 或直接 authFetch)
3. 实现图表渲染 (BarChart 用于 interval histogram)
4. 添加到 Settings 页面的开发者选项中

---

### M-12: OPML Import

**目标**: 支持从其他 Podcast 应用导入订阅

**文件位置**: `apps/mobile/app/podcast/import.tsx`

**技术栈**: expo-document-picker + XML parser

**实现步骤**:

1. 安装依赖: `npx expo install expo-document-picker`
2. 实现文件选择器:

   ```typescript
   import * as DocumentPicker from "expo-document-picker";

   const pickOPML = async () => {
     const result = await DocumentPicker.getDocumentAsync({
       type: "text/xml",
     });
     if (result.type === "success") {
       const content = await FileSystem.readAsStringAsync(result.uri);
       // Parse OPML and extract feed URLs
     }
   };
   ```

3. 解析 OPML XML (使用 fast-xml-parser)
4. 批量调用 `podcastApi.subscribe()` 导入订阅

---

### M-13: Voice Lab

**目标**: 多厂商语音 API 测试 (ElevenLabs, Deepgram, Dashscope)

**文件位置**: `apps/mobile/app/voice-lab.tsx`

**技术栈**: expo-av + WebSocket + 各厂商 API

**实现步骤**:

1. 复用 Web 端 `VoiceLab` 的 Tab 结构
2. 实现 TTS 面板 (文本转语音测试)
3. 实现 STT 面板 (Push-to-Talk 录音转文字)
4. 实现 Live 面板 (实时对话)

**注意事项**:

- 需要 Development Build (非 Expo Go)
- 音频格式需要适配 (iOS: WAV, Android: AAC)
- 参考 `MobileVoiceClient.ts` 的实现模式

---

## Success Metrics (Updated 2026-01-29)

| Metric                               | Baseline | Current   | Target | Status |
| ------------------------------------ | -------- | --------- | ------ | ------ |
| Lines of duplicated code             | ~500+    | **<50**   | <50    | ✅     |
| Shared packages used by both apps    | 2        | **4**     | 4      | ✅     |
| Time to add new feature to both apps | 2x       | **~1.2x** | 1.2x   | ✅     |
| Mobile feature parity (%)            | 30%      | **95%**   | 95%    | ✅     |
| Shared hooks usage                   | 0%       | **100%**  | 100%   | ✅     |

### Code Reuse Breakdown

| Package          | Web Usage | Mobile Usage | Reuse Rate |
| ---------------- | --------- | ------------ | ---------- |
| `@nce/api`       | ✅        | ✅           | 100%       |
| `@nce/shared`    | ✅        | ✅           | 100%       |
| `@nce/store`     | ✅        | ✅           | 100%       |
| `@nce/ui-tokens` | ✅        | ✅           | 75%\*      |

\*UI tokens 已通过 Tailwind preset 共享，但 Mobile 端仍有部分硬编码颜色需清理。

## Cross-Platform Development Best Practices

> 基于 React Native 官方文档和项目实践总结的跨平台开发模式。

### 1. Platform-Specific File Extensions

React Native bundler (Metro) 支持基于文件扩展名的平台分离：

```
Component.tsx          # 默认实现 (通常是 RN)
Component.web.tsx      # Web 专用实现
Component.ios.tsx      # iOS 专用实现
Component.android.tsx  # Android 专用实现
Component.native.tsx   # RN 通用 (iOS + Android)
```

**项目实例**:

```
src/components/
├── UniversalWebView.tsx      # React Native WebView
└── UniversalWebView.web.tsx  # Web iframe fallback
```

**导入时无需指定扩展名**:

```typescript
import { UniversalWebView } from "./components/UniversalWebView";
// Metro 自动选择正确的文件
```

### 2. Platform Adapter Pattern

对于需要平台特定 API 的共享逻辑，使用适配器模式：

```typescript
// packages/shared/src/platform/adapter.ts
export interface VisibilityAdapter {
  onVisibilityChange: (callback: (isVisible: boolean) => void) => () => void;
}

// apps/mobile/src/lib/platform-init.ts
import { setPlatformAdapter } from "@nce/shared";
import { AppState } from "react-native";

setPlatformAdapter({
  onVisibilityChange: (callback) => {
    const sub = AppState.addEventListener("change", (state) => {
      callback(state === "active");
    });
    return () => sub.remove();
  },
});

// apps/web/src/main.jsx
setPlatformAdapter({
  onVisibilityChange: (callback) => {
    const handler = () => callback(!document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  },
});
```

### 3. Storage Adapter Pattern

跨平台存储使用可插拔适配器：

```typescript
// packages/api/src/storage.ts
export interface TokenStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

// Mobile: AsyncStorage
// Web: localStorage wrapper
```

### 4. SSE Streaming Considerations

**问题**: React Native 的 `fetch` 不支持 `ReadableStream`。

**解决方案**:

- 使用 `response.text()` 一次性读取 (适用于较短响应)
- 或使用 polyfill: `react-native-polyfill-globals` + `web-streams-polyfill`
- 本项目 `useSentenceExplainer` 采用 text fallback 模式

### 5. WebView Bridge Strategy

对于复杂 HTML 渲染 (如阅读器)，使用 WebView + postMessage 桥接：

```typescript
// HTML Generator 注入事件处理
const html = `
  <script>
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('word')) {
        window.ReactNativeWebView?.postMessage(JSON.stringify({
          type: 'wordClick',
          payload: { word: e.target.textContent }
        }));
      }
    });
  </script>
`;

// RN 端接收
<WebView
  onMessage={(event) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === 'wordClick') handleWordClick(data.payload.word);
  }}
/>
```

---

## References

- [Expo - Using Libraries](https://docs.expo.dev/workflow/using-libraries/)
- [React Native - Platform Specific Code](https://reactnative.dev/docs/platform-specific-code)
- [React Native Directory](https://reactnative.directory/)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [TanStack Query for React Native](https://tanstack.com/query/latest/docs/react/react-native)
- [NativeWind v4](https://www.nativewind.dev/)
- [Expo Router v3](https://docs.expo.dev/router/introduction/)
- [Expo File System](https://docs.expo.dev/versions/latest/sdk/filesystem/)
- [Expo AV](https://docs.expo.dev/versions/latest/sdk/av/)
