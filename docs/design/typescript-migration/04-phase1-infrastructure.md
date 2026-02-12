# 4. Phase 1: 基础设施与类型定义

> **预计时间**: 1-2 天  
> **难度**: ⭐⭐☆☆☆

## 🎯 目标

建立类型安全的基础设施，为后续迁移铺路。这是整个迁移过程中最重要的一步，**不要跳过**。

## 📋 任务清单

- [ ] 任务 1: 增强 tsconfig.json
- [ ] 任务 2: 更新 ESLint 配置
- [ ] 任务 3: 创建全局类型定义
- [ ] 任务 4: 创建 API 类型定义
- [ ] 任务 5: 创建组件类型定义
- [ ] 任务 6: 创建类型工具函数
- [ ] 任务 7: 验证配置

---

## 任务 1: 增强 tsconfig.json

### 当前配置

`apps/web/tsconfig.json` 已经有基本配置，但我们需要确认和优化。

### 检查配置

打开 `apps/web/tsconfig.json`，确保包含以下配置：

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "checkJs": false,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### 关键配置说明

- **`strict: true`** - 启用所有严格类型检查
- **`allowJs: true`** - 允许导入 JS 文件（迁移期间必需）
- **`checkJs: false`** - 不检查 JS 文件（避免大量错误）
- **`paths`** - 路径别名，支持 `@/` 导入

### ✅ 验证

运行类型检查：

```bash
cd apps/web
pnpm typecheck
```

如果看到类型错误，这是正常的（因为还有很多 JS 文件）。只要命令能运行就说明配置正确。

---

## 任务 2: 更新 ESLint 配置

### 安装 TypeScript ESLint 插件

```bash
cd apps/web
pnpm add -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### 更新配置文件

编辑 `apps/web/eslint.config.js`，添加 TypeScript 支持。

**完整配置** 请参考 [环境准备](03-environment-setup.md#eslint-配置增强) 文档。

### ✅ 验证

运行 ESLint 检查：

```bash
cd apps/web
pnpm lint
```

---

## 任务 3: 创建全局类型定义

### 创建 `types/global.d.ts`

这个文件定义全局类型、环境变量等。

```typescript
// apps/web/src/types/global.d.ts

/// <reference types="vite/client" />

// 环境变量类型
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WS_URL?: string;
  // 添加其他环境变量
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// 全局类型
declare global {
  // Window 对象扩展
  interface Window {
    // 如果有全局变量，在这里声明
  }
}

// 模块声明
declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.jpg" {
  const content: string;
  export default content;
}

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

export {};
```

### 说明

- **`/// <reference types="vite/client" />`** - 引入 Vite 类型定义
- **`ImportMetaEnv`** - 定义环境变量类型
- **`declare global`** - 扩展全局类型
- **`declare module`** - 声明模块类型（图片、CSS 等）

---

## 任务 4: 创建 API 类型定义

### 创建 `types/api.d.ts`

这个文件基于 `schema.d.ts` 创建便捷的类型别名。

