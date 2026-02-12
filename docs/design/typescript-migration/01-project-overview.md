# 1. 项目概览

## 📊 当前项目状态

### 项目架构

这是一个 **Monorepo** 项目，使用 `pnpm workspaces` 和 `Turborepo` 管理：

```
/
├── apps/
│   ├── web/          # React Vite SPA (本次迁移的主要目标)
│   ├── mobile/       # Expo React Native (已完成 TS 化)
│   └── backend/      # Python FastAPI (不在本次迁移范围)
├── packages/
│   ├── api/          # 共享 API 逻辑 (已完成 TS 化) ✅
│   ├── shared/       # 共享 Hooks、工具 (已完成 TS 化) ✅
│   ├── store/        # 全局状态管理 (已完成 TS 化) ✅
│   └── ui-tokens/    # 设计令牌 (已完成 TS 化) ✅
└── app/              # Python 后端 (不在本次迁移范围)
```

### 代码规模统计

**Web 端 (`apps/web/src`)**:

- **JavaScript 文件**: 114 个
- **TypeScript 文件**: 10 个
- **总行数**: ~25,385 行
- **迁移进度**: 8.1% (10/124)

**文件分布**:
| 目录 | JS/JSX 文件数 | 预估行数 | 复杂度 |
|------|--------------|---------|--------|
| `api/` | 5 | ~900 | 低 |
| `components/` | ~80 | ~18,000 | 中-高 |
| `views/` | 23 | ~6,000 | 中-高 |
| `utils/` | 6 | ~1,500 | 低-中 |
| `hooks/` | 1 | ~300 | 中 |
| `context/` | 4 | ~700 | 中 |
| 其他 | 5 | ~500 | 低 |

**最大的文件** (需要特别关注):

1. `components/voice/NegotiationInterface.jsx` - 1,487 行
2. `views/ReviewQueue.jsx` - 1,004 行
3. `views/podcast/PodcastFeedDetailView.jsx` - 996 行
4. `components/sentence-study/SentenceStudy.jsx` - 791 行
5. `components/aui/AUIStreamHydrator.jsx` - 744 行
6. `context/PodcastContext.jsx` - 740 行

---

## ✅ 已完成的 TypeScript 基础设施

### 1. Packages 层（100% 完成）

#### `packages/api` - API 客户端

- ✅ `src/auth.ts` - 认证服务（AuthService 类）
- ✅ `src/storage.ts` - 存储适配器
- ✅ `src/endpoints/` - API 端点封装
  - `dictionary.ts`
  - `podcast.ts`
  - `proficiency.ts`
  - `reading.ts`
  - `review.ts`
  - `sentence-study.ts`
  - `vocabulary.ts`

**关键特性**:

- 完整的类型定义
- 便利方法：`apiGet`, `apiPost`, `apiPut`, `apiDelete`, `apiPatch`
- 统一错误处理：`ApiError` 类
- 支持 Web 和 React Native

#### `packages/shared` - 共享逻辑

- ✅ `src/hooks/` - 共享 Hooks
  - `useWordExplainer.ts`
  - `useSentenceExplainer.ts`
  - `useReviewQueue.ts`
  - `usePodcast.ts`
  - `usePerformanceStats.ts`
  - `useNegotiationSession.ts`
- ✅ `src/utils/` - 工具函数
- ✅ `src/platform/` - 平台兼容性处理

#### `packages/store` - 状态管理

- ✅ Zustand stores（已完成 TS 化）

#### `packages/ui-tokens` - 设计令牌

- ✅ 设计系统令牌（已完成 TS 化）

### 2. Mobile 端（100% 完成）

`apps/mobile` 已完全使用 TypeScript。

### 3. Web 端已完成的部分

#### `apps/web/src/types/`

- ✅ `schema.d.ts` - OpenAPI 生成的类型定义（8,006 行）
  - 包含所有后端 API 的请求/响应类型
  - 自动生成，不需要手动维护

#### `apps/web/src/components/content/`

- ✅ 内容渲染器系统（已完成 TS 化）
  - `types.ts` - 内容类型定义
  - `registry.ts` - 渲染器注册表
  - `renderers/AudioContentRenderer.tsx`
  - `renderers/TextContentRenderer.tsx`
  - `shared/SentenceBlock.tsx`
  - `shared/ImageBlock.tsx`
  - `shared/HeadingBlock.tsx`

---

## 🔴 待迁移模块清单

### Phase 1: 基础设施（预计 1-2 天）

