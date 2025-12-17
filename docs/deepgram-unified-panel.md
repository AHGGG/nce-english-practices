# Deepgram Unified Testing Panel - 功能文档

## 📖 概述

新增的 **Deepgram Unified Testing Panel** 是一个完整的测试面板，支持在同一界面中切换和对比 **Nova-3** 和 **Flux** 两种 Deepgram 模型。

## 🎯 访问路径

1. 启动应用后访问 Voice Lab 页面
2. 点击顶部 **"Deepgram"** 标签
3. 选择 **"🧪 UNIFIED TEST"** 子标签

## ✨ 主要功能

### 1. 模型切换

#### Nova-3 (通用转录)
- **用途**: 通用实时音频转录
- **API**: `/v1/listen` (WebSocket)
- **特性**:
  - ✅ 高精度转录
  - ✅ 智能格式化
  - ✅ Interim results (临时结果)
  - ✅ 多语言支持

#### Flux (对话式 AI)
- **用途**: 专为语音代理和对话系统设计
- **API**: `/v2/listen` (WebSocket)
- **特性**:
  - ✅ 智能对话轮次检测 (End-of-Turn)
  - ✅ 超低延迟 (~260ms EOT 检测)
  - ✅ 提前响应机制 (EagerEndOfTurn)
  - ✅ 中断处理 (barge-in)
  - ✅ Nova-3 级别精度

### 2. Flux 高级配置

点击 **"Flux Configuration"** 展开配置面板:

#### EOT Threshold (End-of-Turn 阈值)
- **范围**: 0.5 - 0.9
- **默认值**: 0.7
- **作用**: 控制何时触发 `EndOfTurn` 事件
- **调整建议**:
  - **提高 (0.8-0.9)**: 更可靠的检测，但延迟略高
  - **降低 (0.5-0.6)**: 更激进的检测，可能有误判

#### Eager EOT Threshold (提前响应阈值)
- **范围**: 0.3 - 0.9
- **默认值**: 禁用 (留空)
- **作用**: 启用 `EagerEndOfTurn` 事件，允许在用户完全说完之前开始准备 LLM 响应
- **调整建议**:
  - **0.5-0.6**: 激进模式，更早触发但误判率高
  - **0.7-0.8**: 保守模式，更准确但延迟改善有限
- **注意**: 启用后会触发额外的 LLM API 调用 (增加 50-70% 成本)

#### EOT Timeout (超时设置)
- **范围**: 500 - 10000 ms
- **默认值**: 5000 ms (5秒)
- **作用**: 静音超过此时间后强制触发 `EndOfTurn`
- **调整建议**:
  - **减少**: 适合快速对话场景
  - **增加**: 适合用户说话停顿较多的场景

### 3. 实时转录显示

#### 最终转录 (Final Transcript)
- 显示已确认的最终文本
- 可滚动查看历史记录
- 支持清除功能

#### 临时转录 (Interim Transcript)
- 使用青色高亮显示
- 带 "INTERIM" 标签
- 实时更新，未最终确认

#### 高级信息展示
点击 **"Show Advanced Info"** 可查看:
- **Confidence**: 整体置信度百分比
- **Is Final**: 是否为最终结果
- **Speech Final**: 语音段是否自然结束
- **Word Count**: 单词数量
- **Word-level Confidence**: 每个单词的置信度
  - 🟢 绿色 (≥90%): 高置信度
  - 🟡 黄色 (80-90%): 良好置信度
  - 🟠 橙色 (70-80%): 中等置信度
  - 🔴 红色 (<70%): 低置信度

### 4. 事件日志 (Event Log)

实时显示所有 Deepgram 事件，包含:

#### 通用事件
- `[INFO]` - 连接信息、配置信息
- `[SUCCESS]` - 连接成功、麦克风启动
- `[ERROR]` - 错误信息
- `[METADATA]` - 元数据接收
- `[TRANSCRIPT]` - 最终转录结果
- `[INTERIM]` - 临时转录结果

#### Flux 专属事件
- `[EOT]` 🔴 - End of Turn 检测到用户说完
- `[EAGER-EOT]` ⚡ - Eager End of Turn (可以开始 LLM 处理)
- `[TURN-RESUMED]` 🔄 - Turn Resumed (用户继续说话，取消 LLM)
- `[SPEECH-STARTED]` 🎤 - 检测到语音开始