```typescript
// apps/web/src/types/api.d.ts

import type { components, paths } from "./schema";

// ============================================
// 通用类型
// ============================================

/**
 * API 响应包装类型
 */
export type ApiResponse<T> = {
  data: T;
  message?: string;
  status: "success" | "error";
};

/**
 * 分页响应类型
 */
export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
};

// ============================================
// Schema 类型别名（从 OpenAPI 生成）
// ============================================

// 认证相关
export type User = components["schemas"]["UserProfile"];
export type LoginRequest = components["schemas"]["LoginRequest"];
export type LoginResponse = components["schemas"]["TokenResponse"];
export type RegisterRequest = components["schemas"]["RegisterRequest"];

// 词典相关
export type DictionaryLookupResponse =
  components["schemas"]["DictionaryLookupResponse"];
export type DictionaryEntry = components["schemas"]["DictionaryEntry"];

// 词汇相关
export type VocabularyWord = components["schemas"]["VocabularyWord"];
export type WordContext = components["schemas"]["WordContext"];

// 复习相关
export type ReviewItem = components["schemas"]["ReviewItem"];
export type ReviewSession = components["schemas"]["ReviewSession"];
export type ReviewAttempt = components["schemas"]["ReviewAttempt"];

// Podcast 相关
export type PodcastFeed = components["schemas"]["PodcastFeed"];
export type PodcastEpisode = components["schemas"]["PodcastEpisode"];
export type PodcastPlayState = components["schemas"]["PodcastPlayState"];

// 阅读相关
export type ReadingSession = components["schemas"]["ReadingSession"];
export type ReadingContent = components["schemas"]["ReadingContent"];

// 句子学习相关
export type SentenceStudySession =
  components["schemas"]["SentenceStudySession"];
export type SentenceExplanation = components["schemas"]["SentenceExplanation"];

// ============================================
// 自定义类型（不在 OpenAPI 中）
// ============================================

/**
 * Toast 通知类型
 */
export type ToastType = "success" | "error" | "warning" | "info";

/**
 * Toast 消息
 */
export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

/**
 * 加载状态
 */
export type LoadingState = "idle" | "loading" | "success" | "error";

/**
 * 异步数据状态
 */
export interface AsyncData<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}
```

### 说明

- **`components['schemas']['...']`** - 从 OpenAPI 生成的类型
- **类型别名** - 创建简短易用的别名
- **自定义类型** - 定义前端特有的类型

### 如何使用

```typescript
// 使用类型别名
import type { User, PodcastFeed } from "@/types/api";

const user: User = {
  id: "1",
  email: "user@example.com",
  username: "user",
  role: "user",
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
};
```

---

## 任务 5: 创建组件类型定义

### 创建 `types/components.d.ts`

这个文件定义通用的组件 Props 类型。

```typescript
// apps/web/src/types/components.d.ts

import type { ReactNode, CSSProperties } from "react";

// ============================================
// 通用 Props 类型
// ============================================

/**
 * 基础组件 Props
 */
export interface BaseComponentProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * 可点击组件 Props
 */
export interface ClickableProps {
  onClick?: () => void;
  disabled?: boolean;
}

/**
 * 表单输入 Props
 */
export interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

// ============================================
// 特定组件 Props
// ============================================

/**
 * Card 组件 Props
 */
export interface CardProps extends BaseComponentProps {
  title?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  footer?: ReactNode;
}

/**
 * Dialog 组件 Props
 */
export interface DialogProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  footer?: ReactNode;
  maxWidth?: string;
}

/**
 * Toast 组件 Props
 */
export interface ToastProps {
  message: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number;
  onDismiss: () => void;
}

// ============================================
// 事件处理器类型
// ============================================

/**
 * 通用事件处理器
 */
export type EventHandler<T = void> = (event: T) => void;

/**
 * 鼠标事件处理器
 */
export type MouseEventHandler = EventHandler<React.MouseEvent<HTMLElement>>;

/**
 * 键盘事件处理器
 */
export type KeyboardEventHandler = EventHandler<
  React.KeyboardEvent<HTMLElement>
>;

/**
 * 表单提交处理器
 */
export type FormSubmitHandler = EventHandler<React.FormEvent<HTMLFormElement>>;

// ============================================
// Ref 类型
// ============================================

/**
 * HTML 元素 Ref 类型
 */
export type ElementRef<T extends HTMLElement = HTMLDivElement> =
  React.RefObject<T>;

/**
 * 可变 Ref 类型
 */
export type MutableRef<T> = React.MutableRefObject<T>;
```

### 说明

- **`BaseComponentProps`** - 所有组件的基础 Props
- **事件处理器类型** - 统一的事件处理器类型
- **Ref 类型** - 统一的 Ref 类型

---

## 任务 6: 创建类型工具函数

### 创建 `types/utils.ts`

