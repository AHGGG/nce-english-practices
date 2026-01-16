# Unified Word Explanation Feature

统一 ReadingMode 和 SentenceStudy 的单词解释功能。

## Problem

- **SentenceStudy**: 点击单词会显示词典 + 上下文 LLM 解释
- **ReadingMode**: 点击单词只显示词典，没有上下文解释
- 两边代码有大量重复逻辑

## Solution

创建共享的 `useWordExplainer` Hook，统一管理:
- 词典查询
- 流式上下文解释
- 短语检测
- 渐进式解释风格 (default → simple → chinese_deep)

## Proposed Changes

### Frontend

---

#### [NEW] [useWordExplainer.js](file:///d:/Documents/GitHub/python/nce-english-practices/frontend/src/hooks/useWordExplainer.js)

新建自定义 Hook，封装:
- State: `selectedWord`, `contextExplanation`, `isExplaining`, `explainStyle`, `isPhrase`, `inspectorData`, `isInspecting`
- Effects: 词典查询、流式解释
- Actions: `handleWordClick`, `setExplainStyle`, `closeInspector`

---

#### [MODIFY] [ReadingMode.jsx](file:///d:/Documents/GitHub/python/nce-english-practices/frontend/src/components/reading/ReadingMode.jsx)

- 移除现有的 word inspection 状态和逻辑
- 引入 `useWordExplainer` Hook
- 传递新 props 给 `WordInspector`

---

#### [MODIFY] [SentenceStudy.jsx](file:///d:/Documents/GitHub/python/nce-english-practices/frontend/src/components/sentence-study/SentenceStudy.jsx)

- 移除重复的词典查询和流式解释逻辑
- 引入 `useWordExplainer` Hook
- 保留 SentenceStudy 特有逻辑 (wordClicks tracking, phraseClicks tracking)

## API

使用现有 API，无需后端改动:
- `GET /api/dictionary/ldoce/{word}` - 词典查询
- `POST /api/sentence-study/explain-word` - 流式上下文解释

## Verification Plan

### Manual Verification
1. ReadingMode: 点击单词，确认显示词典 + 流式解释
2. ReadingMode: 点击短语，确认只显示解释（无词典）
3. ReadingMode: 测试 "Simpler please" 和 "Chinese Deep Dive" 按钮
4. SentenceStudy: 确认功能不受影响
