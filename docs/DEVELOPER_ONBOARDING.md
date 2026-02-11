# Developer Onboarding Guide - Mobile Cross-Platform Development

> 本文档面向后续开发者，介绍如何在已建立的跨端架构上进行开发。

---

## Quick Start

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动开发服务器

```bash
# 全栈启动 (Backend + Web + Mobile)
pnpm turbo dev

# 单独启动 Mobile
pnpm turbo dev --filter=@nce/mobile
```

### 3. 理解架构

```
packages/
├── api/           # API 调用 + 类型定义
│   └── src/
│       ├── auth.ts           # AuthService 单例
│       ├── storage.ts        # 跨平台存储适配器
│       └── endpoints/        # ✨ 所有 API 都在这里
│           ├── reading.ts    # readingApi
│           ├── dictionary.ts # dictionaryApi
│           └── sentence-study.ts
│
├── shared/        # 业务逻辑 Hooks
│   └── src/
│       ├── platform/         # 平台适配器
│       │   └── adapter.ts    # setPlatformAdapter()
│       ├── hooks/            # ✨ 所有业务 Hook 都在这里
│       │   ├── useWordExplainer.ts
│       │   └── useReadingTracker.ts
│       └── utils/
│           └── sseParser.ts
│
├── store/         # 全局状态 (Zustand)
│   └── src/
│       ├── lib/storage.ts    # Zustand 持久化适配器
│       └── modules/
│           └── auth/         # ✨ Auth Store 示例
│               ├── store.ts
│               ├── hooks.ts
│               └── types.ts
│
└── ui-tokens/     # 设计系统
    ├── tailwind.config.js    # Tailwind 预设
    └── src/
        ├── colors.ts         # 颜色定义
        ├── typography.ts     # 字体定义
        └── css-variables.ts  # CSS 变量生成
```

---

## 核心模式

### Pattern 1: 添加新 API 端点

**步骤**:

1. 在 `packages/api/src/endpoints/` 创建文件
2. 在 `packages/api/src/endpoints/index.ts` 导出
3. 两端直接使用

**示例** - 添加 Podcast API:

```typescript
// packages/api/src/endpoints/podcast.ts
import { authFetch } from "../auth";

export const podcastApi = {
  async getSubscriptions() {
    const res = await authFetch("/api/podcast/subscriptions");
    return res.json();
  },

  async subscribe(feedUrl: string) {
    const res = await authFetch("/api/podcast/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feed_url: feedUrl }),
    });
    return res.json();
  },
};

// packages/api/src/endpoints/index.ts
export * from "./podcast"; // 添加这行
```

**使用**:

```tsx
// apps/web 或 apps/mobile 都一样
import { podcastApi } from "@nce/api";

const subs = await podcastApi.getSubscriptions();
```

---

### Pattern 2: 添加新业务 Hook

**步骤**:

1. 在 `packages/shared/src/hooks/` 创建文件
2. 在 `packages/shared/src/index.ts` 导出
3. 两端直接使用

**示例** - 添加 usePodcastList:

```typescript
// packages/shared/src/hooks/usePodcastList.ts
import { useState, useEffect } from "react";
import { podcastApi } from "@nce/api";

export function usePodcastList() {
  const [podcasts, setPodcasts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await podcastApi.getSubscriptions();
        setPodcasts(data.subscriptions || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  return { podcasts, isLoading, error };
}

// packages/shared/src/index.ts
export * from "./hooks/usePodcastList"; // 添加这行
```

**使用**:

```tsx
// apps/web/src/views/PodcastPage.jsx
import { usePodcastList } from "@nce/shared";

function PodcastPage() {
  const { podcasts, isLoading } = usePodcastList();
  // ...
}

// apps/mobile/app/podcast/index.tsx
import { usePodcastList } from "@nce/shared";

function PodcastScreen() {
  const { podcasts, isLoading } = usePodcastList();
  // ...
}
```

---

### Pattern 3: 添加 Zustand Store

**步骤**:

1. 在 `packages/store/src/modules/` 创建模块目录
2. 创建 `types.ts`, `store.ts`, `hooks.ts`, `index.ts`
3. 在 `packages/store/src/index.ts` 导出

**示例** - 添加 Player Store:

