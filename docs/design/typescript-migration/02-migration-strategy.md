# 2. 迁移策略

## 🎯 为什么选择渐进式迁移？

### 渐进式迁移（Bottom-Up）的优势

我们选择**渐进式迁移**而不是一次性全部迁移（Big Bang），原因如下：

#### ✅ 优势

1. **风险可控**
   - 每次只迁移一个文件或模块
   - 问题容易定位和修复
   - 不影响其他功能的正常运行

2. **增量验证**
   - 迁移后立即测试
   - 发现问题及时回退
   - 避免积累大量问题

3. **学习曲线友好**
   - 从简单到复杂逐步推进
   - 在实践中学习 TypeScript
   - 积累经验后处理复杂模块

4. **不阻塞开发**
   - 可以与其他功能开发并行
   - 不需要冻结代码库
   - 团队可以继续正常工作

5. **易于回滚**
   - 每个文件独立提交
   - 出现问题可以单独回滚
   - 不影响整体进度

#### ❌ Big Bang 迁移的问题

1. **风险极高**
   - 一次性改动 25,000+ 行代码
   - 难以测试和验证
   - 出现问题难以定位

2. **阻塞开发**
   - 需要冻结代码库
   - 其他功能无法开发
   - 团队效率降低

3. **难以回滚**
   - 所有改动混在一起
   - 回滚意味着放弃所有工作
   - 心理压力大

---

## 📋 迁移的四个阶段

### Phase 1: 基础设施与类型定义（1-2 天）

**目标**: 建立类型安全的基础，为后续迁移铺路。

**为什么先做这个？**

- 后续所有文件都依赖这些类型定义
- 一次性配置好，避免重复工作
- 确保类型检查工具正常工作

**主要任务**:

1. 增强 `tsconfig.json` 配置
2. 创建全局类型定义文件
3. 配置 ESLint 支持 TypeScript
4. 创建类型工具函数

**输出**:

- `apps/web/src/types/global.d.ts`
- `apps/web/src/types/api.d.ts`
- `apps/web/src/types/components.d.ts`
- `apps/web/src/types/utils.ts`
- 更新后的 `tsconfig.json`
- 更新后的 `eslint.config.js`

---

### Phase 2: API 层与工具函数（2-3 天）

**目标**: 迁移无 UI 依赖的纯逻辑代码，建立类型安全的数据流。

**为什么先做这个？**

- 这些是最底层的代码，被其他模块依赖
- 没有 UI 依赖，迁移相对简单
- 建立类型安全的 API 调用模式

**迁移顺序**:

#### P0 - 核心 API 层（必须先完成）

1. `api/auth.js` → `auth.ts`
2. `api/client.js` → `client.ts`
3. `api/podcast.js` → `podcast.ts`
4. `api/audiobook.js` → `audiobook.ts`
5. `api/gemini-live.js` → `gemini-live.ts`

#### P1 - 简单工具函数

6. `utils/sseParser.js` → `sseParser.ts`
7. `utils/security.js` → `security.ts`
8. `utils/toast.js` → `toast.ts`
9. `utils/localProgress.js` → `localProgress.ts`

#### P2 - 复杂工具类

10. `utils/ReadingTracker.js` → `ReadingTracker.ts`
11. `utils/VoiceSessionTracker.js` → `VoiceSessionTracker.ts`
12. `utils/VoiceController.js` → `VoiceController.ts`
13. `utils/offline.js` → `offline.ts`
14. `utils/logBridge.js` → `logBridge.ts`

#### P3 - Hooks

15. `hooks/useAUITransport.js` → `useAUITransport.ts`

**输出**:

- 所有 API 函数有明确的类型签名
- 工具函数有完整的类型注解
- 无 `any` 类型（除非必要）

---

### Phase 3: 组件层（5-7 天）

**目标**: 按功能模块逐步迁移组件，优先迁移小而独立的组件。

**为什么这样排序？**

- 从简单到复杂，降低学习曲线
- 小组件迁移快，能快速看到成果
- 积累经验后再处理复杂组件

**迁移顺序**:

#### P0 - 简单 UI 组件（无复杂状态）

- `components/ui/` - 基础 UI 组件
- `components/shared/` - 共享组件
- `components/Dictionary/` - 词典组件
- `components/LogErrorBoundary.jsx`
- `components/ProtectedRoute.jsx`

**预计时间**: 1 天

#### P1 - 中等复杂度组件

- `components/performance/` - 性能报告组件
- `components/podcast/` - Podcast 组件
- `components/lab/` - Lab 组件

**预计时间**: 1-2 天

#### P2 - 复杂业务组件

- `components/reading/` - 阅读模式组件
- `components/sentence-study/` - 句子学习组件
- `components/aui/` - AUI 组件

**预计时间**: 2-3 天

#### P3 - 最复杂组件（需要重构）

- `components/voice/NegotiationInterface.jsx` (1,487 行)
- `components/VoiceLab/` - Voice Lab 组件

**预计时间**: 1-2 天

**输出**:

- 所有 Props 有明确的接口定义
- 事件处理器有正确的类型
- Ref 使用正确的类型

---

### Phase 4: Views 与 Context（3-4 天）

**目标**: 迁移顶层视图和全局状态管理。

**为什么最后做？**

- Views 依赖所有底层组件
- Context 是全局状态，影响范围大
- 需要确保底层稳定后再迁移

**迁移顺序**:

#### P0 - 简单 Views

- `views/auth/` - 认证页面
- `views/VoiceLab.jsx`
- `views/AUIStreamingDemo.jsx`
- `views/Placeholders.jsx`

