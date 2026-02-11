# 跨端应用技术架构蓝图 (Modern Multi-platform Architecture Blueprint)

## 1. 核心架构理念 (Core Philosophy)
本方案采用 **"Monorepo (单体仓库) + Shared Logic (逻辑共享) + Platform Shells (平台壳)"** 的架构模式。
- **Single Source of Truth (SSOT)**: 业务逻辑、状态管理、API 请求代码只编写一次，多端复用。
- **Platform-specific UI**: 不追求 100% 的 UI 复用，而是针对桌面、移动端、Web 进行适配，以保证各平台的原生手感。
- **Type-safe Contract**: 后端 Python 与前端 TypeScript 之间通过强类型契约同步。

---

## 2. 目录结构设计 (Project Structure)
使用 `pnpm workspaces` 管理代码库：

```text
/
├── apps/               # 平台特定应用 (Shells)
│   ├── web/            # Vite + React (浏览器端)
│   ├── desktop/        # Electron (桌面端壳，加载 web 产物或独立构建)
│   └── mobile/         # Expo + React Native (Android/iOS)
├── packages/           # 跨端共享包
│   ├── shared/         # 核心逻辑 (API 请求, Hooks, Utils)
│   ├── store/          # 全局状态 (Zustand)
│   ├── ui-tokens/      # 设计规范 (Tailwind 配置文件, 颜色, 图标)
│   └── database/       # (可选) 本地数据库模型 (Drizzle + SQLite)
├── backend/            # Python 后端 (FastAPI)
├── turbo.json          # Turborepo 任务编排配置
└── pnpm-workspace.yaml # pnpm 工作区定义
```

---

## 3. 技术栈选型 (Technology Stack)