这个文件提供类型工具函数。

```typescript
// apps/web/src/types/utils.ts

/**
 * 使所有属性可选
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 使所有属性必需
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * 提取 Promise 的返回类型
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * 提取数组元素类型
 */
export type ArrayElement<T> = T extends (infer U)[] ? U : never;

/**
 * 提取函数返回类型
 */
export type ReturnTypeOf<T> = T extends (...args: any[]) => infer R ? R : never;

/**
 * 提取函数参数类型
 */
export type ParametersOf<T> = T extends (...args: infer P) => any ? P : never;

/**
 * 创建只读类型
 */
export type Immutable<T> = {
  readonly [P in keyof T]: T[P] extends object ? Immutable<T[P]> : T[P];
};

/**
 * 排除 null 和 undefined
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * 提取对象的值类型
 */
export type ValueOf<T> = T[keyof T];

/**
 * 条件类型
 */
export type If<C extends boolean, T, F> = C extends true ? T : F;

/**
 * 类型守卫辅助函数
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * 数组类型守卫
 */
export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * 对象类型守卫
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 字符串类型守卫
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * 数字类型守卫
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}
```

### 说明

- **类型工具** - 常用的类型转换工具
- **类型守卫** - 运行时类型检查函数

### 如何使用

```typescript
import type { DeepPartial, ArrayElement } from "@/types/utils";
import { isDefined, isString } from "@/types/utils";

// 使用类型工具
type User = { name: string; age: number };
type PartialUser = DeepPartial<User>; // { name?: string; age?: number }

// 使用类型守卫
const value: string | null = getValue();
if (isDefined(value)) {
  // value 的类型现在是 string
  console.log(value.toUpperCase());
}
```

---

## 任务 7: 验证配置

### 1. 检查类型定义文件

确保所有文件都已创建：

```bash
ls apps/web/src/types/
# 应该看到:
# - global.d.ts
# - api.d.ts
# - components.d.ts
# - utils.ts
# - schema.d.ts (已存在)
```

### 2. 运行类型检查

```bash
cd apps/web
pnpm typecheck
```

应该能正常运行（即使有类型错误）。

### 3. 测试类型导入

创建一个测试文件 `apps/web/src/test-types.ts`：

```typescript
// 测试类型导入
import type { User, PodcastFeed } from "./types/api";
import type { CardProps, DialogProps } from "./types/components";
import { isDefined, isString } from "./types/utils";

// 测试类型使用
const user: User = {
  id: "1",
  email: "test@example.com",
  username: "test",
  role: "user",
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
};

// 测试类型守卫
const value: string | null = null;
if (isDefined(value)) {
  console.log(value.toUpperCase());
}

console.log("Types work!");
```

运行类型检查：

```bash
pnpm typecheck
```

如果没有错误，说明类型定义正确。

### 4. 删除测试文件

```bash
rm apps/web/src/test-types.ts
```

---

## ✅ 验收标准

完成 Phase 1 后，应该满足以下条件：

- [x] `tsconfig.json` 配置正确
- [x] ESLint 支持 TypeScript
- [x] 创建了 `types/global.d.ts`
- [x] 创建了 `types/api.d.ts`
- [x] 创建了 `types/components.d.ts`
- [x] 创建了 `types/utils.ts`
- [x] `pnpm typecheck` 能正常运行
- [x] `pnpm lint` 能正常运行
- [x] 类型定义可以正常导入使用

---

## 🎉 完成

恭喜！你已经完成了 Phase 1。现在你有了：

- ✅ 完整的 TypeScript 配置
- ✅ ESLint TypeScript 支持
- ✅ 全局类型定义
- ✅ API 类型定义
- ✅ 组件类型定义
- ✅ 类型工具函数

这些是后续迁移的基础，非常重要。

---

## 下一步

开始 [Phase 2: API 层与工具函数](./05-phase2-api-utils.md) 的迁移。