每个事件都可展开查看详细的 JSON 数据。

## 🚀 使用流程

### 基础使用 (Nova-3)
1. 选择 **Nova-3** 模型
2. 点击 **"Start Transcription"**
3. 允许浏览器麦克风权限
4. 开始说话，查看实时转录

### 高级使用 (Flux)
1. 选择 **Flux** 模型
2. (可选) 点击 "Show" 配置 Flux 参数
3. 点击 **"Start Transcription"**
4. 观察事件日志中的 EOT 事件
5. 如果启用了 Eager EOT，留意 `⚡ EAGER-EOT` 和 `🔄 TURN-RESUMED` 事件

### 对比测试
1. 使用 Nova-3 模型进行一段录音
2. 停止后记录结果
3. 切换到 Flux 模型
4. 说相同内容
5. 对比两者的转录质量和事件触发情况

## 🎨 UI 元素说明

### 连接状态标签
- 🟢 **CONNECTED** - 已连接
- 🟡 **CONNECTING** - 连接中
- 🔴 **ERROR** - 错误
- ⚪ **DISCONNECTED** - 已断开

### 按钮状态
- **Start Transcription**: 开始转录 (绿色主按钮)
- **Stop Transcription**: 停止转录 (红色危险按钮)
- **Clear Transcript**: 清除转录历史
- **Clear Log**: 清除事件日志

## 🔧 技术实现细节

### Audio Chunk Size 优化
- **Nova-3**: 100ms chunks
- **Flux**: 80ms chunks (官方推荐，获得最佳性能)

### API Endpoint
- **Nova-3**: `deepgram.listen.live()` → `/v1/listen`
- **Flux**: `deepgram.listen.v2.connect()` → `/v2/listen`

### 事件监听
```javascript
// 通用事件
connection.on('Open', handler);
connection.on('Close', handler);
connection.on('Transcript', handler);
connection.on('Metadata', handler);
connection.on('Error', handler);

// Flux 专属事件
connection.on('EndOfTurn', handler);
connection.on('EagerEndOfTurn', handler);
connection.on('TurnResumed', handler);
connection.on('SpeechStarted', handler);
```

## 📊 性能指标

### Nova-3
- 延迟: ~500-800ms (首字识别)
- 精度: 行业领先
- 适用场景: 通用转录、字幕生成

### Flux
- End-of-Turn 延迟: ~260ms
- Eager EOT 延迟: ~100-150ms (提前触发)
- 精度: Nova-3 级别
- 适用场景: 实时对话、客服机器人、语音助手

## ⚠️ 注意事项

1. **Eager EOT 成本**: 启用后会增加 50-70% 的 LLM API 调用
2. **浏览器限制**: 需要 HTTPS 环境才能使用麦克风 (本地开发除外)
3. **模型切换**: 必须在停止转录后才能切换模型
4. **参数调整**: 必须在停止转录后才能调整 Flux 参数

## 🐛 故障排查

### 问题: 无法连接到 Deepgram
- 检查后端是否提供了有效的 API token (`/api/deepgram/token`)
- 查看事件日志中的错误信息

### 问题: Flux 没有触发 EOT 事件
- 确认选择的是 **Flux** 模型而非 Nova-3
- 检查 EOT Threshold 设置是否过高
- 尝试说完整的句子后停顿 1-2 秒

### 问题: Eager EOT 不工作
- 确认 `Eager EOT Threshold` 已设置 (不为空)
- 值必须在 0.3-0.9 之间
- 查看事件日志确认是否有 `[EAGER-EOT]` 事件

### 问题: 音频延迟过高
- 检查网络连接
- 尝试降低 EOT Threshold
- 确认使用的是 Flux 模型 (延迟更低)

## 📚 参考文档

- [Deepgram Live Streaming API](https://developers.deepgram.com/docs/live-streaming-audio)
- [Flux Model Documentation](https://developers.deepgram.com/docs/flux/quickstart)
- [End-of-Turn Configuration](https://developers.deepgram.com/docs/flux/configuration)
- [Deepgram SDK (JavaScript)](https://github.com/deepgram/deepgram-js-sdk)

---

**Created**: 2025-12-17
**Version**: 1.0.0
**Component**: `/frontend/src/components/VoiceLab/DeepgramUnified.jsx`