```typescript
// packages/store/src/modules/player/types.ts
export interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  position: number;
  play: (track: Track) => void;
  pause: () => void;
  seek: (position: number) => void;
}

// packages/store/src/modules/player/store.ts
import { create } from "zustand";
import type { PlayerState } from "./types";

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTrack: null,
  isPlaying: false,
  position: 0,
  play: (track) => set({ currentTrack: track, isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  seek: (position) => set({ position }),
}));

// packages/store/src/modules/player/hooks.ts
import { usePlayerStore } from "./store";

export const useCurrentTrack = () => usePlayerStore((s) => s.currentTrack);
export const useIsPlaying = () => usePlayerStore((s) => s.isPlaying);

// packages/store/src/modules/player/index.ts
export * from "./types";
export * from "./store";
export * from "./hooks";

// packages/store/src/index.ts
export * from "./modules/player"; // 添加这行
```

---

### Pattern 4: 平台特定代码

当必须使用平台特定 API 时，使用 Platform Adapter 模式。

**示例** - 添加 Haptic Feedback:

```typescript
// packages/shared/src/platform/adapter.ts
export interface HapticAdapter {
  impact: (style: 'light' | 'medium' | 'heavy') => void;
  notification: (type: 'success' | 'warning' | 'error') => void;
}

export interface PlatformAdapter {
  visibility: VisibilityAdapter;
  haptic?: HapticAdapter;  // 可选，Web 可以不实现
}

// apps/mobile/src/lib/platform-init.ts
import * as Haptics from 'expo-haptics';

setPlatformAdapter({
  visibility: { ... },
  haptic: {
    impact: (style) => {
      const map = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
      };
      Haptics.impactAsync(map[style]);
    },
    notification: (type) => {
      const map = {
        success: Haptics.NotificationFeedbackType.Success,
        warning: Haptics.NotificationFeedbackType.Warning,
        error: Haptics.NotificationFeedbackType.Error,
      };
      Haptics.notificationAsync(map[type]);
    },
  },
});

// packages/shared/src/hooks/useFeedback.ts
import { getPlatformAdapter } from '../platform';

export function useFeedback() {
  const adapter = getPlatformAdapter();

  return {
    success: () => adapter?.haptic?.notification('success'),
    error: () => adapter?.haptic?.notification('error'),
    tap: () => adapter?.haptic?.impact('light'),
  };
}
```

---

## 常见任务速查

### 添加新功能

| 任务         | 做什么        | 在哪里做                        |
| ------------ | ------------- | ------------------------------- |
| 调用新 API   | 创建 API 方法 | `packages/api/src/endpoints/`   |
| 共享业务逻辑 | 创建 Hook     | `packages/shared/src/hooks/`    |
| 全局状态     | 创建 Store    | `packages/store/src/modules/`   |
| 平台特定功能 | 扩展适配器    | `packages/shared/src/platform/` |
| UI 组件      | 各端自己写    | `apps/web/` 或 `apps/mobile/`   |

### 调试共享代码

```bash
# 1. 在 Web 上调试 (更方便)
pnpm turbo dev --filter=@nce/web

# 2. 打开 Chrome DevTools
# 3. 在 Sources 面板找 packages/shared 或 packages/api
# 4. 打断点
```

### 类型报错

如果看到 `Cannot find module '@nce/xxx'`:

```bash
# 重新安装依赖
pnpm install

# 重启 TS Server (VS Code: Ctrl+Shift+P -> Restart TS Server)
```

---

## 待完成任务

以下任务可按需完成：

### P0 (核心体验)

- [ ] 将 `apps/mobile/src/modules/study/api.ts` 删除 (已迁移到 @nce/api)
- [ ] 将 `apps/mobile/src/modules/study/useReadingTracker.ts` 删除 (已迁移到 @nce/shared)
- [ ] 将 `apps/mobile/src/context/AuthContext.tsx` 迁移到 `@nce/store`
- [ ] 将 `apps/web/src/context/AuthContext.jsx` 迁移到 `@nce/store`

### P1 (功能完善)

- [ ] 创建 `usePodcastPlayer` 共享 Hook
- [ ] 创建 `useReviewQueue` 共享 Hook
- [ ] 创建 `usePerformanceStats` 共享 Hook

### P2 (体验优化)

- [ ] 添加 `@nce/store` 中的 settings 模块
- [ ] 添加离线队列支持 (失败的 API 调用)
- [ ] 添加乐观更新模式

---

## 参考资源

- [完整架构规划](./MOBILE_ARCHITECTURE_PLAN.md)
- [快速参考卡片](./MOBILE_QUICK_REFERENCE.md)
- [Folo 项目参考](https://github.com/RSSNext/Folo)
- [Zustand 文档](https://zustand-demo.pmnd.rs/)
- [TanStack Query 文档](https://tanstack.com/query)
