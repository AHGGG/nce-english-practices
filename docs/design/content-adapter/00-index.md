# Content Adapter Architecture - Design Document

> 统一内容适配器架构设计文档

## Document Structure

本设计文档分为以下部分，便于分工实现：

| 文件                                                      | 内容                               | 负责人 |
| --------------------------------------------------------- | ---------------------------------- | ------ |
| [01-overview.md](./01-overview.md)                        | 架构概述、设计目标、核心原则       | -      |
| [02-current-state.md](./02-current-state.md)              | 现有系统分析、代码位置、数据流     | -      |
| [03-backend-design.md](./03-backend-design.md)            | 后端 Provider 接口、Schema 变更    | -      |
| [04-frontend-design.md](./04-frontend-design.md)          | 前端架构概述                       | -      |
| ├─ [04a-types.md](./04a-types.md)                         | TypeScript 类型定义                | -      |
| ├─ [04b-registry.md](./04b-registry.md)                   | Renderer Registry 实现             | -      |
| ├─ [04c-shared-components.md](./04c-shared-components.md) | 共享组件设计                       | -      |
| └─ [04d-shared-hooks.md](./04d-shared-hooks.md)           | 共享 Hooks 设计                    | -      |
| [05-phase1-renderer.md](./05-phase1-renderer.md)          | Phase 1: Renderer 抽象实现计划     | -      |
| [06-phase2-audiobook.md](./06-phase2-audiobook.md)        | Phase 2: 有声书支持实现计划        | -      |
| [07-phase3-comic.md](./07-phase3-comic.md)                | Phase 3: 漫画支持实现计划 (Future) | -      |
| [08-migration-guide.md](./08-migration-guide.md)          | 迁移指南、兼容性处理               | -      |

## Quick Links

- **实现者必读**: [01-overview.md](./01-overview.md) → [对应 Phase 文档]
- **代码位置速查**: [02-current-state.md](./02-current-state.md)
- **接口定义**: [03-backend-design.md](./03-backend-design.md) + [04-frontend-design.md](./04-frontend-design.md)

## 分工建议

| Phase   | 负责内容                                   | 参考文档                                   |
| ------- | ------------------------------------------ | ------------------------------------------ |
| Phase 1 | 前端：Renderer 抽象、共享组件              | 04*.md, 05-phase1-renderer.md             |
| Phase 2 | 后端：AudiobookProvider                    | 03-backend-design.md, 06-phase2-audiobook.md |
| Phase 2 | 前端：AudioContentRenderer                 | 04*.md, 06-phase2-audiobook.md             |
| Phase 3 | 待定                                       | 07-phase3-comic.md                         |

## Design Principles

1. **渐进式迁移** - 不破坏现有功能，逐步重构
2. **YAGNI** - 不提前实现未确定的功能
3. **单一职责** - Provider 只负责获取解析，Renderer 只负责展示交互
4. **开闭原则** - 新内容类型 = 新 Provider + 新 Renderer，不改现有代码

## Timeline

| Phase   | 内容          | 预计周期 |
| ------- | ------------- | -------- |
| Phase 1 | Renderer 抽象 | 1-2 周   |
| Phase 2 | 有声书支持    | 2-3 周   |
| Phase 3 | 漫画支持      | TBD      |

---

_Last Updated: 2026-02-06_