- [ ] 创建全局类型定义文件
- [ ] 增强 `tsconfig.json`
- [ ] 配置 ESLint 支持 TypeScript
- [ ] 创建类型工具函数

### Phase 2: API 层与工具函数（预计 2-3 天）

#### API 层（5 个文件，~900 行）

- [ ] `apps/web/src/api/auth.js` → `auth.ts`
- [ ] `apps/web/src/api/client.js` → `client.ts`
- [ ] `apps/web/src/api/podcast.js` → `podcast.ts`
- [ ] `apps/web/src/api/audiobook.js` → `audiobook.ts`
- [ ] `apps/web/src/api/gemini-live.js` → `gemini-live.ts`

#### 工具函数（6 个文件，~1,500 行）

- [ ] `apps/web/src/utils/sseParser.js` → `sseParser.ts`
- [ ] `apps/web/src/utils/security.js` → `security.ts`
- [ ] `apps/web/src/utils/toast.js` → `toast.ts`
- [ ] `apps/web/src/utils/localProgress.js` → `localProgress.ts`
- [ ] `apps/web/src/utils/ReadingTracker.js` → `ReadingTracker.ts`
- [ ] `apps/web/src/utils/VoiceSessionTracker.js` → `VoiceSessionTracker.ts`
- [ ] `apps/web/src/utils/VoiceController.js` → `VoiceController.ts`
- [ ] `apps/web/src/utils/offline.js` → `offline.ts`
- [ ] `apps/web/src/utils/logBridge.js` → `logBridge.ts`

#### Hooks（1 个文件，~300 行）

- [ ] `apps/web/src/hooks/useAUITransport.js` → `useAUITransport.ts`

### Phase 3: 组件层（预计 5-7 天）

#### P0 - 简单 UI 组件（3 个文件，~200 行）

- [ ] `components/ui/Dialog.jsx` → `Dialog.tsx`
- [ ] `components/ui/Toast.jsx` → `Toast.tsx`
- [ ] `components/ui/index.jsx` → `index.ts`

#### P0 - 基础组件（4 个文件，~200 行）

- [ ] `components/shared/ArticleCard.jsx` → `ArticleCard.tsx`
- [ ] `components/shared/UnifiedArticleListView.jsx` → `UnifiedArticleListView.tsx`
- [ ] `components/LogErrorBoundary.jsx` → `LogErrorBoundary.tsx`
- [ ] `components/ProtectedRoute.jsx` → `ProtectedRoute.tsx`

#### P1 - Dictionary 组件（2 个文件，~300 行）

- [ ] `components/Dictionary/DangerousHtml.jsx` → `DangerousHtml.tsx`
- [ ] `components/Dictionary/DictionaryModal.jsx` → `DictionaryModal.tsx`

#### P1 - Performance 组件（6 个文件，~800 行）

- [ ] `components/performance/cards/Card.jsx` → `Card.tsx`
- [ ] `components/performance/PerformanceReport.jsx` → `PerformanceReport.tsx`
- [ ] `components/performance/StudyTimeDetail.jsx` → `StudyTimeDetail.tsx`
- [ ] `components/performance/widgets/MemoryCurveChart.jsx` → `MemoryCurveChart.tsx`
- [ ] `components/performance/widgets/StudyTimeChart.jsx` → `StudyTimeChart.tsx`
- [ ] `components/performance/utils.js` → `utils.ts`
- [ ] `components/performance/index.js` → `index.ts`

#### P1 - Podcast 组件（3 个文件，~400 行）

- [ ] `components/podcast/PlayerBar.jsx` → `PlayerBar.tsx`
- [ ] `components/podcast/PodcastLayout.jsx` → `PodcastLayout.tsx`
- [ ] `components/podcast/RecentlyPlayed.jsx` → `RecentlyPlayed.tsx`

#### P1 - Lab 组件（1 个文件，~441 行）

- [ ] `components/lab/LabCalibration.jsx` → `LabCalibration.tsx`

#### P2 - Reading 组件（11 个文件，~3,500 行）

- [ ] `components/reading/ArticleListView.jsx` → `ArticleListView.tsx`
- [ ] `components/reading/Lightbox.jsx` → `Lightbox.tsx`
- [ ] `components/reading/MemoizedImage.jsx` → `MemoizedImage.tsx`
- [ ] `components/reading/MemoizedSentence.jsx` → `MemoizedSentence.tsx`
- [ ] `components/reading/ReaderView.jsx` → `ReaderView.tsx`
- [ ] `components/reading/ReadingMode.jsx` → `ReadingMode.tsx`
- [ ] `components/reading/RecommendModal.jsx` → `RecommendModal.tsx`
- [ ] `components/reading/SentenceInspector.jsx` → `SentenceInspector.tsx`
- [ ] `components/reading/WordInspector.jsx` → `WordInspector.tsx`
- [ ] `components/reading/constants.js` → `constants.ts`
- [ ] `components/reading/recommendUtils.js` → `recommendUtils.ts`
- [ ] `components/reading/index.js` → `index.ts`

