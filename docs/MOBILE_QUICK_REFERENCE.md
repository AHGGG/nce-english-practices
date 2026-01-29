# Mobile Development Quick Reference

> **目标**: 一端开发，多端使用。Mobile 开发者只写 UI，业务逻辑全部复用。  
> **Last Updated**: 2026-01-29

---

## 当前状态速览

| 指标                | 值    | 说明                              |
| ------------------- | ----- | --------------------------------- |
| **共享 Hooks 使用** | 11/11 | ✅ 100% 业务逻辑已共享            |
| **API 复用**        | 100%  | ✅ 全部通过 `@nce/api`            |
| **功能对等度**      | 80%   | ⚠️ 缺少注册、离线下载、全局播放条 |
| **待完成任务**      | 12 个 | 见 MOBILE_ARCHITECTURE_PLAN.md    |

### P0 待完成 (阻塞核心流程)

| Task | Feature           | Effort |
| ---- | ----------------- | ------ |
| M-01 | Register Screen   | 0.5d   |
| M-02 | Global Player Bar | 2d     |
| M-03 | Podcast Downloads | 3d     |

---

## 黄金法则

### 1. 永远不要在 `apps/mobile` 中写业务逻辑

```
❌ 错误做法:
apps/mobile/src/modules/study/api.ts  ← 这个不应该存在

✅ 正确做法:
packages/api/src/endpoints/reading.ts ← 在这里写，两端都能用
```

### 2. 添加新功能的标准流程

```
Step 1: 更新后端 → 运行 `pnpm turbo gen:types`
Step 2: 在 packages/api/src/endpoints/ 添加 API 方法
Step 3: 在 packages/shared/src/hooks/ 创建业务 Hook
Step 4: 在 apps/web 和 apps/mobile 各写 UI
```

### 3. 目录职责速查

| 包                   | 职责      | 允许的内容            |
| -------------------- | --------- | --------------------- |
| `packages/api`       | API 调用  | fetch 封装、类型定义  |
| `packages/shared`    | 业务逻辑  | Hooks、工具函数       |
| `packages/store`     | 全局状态  | Zustand stores        |
| `packages/ui-tokens` | 设计规范  | 颜色、字体、间距      |
| `apps/web`           | Web UI    | React 组件 (div/span) |
| `apps/mobile`        | Mobile UI | RN 组件 (View/Text)   |

---

## 常见任务模板

### 模板 A: 添加新的列表页面

```typescript
// 1. packages/api/src/endpoints/feature.ts
export const featureApi = {
  async getList() {
    const res = await authFetch('/api/feature/list');
    return res.json();
  },
};

// 2. packages/shared/src/hooks/useFeatureList.ts
import { useQuery } from '@tanstack/react-query';
import { featureApi } from '@nce/api';

export function useFeatureList() {
  const query = useQuery({
    queryKey: ['feature-list'],
    queryFn: featureApi.getList,
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// 3a. apps/web/src/views/FeatureList.jsx
import { useFeatureList } from '@nce/shared';

export default function FeatureList() {
  const { items, isLoading } = useFeatureList();
  if (isLoading) return <Spinner />;
  return <div className="grid grid-cols-2">{items.map(...)}</div>;
}

// 3b. apps/mobile/app/feature/index.tsx
import { useFeatureList } from '@nce/shared';

export default function FeatureScreen() {
  const { items, isLoading } = useFeatureList();
  if (isLoading) return <ActivityIndicator />;
  return <FlatList data={items} renderItem={...} />;
}
```

### 模板 B: 添加表单提交功能

```typescript
// 1. packages/api/src/endpoints/feature.ts
export const featureApi = {
  async create(data: CreateRequest) {
    const res = await authFetch("/api/feature", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.json();
  },
};

// 2. packages/shared/src/hooks/useFeatureCreate.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { featureApi } from "@nce/api";

export function useFeatureCreate() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: featureApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-list"] });
    },
  });

  return {
    create: mutation.mutate,
    isCreating: mutation.isPending,
    error: mutation.error,
  };
}
```

### 模板 C: 平台特定功能 (如震动、通知)

```typescript
// packages/shared/src/hooks/useFeedback.ts
export interface FeedbackAdapter {
  vibrate: () => void;
  playSound: (id: string) => void;
}

let adapter: FeedbackAdapter | null = null;

export function setFeedbackAdapter(a: FeedbackAdapter) {
  adapter = a;
}

export function useFeedback() {
  return {
    success: () => {
      adapter?.vibrate();
      adapter?.playSound("success");
    },
    error: () => {
      adapter?.vibrate();
      adapter?.playSound("error");
    },
  };
}

// apps/mobile/app/_layout.tsx
import { setFeedbackAdapter } from "@nce/shared";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";

setFeedbackAdapter({
  vibrate: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  playSound: async (id) => {
    const sound = new Audio.Sound();
    await sound.loadAsync(require(`./assets/sounds/${id}.mp3`));
    await sound.playAsync();
  },
});
```

