# Autonomous Verification System Design

> **Goal**: 让 AI 在代码变更后自动验证，减少人工检查的依赖。

## 问题陈述

当前 AI Coding 流程中，代码变更后缺乏"验证意识"：
- AI 完成变更后不主动验证
- 用户需要手动检查后再反馈问题
- 验证覆盖范围不完整（编译错误、运行时错误、功能回归、UI问题）

## 解决方案概览

```
完成代码变更 → 运行验证 Skill → 通过 → 通知用户
                    ↓
                  失败 → 修复 → 重新验证
```

## 核心组件

| 组件 | 路径 | 优先级 | 描述 |
|------|------|--------|------|
| **验证 Skill** | `docs/skills/post-change-verification.md` | P0 | 强制 AI 在任务完成前执行验证 |
| **健康检查 API** | `app/api/routers/verify.py` | P0 | 聚合前后端错误信息 |
| **日志读取接口** | `app/services/log_collector.py` (扩展) | P0 | 提供获取最近错误的接口 |
| **CLAUDE.md 更新** | 添加 Skill 引用 | P0 | 让 AI 知道有这个 Skill |

---

## 详细设计

### 1. 验证 Skill

**路径**: `docs/skills/post-change-verification.md`

**触发时机**: 任务完成后、通知用户前

**核心原则**: 
- 🎯 **只验证本次变更涉及的范围**，不做全量检查
- 🧠 **灵活使用多模态验证**，像真正的工程师一样按需判断

**验证步骤**:

1. **等待 HMR (3秒)** - 让 Vite 和后端重新加载完成

2. **快速健康检查** (必做) - 调用 `GET /api/verify/health`
   - 检查最近 60 秒的错误日志
   - 若无错误 → 继续
   - 若有错误 → 分析是否与本次变更相关

3. **视觉验证** (按需) - 使用 Chrome DevTools MCP
   - **何时使用**: 变更涉及 UI 组件、样式、布局时
   - **何时跳过**: 纯后端逻辑、工具函数、配置文件变更
   - 只验证受影响的页面，不做全站截图

4. **交互验证** (按需)
   - **何时使用**: 变更涉及用户交互流程（按钮、表单、导航）
   - **何时跳过**: 静态内容、只读展示变更

**变更范围判断** (无需配置文件):
- 根据修改的文件路径推断影响范围
- 修改 `frontend/src/components/reading/*` → 只验证 `/reading`
- 修改 `app/api/routers/review.py` → 只验证 `/review`
- 修改 `app/services/*.py` → 健康检查即可，通常无需视觉验证

---

### 2. 健康检查 API

**路径**: `app/api/routers/verify.py`

**端点**: `GET /api/verify/health`

**响应结构**:

```python
class HealthCheckResult(BaseModel):
    status: Literal["healthy", "unhealthy"]
    timestamp: str
    
    # 前端错误 (从 unified.log 读取最近 60 秒)
    frontend_errors: list[LogEntry]
    
    # 后端错误 (最近的 500 响应)
    backend_errors: list[dict]
    
    # 系统状态
    db_connected: bool
    vite_healthy: bool
    
    # 摘要
    error_count: int
    warning_count: int
```

**实现要点**:
- 读取 `logs/unified.log` 最近 60 秒的条目
- 过滤 `level=error` 或 `level=warn`
- 检查数据库连接
- 返回聚合结果

---

### 3. 日志读取接口扩展

**修改文件**: `app/services/log_collector.py`

**新增方法**:

```python
def get_recent_errors(seconds: int = 60) -> list[LogEntry]:
    """获取最近 N 秒的错误日志"""
    # 读取日志文件，过滤时间范围内的 error/warn 条目
```

---

## 验证流程图

```
┌─────────────────────────────────────────────────────┐
│                  AI 代码变更                         │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│           Skill 强制触发验证流程                     │
│  (触发: 任务完成后、notify_user 前)                  │
└──────────────────────┬──────────────────────────────┘
                       ▼
          ┌────────────┴────────────┐
          ▼                         ▼
┌─────────────────────┐   ┌─────────────────────┐
│  快速健康检查        │   │  视觉交互验证        │
│  /api/verify/health │   │  Chrome DevTools    │
│  (编译/运行时错误)   │   │  (功能/UI验证)       │
└─────────┬───────────┘   └─────────┬───────────┘
          │                         │
          └────────────┬────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│                   结果判断                           │
│  ✅ 全部通过 → 继续通知用户                          │
│  ❌ 有错误 → 自动分析并修复，重新验证                 │
└─────────────────────────────────────────────────────┘
```

---

## 实现顺序

1. **扩展 log_collector.py** - 添加 `get_recent_errors()` 方法
2. **创建 verify.py router** - 实现 `/api/verify/health` 端点
3. **创建验证 Skill** - `docs/skills/post-change-verification.md`
4. **更新 CLAUDE.md** - 添加 Skill 引用

---

## 设计决策

### 为什么不用静态页面配置 (pages.yaml)?

| 问题 | 影响 |
|------|------|
| 维护成本高 | 每新增页面都要更新配置 |
| 选择器易过时 | UI 重构后选择器失效 |
| 文件映射脆弱 | 目录结构变化就要更新 |

**替代方案**: 动态推断 + 智能判断
- 根据目录结构约定推断相关页面
- 用 AI 多模态能力判断"页面是否正常"
- 错误信号驱动（console.error、空白页面）

---

## 成功标准

- [ ] AI 变更代码后自动执行验证，无需人工提醒
- [ ] 编译错误、运行时错误能在通知用户前被发现
- [ ] 关键页面有截图验证，UI 问题能被识别
- [ ] 验证失败时 AI 能自动尝试修复