**预计时间**: 0.5 天

#### P1 - 中等复杂度 Views

- `views/audiobook/` - Audiobook 视图
- `views/player/` - 播放器视图
- `views/MemoryCurveDebug.jsx`
- `views/ReviewDebug.jsx`
- `views/PerformanceReport.jsx`
- `views/StudyTimeDetail.jsx`

**预计时间**: 1 天

#### P2 - 复杂 Views

- `views/ReviewQueue.jsx` (1,004 行)
- `views/podcast/` - Podcast 视图
- `views/ReadingMode.jsx`
- `views/VoiceMode.jsx`
- `views/NavDashboard.jsx`
- `views/SettingsPage.jsx`

**预计时间**: 1.5 天

#### P3 - Context 与全局状态

- `context/AuthContext.jsx`
- `context/DictionaryContext.jsx`
- `context/GlobalContext.jsx`
- `context/PodcastContext.jsx` (740 行)

**预计时间**: 1 天

#### P4 - 入口文件

- `App.jsx` → `App.tsx`
- `main.jsx` → `main.tsx`

**预计时间**: 0.5 天

**输出**:

- Context 有明确的类型定义
- Custom hooks 有类型安全的返回值
- 路由参数有类型定义

---

## ⚠️ 风险评估与应对

### 高风险文件

以下文件需要特别注意：

| 文件                        | 行数  | 风险  | 应对策略           |
| --------------------------- | ----- | ----- | ------------------ |
| `NegotiationInterface.jsx`  | 1,487 | 🔴 高 | 先重构拆分，再迁移 |
| `ReviewQueue.jsx`           | 1,004 | 🔴 高 | 分步迁移，充分测试 |
| `PodcastFeedDetailView.jsx` | 996   | 🟡 中 | 分步迁移           |
| `SentenceStudy.jsx`         | 791   | 🟡 中 | 分步迁移           |
| `AUIStreamHydrator.jsx`     | 744   | 🟡 中 | 分步迁移           |
| `PodcastContext.jsx`        | 740   | 🟡 中 | 最后迁移，充分测试 |

### 风险应对策略

#### 1. 大文件处理策略

**选项 A: 先迁移，保持结构**

- ✅ 快速完成迁移
- ❌ 可能遗留技术债

**选项 B: 先重构，再迁移**

- ✅ 代码质量更高
- ❌ 耗时更长

**选项 C: 边迁移边重构**

- ✅ 平衡质量和速度
- ❌ 需要更多经验

**建议**: 对于 `NegotiationInterface.jsx`，使用**选项 B**；其他文件使用**选项 A**。

#### 2. 类型错误处理

遇到难以解决的类型错误时：

1. **临时使用 `any`**

   ```typescript
   // TODO: Fix type
   const data: any = await apiGet("/api/endpoint");
   ```

2. **使用类型断言**

   ```typescript
   const data = (await apiGet("/api/endpoint")) as MyType;
   ```

3. **添加 `@ts-ignore` 注释**
   ```typescript
   // @ts-ignore - TODO: Fix type
   const result = complexFunction();
   ```

**重要**: 所有临时方案都要添加 `TODO` 注释，后续统一修复。

#### 3. 测试策略

每个文件迁移后：

1. **类型检查**: `pnpm turbo typecheck`
2. **ESLint 检查**: `pnpm turbo lint`
3. **功能测试**: 手动测试相关功能
4. **提交代码**: 单独提交，便于回滚

---

## 📊 进度追踪

建议使用以下方式追踪进度：

### 方式 1: Markdown 表格

在项目根目录创建 `MIGRATION_PROGRESS.md`：

```markdown
# TypeScript 迁移进度

## Phase 1: 基础设施 ✅

- [x] tsconfig.json
- [x] 全局类型定义
- [x] ESLint 配置

## Phase 2: API 层与工具函数 (5/15)

- [x] api/auth.ts
- [x] api/client.ts
- [ ] api/podcast.ts
- [ ] ...

## Phase 3: 组件层 (0/80)

...
```

### 方式 2: GitHub Issues

为每个 Phase 创建一个 Issue，使用 Task List 追踪进度。

### 方式 3: 项目看板

使用 GitHub Projects 或 Trello 创建看板：

- **To Do**: 待迁移
- **In Progress**: 进行中
- **Review**: 待审查
- **Done**: 已完成

---

## 🎯 成功标准

### 每个 Phase 的完成标准

#### Phase 1

- ✅ `pnpm turbo typecheck` 通过
- ✅ 类型定义文件可被正确导入
- ✅ ESLint 配置正常工作

#### Phase 2

- ✅ 所有 API 函数有明确的类型签名
- ✅ 工具函数有完整的类型注解
- ✅ 无 `any` 类型（除必要情况）
- ✅ 功能测试通过

#### Phase 3

- ✅ 所有 Props 有明确的接口定义
- ✅ 事件处理器有正确的类型
- ✅ 功能测试通过

#### Phase 4

- ✅ Context 有明确的类型定义
- ✅ `apps/web/src` 中无 `.js`/`.jsx` 文件
- ✅ 所有功能正常运行

### 最终验收标准

- ✅ 整个 Web 端 100% TypeScript 化
- ✅ 严格模式（`strict: true`）通过
- ✅ 无类型错误和警告
- ✅ ESLint 无错误
- ✅ 所有功能正常运行
- ✅ 性能无明显下降

---

## 下一步

阅读 [环境准备](03-environment-setup.md) 了解如何配置开发环境。
