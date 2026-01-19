---
name: AUI Streaming Protocol
description: Architecture and event specifications for Agent-to-UI real-time streaming protocol.
---

# AUI Streaming Protocol (Agent-to-UI)

> **When to use**: 需要实现或调试 Agent 实时流式 UI 更新时

系统支持用于实时 Agent 更新的流式 UI 协议。

## Events

| 事件 | 描述 |
|------|------|
| `aui_render_snapshot` | 完整组件渲染（向后兼容） |
| `aui_text_delta` | 增量文本更新（ChatGPT 风格） |
| `aui_text_message_start/end` | 消息生命周期事件（并发流） |
| `aui_messages_snapshot` | 消息历史同步 |
| `aui_state_snapshot` | 完整状态（恢复/初始化） |
| `aui_state_delta` | 细粒度状态更新，使用 **JSON Patch** (RFC 6902) |
| `aui_activity_snapshot/delta` | 活动进度追踪 |
| `aui_tool_call_*` | 工具调用生命周期（start/args/end/result） |
| `aui_run_*` | Agent 运行生命周期（started/finished/error） |
| `aui_interrupt` | 控制流中断（如用户输入） |

## Architecture

```
Backend                          Frontend
────────                         ────────
app.services.aui_events   →      AUIStreamHydrator
  (生成事件)                        (消费事件 + 应用 JSON Patch)

app.api.routers.aui_websocket    fast-json-patch
  (处理流式传输)

app.services.aui_schema
  (Pydantic 验证组件 props)
```

## Interactivity (Bi-directional)

- **下行**: WebSocket 推送 UI 状态（按钮/表单）
- **上行**: 客户端通过 `POST /api/aui/input` 发送操作
- **Backend**: `AUIInputService` 使用 **PostgreSQL LISTEN/NOTIFY** 暂停执行并跨进程通知等待中的 Agent
- **Persistence**: 用户输入存储在 `aui_inputs` 表，确保 HITL 流程重启后存活

## AG-UI Alignment (2025-12-23)

- `InterruptEvent` 包含 `interrupt_id`（自动生成）和 `payload`（结构化数据）
- `RunFinishedEvent` 支持 `outcome="interrupt"` 及关联的中断详情
- `InterruptBanner` 组件显示来自 `payload.options` 的交互按钮

## WebSocket Transport (2025-12-23)

- **Backend**: `/api/aui/ws/{stream_type}` 端点在 `aui_websocket.py`
- **Frontend**: `useAUITransport` hook（仅 WebSocket）；`AUIContext` 提供 `send` 函数
- **Bidirectional**: `interactive` 和 `interrupt` 流使用 `handle_interactive_stream` 进行 HITL
- **Unified**: 替换旧版 SSE 作为单一传输通道（SSE 代码已于 2025-12 移除）

## Mobile Compatibility (2025-12-25)

- **Frontend**: `useAUITransport.js` 支持自动重连（指数退避）和可见性处理
- **Layout**: `AUIStreamingDemo` 及所有内联组件的移动优先设计
- **Touch Targets**: 所有交互元素优化为最小 48px 高度