---

## 待迁移的重复代码

以下文件应该删除，逻辑移到 `packages/` 中:

| 当前位置                                             | 目标位置                                         | 状态      |
| ---------------------------------------------------- | ------------------------------------------------ | --------- |
| `apps/mobile/src/modules/study/api.ts`               | `packages/api/src/endpoints/reading.ts`          | ✅ 已完成 |
| `apps/mobile/src/modules/study/useReadingTracker.ts` | `packages/shared/src/hooks/useReadingTracker.ts` | ✅ 已完成 |
| `apps/mobile/src/context/AuthContext.tsx`            | `packages/store/src/modules/auth/`               | ✅ 已完成 |
| `apps/web/src/context/AuthContext.jsx`               | `packages/store/src/modules/auth/`               | ✅ 已完成 |

> **注意**: 目前没有需要迁移的重复代码，所有业务逻辑已在共享包中。

---

## 共享 Hooks 清单 (11个)

| Hook                    | 用途           | Mobile 使用位置                 |
| ----------------------- | -------------- | ------------------------------- |
| `useWordExplainer`      | 词典+AI解释    | `reading/[id].tsx`, `index.tsx` |
| `useArticleList`        | 文章列表       | `(tabs)/library.tsx`            |
| `useArticleReader`      | 文章详情+追踪  | `reading/[id].tsx`              |
| `useReadingTracker`     | 阅读会话追踪   | `reading/[id].tsx`              |
| `useSentenceStudy`      | 句子精读流程   | `study/[id].tsx`                |
| `useSentenceExplainer`  | 句子多阶段解释 | `SentenceInspectorModal.tsx`    |
| `useReviewQueue`        | SM-2复习队列   | `(tabs)/index.tsx`              |
| `usePerformanceStats`   | 学习数据统计   | `(tabs)/stats.tsx`              |
| `useNegotiationSession` | 语音协商模式   | `(tabs)/voice.tsx`              |
| `usePodcast*` (5个)     | 播客全功能     | `podcast/*.tsx`                 |

---

## 样式规范

### 颜色 Token (共享)

```css
/* 使用 Tailwind 语义化 Token，不要用原始颜色 */
✅ className="bg-bg-surface text-text-primary border-border"
❌ className="bg-[#0A0A0A] text-[#E0E0E0] border-[#1A1A1A]"
```

### 字体 (共享)

```css
/* 内容字体: serif */
className="font-serif"

/* UI 字体: mono */
className="font-mono"

/* 标题字体: sans */
className="font-sans font-bold"
```

---

## 常见问题

### Q: 为什么我的 Hook 在 Mobile 报错?

A: 检查 Hook 是否使用了 Web-only API:

- `document` → 使用 Platform Adapter
- `window` → 使用 `Dimensions` from `react-native`
- `localStorage` → 使用 `@react-native-async-storage/async-storage`

### Q: 如何调试共享 Hook?

A: 在 Web 上调试更方便:

```bash
pnpm turbo dev --filter=@nce/web
# 打开 Chrome DevTools，在 Hook 中打断点
```

### Q: Metro 报错找不到模块?

A: 检查 `metro.config.js` 的 alias 配置:

```javascript
// 确保这些模块被正确重定向
if (moduleName === "react-native-webview" && platform === "web") {
  return {
    filePath: require.resolve("react-native-web-webview"),
    type: "sourceFile",
  };
}
```

---

## 资源链接

- [完整架构规划](./MOBILE_ARCHITECTURE_PLAN.md) - 包含详细任务列表和实现指南
- [Expo Using Libraries](https://docs.expo.dev/workflow/using-libraries/) - 官方库选择指南
- [React Native Directory](https://reactnative.directory/) - 第三方库兼容性查询
- [Zustand 文档](https://zustand-demo.pmnd.rs/)
- [TanStack Query 文档](https://tanstack.com/query)
- [NativeWind 文档](https://www.nativewind.dev/)

---

## Expo 库安装规范

```bash
# 正确方式 - 使用 expo install 确保版本兼容
npx expo install expo-file-system

# 错误方式 - 可能导致版本不兼容
npm install expo-file-system
```

### 当前使用的库

| 库                            | 用途       | Expo Go 兼容 |
| ----------------------------- | ---------- | ------------ |
| `expo-av`                     | 音频播放   | ✅           |
| `expo-font`                   | 自定义字体 | ✅           |
| `@react-native-async-storage` | 本地存储   | ✅           |
| `react-native-webview`        | WebView    | ✅           |
| `lucide-react-native`         | 图标       | ✅           |

### 待评估的库 (用于待实现功能)

| 库                          | 用途     | 需要 Dev Build |
| --------------------------- | -------- | -------------- |
| `expo-file-system`          | 离线下载 | ❌             |
| `react-native-reanimated`   | 手势动画 | ❌             |
| `react-native-track-player` | 后台播放 | ✅ 需要        |
| `expo-document-picker`      | OPML导入 | ❌             |