#### P2 - Sentence Study 组件（7 个文件，~1,500 行）

- [ ] `components/sentence-study/SentenceStudy.jsx` → `SentenceStudy.tsx`
- [ ] `components/sentence-study/views/ArticleListView.jsx` → `ArticleListView.tsx`
- [ ] `components/sentence-study/views/BookShelfView.jsx` → `BookShelfView.tsx`
- [ ] `components/sentence-study/views/CompletedView.jsx` → `CompletedView.tsx`
- [ ] `components/sentence-study/views/ExplanationCard.jsx` → `ExplanationCard.tsx`
- [ ] `components/sentence-study/api.js` → `api.ts`
- [ ] `components/sentence-study/constants.js` → `constants.ts`
- [ ] `components/sentence-study/index.js` → `index.ts`

#### P2 - AUI 组件（16 个文件，~3,000 行）

- [ ] `components/aui/AUIContext.jsx` → `AUIContext.tsx`
- [ ] `components/aui/AUIHydrator.jsx` → `AUIHydrator.tsx`
- [ ] `components/aui/AUIStreamHydrator.jsx` → `AUIStreamHydrator.tsx`
- [ ] `components/aui/ContextCard.jsx` → `ContextCard.tsx`
- [ ] `components/aui/ContextList.jsx` → `ContextList.tsx`
- [ ] `components/aui/DictionaryResults.jsx` → `DictionaryResults.tsx`
- [ ] `components/aui/DiffCard.jsx` → `DiffCard.tsx`
- [ ] `components/aui/FlashCardStack.jsx` → `FlashCardStack.tsx`
- [ ] `components/aui/MarkdownMessage.jsx` → `MarkdownMessage.tsx`
- [ ] `components/aui/SenseCard.jsx` → `SenseCard.tsx`
- [ ] `components/aui/TaskDashboard.jsx` → `TaskDashboard.tsx`
- [ ] `components/aui/TenseTimeline.jsx` → `TenseTimeline.tsx`
- [ ] `components/aui/VocabGrid.jsx` → `VocabGrid.tsx`
- [ ] `components/aui/interactive/InteractiveDemo.jsx` → `InteractiveDemo.tsx`
- [ ] `components/aui/registry.js` → `registry.ts`

#### P3 - Voice 组件（1 个文件，1,487 行）⚠️

- [ ] `components/voice/NegotiationInterface.jsx` → `NegotiationInterface.tsx`
  - **注意**: 这是最大的文件，建议先重构拆分再迁移

#### P3 - VoiceLab 组件（11 个文件，~2,500 行）

- [ ] `components/VoiceLab/ConversationLoop.jsx` → `ConversationLoop.tsx`
- [ ] `components/VoiceLab/DeepgramFlux.jsx` → `DeepgramFlux.tsx`
- [ ] `components/VoiceLab/DeepgramLive.jsx` → `DeepgramLive.tsx`
- [ ] `components/VoiceLab/DeepgramStreamingTTS.jsx` → `DeepgramStreamingTTS.tsx`
- [ ] `components/VoiceLab/DeepgramUnified.jsx` → `DeepgramUnified.tsx`
- [ ] `components/VoiceLab/DeepgramVoiceAgent.jsx` → `DeepgramVoiceAgent.tsx`
- [ ] `components/VoiceLab/ElevenLabsLive.jsx` → `ElevenLabsLive.tsx`
- [ ] `components/VoiceLab/ElevenLabsVoiceAgent.jsx` → `ElevenLabsVoiceAgent.tsx`
- [ ] `components/VoiceLab/LivePanel.jsx` → `LivePanel.tsx`
- [ ] `components/VoiceLab/STTPanel.jsx` → `STTPanel.tsx`
- [ ] `components/VoiceLab/TTSPanel.jsx` → `TTSPanel.tsx`

### Phase 4: Views 与 Context（预计 3-4 天）

#### Views（23 个文件，~6,000 行）

