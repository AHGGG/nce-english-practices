# Mobile Development Quick Reference

> **目标**: 一端开发，多端使用。Mobile 开发者只写 UI，业务逻辑全部复用。

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

| 当前位置                                             | 目标位置                                         | 优先级 |
| ---------------------------------------------------- | ------------------------------------------------ | ------ |
| `apps/mobile/src/modules/study/api.ts`               | `packages/api/src/endpoints/reading.ts`          | P0     |
| `apps/mobile/src/modules/study/useReadingTracker.ts` | `packages/shared/src/hooks/useReadingTracker.ts` | P0     |
| `apps/mobile/src/context/AuthContext.tsx`            | `packages/store/src/modules/auth/`               | P1     |
| `apps/web/src/context/AuthContext.jsx`               | `packages/store/src/modules/auth/`               | P1     |

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

- [完整架构规划](./MOBILE_ARCHITECTURE_PLAN.md)
- [Folo 项目参考](D:/Documents/GitHub/js/Folo)
- [Zustand 文档](https://zustand-demo.pmnd.rs/)
- [TanStack Query 文档](https://tanstack.com/query)
- [NativeWind 文档](https://www.nativewind.dev/)
