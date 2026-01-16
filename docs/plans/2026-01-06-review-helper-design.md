# Review Helper：复习遗忘时的多阶段解释功能

## 背景

当前复习系统中，用户点击「忘了」后直接跳转到下一个复习项，没有提供任何帮助。这导致用户即使完成了复习，也可能依然不理解内容。

**目标**：在用户表示"忘了"时，提供渐进式的解释帮助，让用户能够在复习过程中回忆/理解内容。

## 设计决策

### 交互模式：简化版「一键唤醒」

- 点击「忘了」后**展开唤醒面板**（非模态对话框）
- **直接显示阶段1解释**，无需额外点击
- 用户可选择：
  - 「想起来了」→ 记录后继续
  - 「还是不懂」→ 显示阶段2
  - 「跳过」→ 快速跳到下一个

### 解释内容策略

| 情况 | 解释目标 | API 调用 |
|------|----------|----------|
| 有 `highlighted_items` | 解释这些词/短语在句子中的含义 | `explain-word` |
| 无 `highlighted_items` | 解释整个句子 | `simplify` |

### Quality 评分映射

| 场景 | SM-2 Quality |
|------|--------------|
| 直接点「想起来了」 | 3 |
| 直接点「太简单」 | 5 |
| 忘了 → 阶段1/2想起 | 2 |
| 忘了 → 阶段3或跳过 | 1 |

## 技术实现

### 前端 (`ReviewQueue.jsx`)

**新增状态**:
```javascript
const [showHelpPanel, setShowHelpPanel] = useState(false);
const [helpStage, setHelpStage] = useState(1);
const [helpContent, setHelpContent] = useState('');
const [isLoadingHelp, setIsLoadingHelp] = useState(false);
```

**新增函数**:
- `handleForgot()` - 展开面板并触发阶段1解释
- `handleHelpResponse(remembered)` - 处理用户响应
- `streamExplanation(stage)` - SSE 流式获取解释

### 后端复用

不需要新 API，复用现有端点：
- `POST /api/sentence-study/explain-word` - 词/短语解释
- `POST /api/sentence-study/simplify` - 整句解释

## UI 设计

```
┌─────────────────────────────────────────────────┐
│  📖 Book Name          🏷️ word                  │
├─────────────────────────────────────────────────┤
│    "The sentence with [highlighted] word."      │
├─────────────────────────────────────────────────┤
│  💡 STAGE 1                                     │
│  ─────────────────────────────────────────────  │
│  流式显示的解释内容...                          │
├─────────────────────────────────────────────────┤
│  [ 想起来了 ✓ ]    [ 还是不懂 → ]              │
│  [       跳过，下一个 →        ]               │
└─────────────────────────────────────────────────┘
```

## 验证方案

1. **功能测试**：完整走完 3 阶段流程
2. **边界测试**：无 highlighted_items 时 fallback 到整句
3. **UI 测试**：流式文本显示正常