### 3.1 前端核心 (Frontend)
- **基础框架**: [React 18/19](https://react.dev/)
- **状态管理**: [Zustand](https://github.com/pmnd.rs/zustand) (轻量、跨端兼容性极佳)
- **数据流控制**: [TanStack Query (React Query)](https://tanstack.com/query) (处理异步请求、缓存、同步)
- **样式方案**: 
    - Web/Desktop: [Tailwind CSS](https://tailwindcss.com/)
    - Mobile: [Nativewind](https://www.nativewind.dev/) (让 React Native 支持 Tailwind 类名)
- **多端适配外壳**:
    - **Android/iOS**: [Expo](https://expo.dev/) (基于 React Native，推荐用于快速迭代)
    - **Desktop**: [Electron](https://www.electronjs.org/) (生态最强) 或 [Tauri](https://tauri.app/) (包体积更小)

### 3.2 后端核心 (Backend - Python)
- **Web 框架**: [FastAPI](https://fastapi.tiangolo.com/) (高性能、自动生成 OpenAPI 文档)
- **类型导出**: [openapi-typescript](https://github.com/drwpow/openapi-typescript) (将 FastAPI 的 Swagger 自动转为 TypeScript 类型)
- **通信协议**: RESTful API + WebSocket (实时通信)

### 3.3 构建与管理 (Tooling)
- **包管理器**: [pnpm](https://pnpm.io/)
- **任务编排**: [Turborepo](https://turbo.build/) (加速构建、并行任务、缓存管理)

---

## 4. 关键实现方案 (Implementation Strategies)

### 4.1 代码复用模型 (Code Reuse)
在 `packages/shared` 中封装业务逻辑，通过 **Custom Hooks** 导出：
```typescript
// packages/shared/hooks/useUser.ts
export const useUser = () => {
  const { data, isLoading } = useQuery({ 
    queryKey: ['user'], 
    queryFn: fetchUser 
  });
  return { user: data, isLoading };
};
```
在 Web 和 Mobile 中直接调用：
- **Web**: `import { useUser } from '@my-project/shared';`
- **Mobile**: `import { useUser } from '@my-project/shared';`
- *结果*: 只有 UI 渲染部分（`<div>` vs `<View>`）不同，逻辑完全一致。

### 4.2 样式复用与适配
- **共享配置**: 在 `packages/ui-tokens` 定义 `tailwind.config.js`，包含自定义颜色、间距等。
- **Nativewind 桥接**: 移动端通过 Nativewind 读取共享配置，实现一套 CSS 类名两端生效。
- **跨端 UI 库**: 建议使用类似于 [Tamagui](https://tamagui.dev/) 或针对 Tailwind 优化的方案，减少针对原生组件的重写工作。

### 4.3 后端联调与类型安全
1.  Python 后端运行 `FastAPI`。
2.  访问 `http://localhost:8000/openapi.json` 获取协议。
3.  前端运行脚本：`npx openapi-typescript http://localhost:8000/openapi.json -o packages/shared/types/api.ts`。
4.  **前端所有 API 请求将获得 100% 的类型补全，后端修改字段，前端编译直接报错。**

### 4.4 数据持久化 (Local-first 模式)
如果应用需要离线可用或高性能搜索：
- **SQLite**: 桌面端和 Android 共有的数据库选型。
- **Drizzle ORM**: 统一桌面端和移动端的 SQL 操作。
- **同步逻辑**: 前端本地存一份 SQLite，通过 TanStack Query 将差异同步到 Python 服务器。

---

## 5. 开发与部署流程

### 5.1 环境启动
```bash
pnpm install
# 同时启动后端和前端各端开发环境
pnpm turbo dev --filter=backend --filter=web --filter=mobile
```

### 5.2 平台分发
- **Android**: 通过 Expo 的 EAS 服务打包成 `.apk` 或 `.aab`。
- **Desktop**: 通过 `electron-builder` 生成 `.exe` 或 `.dmg`。
- **Web**: 部署至 Vercel、Cloudflare 或 Docker 环境。

---

## 6. 核心依赖清单 (Dependency Checklist)

| 类别 | 推荐依赖 | 说明 |
| :--- | :--- | :--- |
| **Monorepo** | `turbo`, `pnpm` | 任务管理与包管理 |
| **Logic** | `zustand`, `@tanstack/react-query` | 状态与异步流 |
| **Styling** | `tailwindcss`, `nativewind` | 样式桥接 |
| **API** | `axios` 或 `ofetch` | 基础请求库 |
| **Backend** | `fastapi`, `uvicorn`, `pydantic` | Python 后端核心 |
| **Mobile** | `expo`, `react-native` | 移动端运行环境 |
| **Desktop** | `electron`, `electron-vite` | 桌面端运行环境 |

---

## 9. 进阶最佳实践 (Advanced Best Practices)

### 9.1 Local-first (本地优先) 架构
为了实现极速响应和离线支持，架构应演进为本地优先模式：
- **数据流**: UI -> 本地存储 (SQLite/IndexedDB) -> 异步同步 -> 后端 Python。
- **工具**: 推荐使用 **Drizzle ORM** 配合 **TanStack Query**。UI 始终优先读取本地缓存，数据在后台静默同步。
- **价值**: 消除 Loading 状态，提升用户在弱网环境下的体验。

### 9.2 Adaptive UI (适配性 UI)
超越简单的响应式设计，根据交互模式（鼠标 vs 触摸）调整组件：
- **Pointer vs Touch**: 桌面端优化右键菜单、Hover 态；移动端优化手势（Swiping）、长按动作。
- **组件注入**: 利用 `Platform.select` 或共享组件接口，为不同端提供最符合原生习惯的实现。

### 9.3 契约化全栈类型安全 (Contract-Driven)
对于 React + Python 栈，确保前后端契约的一致性：
- **Schema 驱动**: 以 FastAPI 的 Pydantic 模型作为唯一事实来源。
- **自动同步**: 后端字段变更后，通过 CI 自动更新前端 `@my-project/shared` 中的 TS 定义，实现编译级错误发现。

### 9.4 远程热更新 (OTA - Over The Air)
- **移动端**: 利用 **Expo Updates**，在不重新发布 App Store/Google Play 的情况下，远程热修复 JS 逻辑 Bug。
- **桌面端**: 利用 Electron 的 `autoUpdater` 实现增量包更新。

### 9.5 统一图标与动效语言
- **Icon 系统**: 采用 **Lucide-react** 或 **Iconify**，通过一套 Icon ID 覆盖 Web 与 Native。
- **动效 Lottie**: 设计师导出 JSON 动画文件，在 Web 和 Mobile 端共用同一套 JSON，确保视觉一致性。

### 9.6 跨端测试工程化 (Multi-platform E2E)
- **Web/Desktop**: 使用 **Playwright** 进行自动化模拟。
- **Mobile**: 引入 **Maestro**。其基于 YAML 的脚本非常适合在 CI 中对 Android 和 iOS 同时进行 UI 验收。