- [ ] `views/auth/LoginPage.jsx` → `LoginPage.tsx`
- [ ] `views/auth/RegisterPage.jsx` → `RegisterPage.tsx`
- [ ] `views/auth/index.js` → `index.ts`
- [ ] `views/audiobook/AudiobookLibraryView.jsx` → `AudiobookLibraryView.tsx`
- [ ] `views/audiobook/AudiobookPlayerView.jsx` → `AudiobookPlayerView.tsx`
- [ ] `views/audiobook/index.js` → `index.ts`
- [ ] `views/player/UnifiedPlayerView.jsx` → `UnifiedPlayerView.tsx`
- [ ] `views/podcast/PodcastLibraryView.jsx` → `PodcastLibraryView.tsx`
- [ ] `views/podcast/PodcastFeedDetailView.jsx` → `PodcastFeedDetailView.tsx`
- [ ] `views/podcast/PodcastDownloadsView.jsx` → `PodcastDownloadsView.tsx`
- [ ] `views/podcast/PodcastSearchView.jsx` → `PodcastSearchView.tsx`
- [ ] `views/AUIStreamingDemo.jsx` → `AUIStreamingDemo.tsx`
- [ ] `views/MemoryCurveDebug.jsx` → `MemoryCurveDebug.tsx`
- [ ] `views/NavDashboard.jsx` → `NavDashboard.tsx`
- [ ] `views/PerformanceReport.jsx` → `PerformanceReport.tsx`
- [ ] `views/Placeholders.jsx` → `Placeholders.tsx`
- [ ] `views/ReadingMode.jsx` → `ReadingMode.tsx`
- [ ] `views/ReviewDebug.jsx` → `ReviewDebug.tsx`
- [ ] `views/ReviewQueue.jsx` → `ReviewQueue.tsx` ⚠️ (1,004 行)
- [ ] `views/SettingsPage.jsx` → `SettingsPage.tsx`
- [ ] `views/StudyTimeDetail.jsx` → `StudyTimeDetail.tsx`
- [ ] `views/VoiceLab.jsx` → `VoiceLab.tsx`
- [ ] `views/VoiceMode.jsx` → `VoiceMode.tsx`

#### Context（4 个文件，~700 行）

- [ ] `context/AuthContext.jsx` → `AuthContext.tsx`
- [ ] `context/DictionaryContext.jsx` → `DictionaryContext.tsx`
- [ ] `context/GlobalContext.jsx` → `GlobalContext.tsx`
- [ ] `context/PodcastContext.jsx` → `PodcastContext.tsx` ⚠️ (740 行)

#### 入口文件

- [ ] `App.jsx` → `App.tsx`
- [ ] `main.jsx` → `main.tsx`

---

## 🎯 成功指标

### Phase 1 完成标准

- ✅ 类型定义文件创建完成
- ✅ `pnpm turbo typecheck` 通过（Web 端）
- ✅ ESLint 配置支持 TypeScript

### Phase 2 完成标准

- ✅ API 层 100% TypeScript 化
- ✅ 工具函数 100% TypeScript 化
- ✅ 无 `any` 类型（除必要情况）
- ✅ 所有函数有明确的类型签名

### Phase 3 完成标准

- ✅ 组件层 80%+ TypeScript 化
- ✅ 所有新组件必须使用 TypeScript
- ✅ Props 有明确的接口定义

### Phase 4 完成标准

- ✅ Views 100% TypeScript 化
- ✅ Context 100% TypeScript 化
- ✅ `apps/web/src` 中无 `.js`/`.jsx` 文件

### 最终目标

- ✅ 整个 Web 端 100% TypeScript 化
- ✅ 严格模式（`strict: true`）通过
- ✅ 无类型错误和警告
- ✅ 所有功能正常运行

---

## 📈 预计时间线

| 阶段                      | 预计时间     | 累计时间 |
| ------------------------- | ------------ | -------- |
| Phase 1: 基础设施         | 1-2 天       | 1-2 天   |
| Phase 2: API 与工具       | 2-3 天       | 3-5 天   |
| Phase 3: 组件层           | 5-7 天       | 8-12 天  |
| Phase 4: Views 与 Context | 3-4 天       | 11-16 天 |
| 测试与修复                | 2-3 天       | 13-19 天 |
| **总计**                  | **13-19 天** | -        |

**注意**: 以上时间为全职工作的预估，实际时间取决于：

- 你的 TypeScript 熟练度
- 每天投入的时间
- 遇到的问题复杂度

---

## 下一步

阅读 [迁移策略](02-migration-strategy.md) 了解为什么选择渐进式迁移以及具体的迁移方法。
