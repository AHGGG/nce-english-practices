---
name: Local Deployment
description: Instructions for local and intranet deployment using Docker and the intelligent deploy script.
---

# Local Deployment (Docker)

> **When to use**: 需要将应用部署到本地/内网 Docker 环境时

完整的本地/内网部署架构文档见 `docs/plans/2025-12-31-local-deployment-architecture.md`。

## Quick Deploy

**推荐**: 使用智能部署脚本 `deploy/scripts/deploy.sh`，它会自动处理增量更新。

```bash
cd deploy

# 1. 快速更新 (默认)
#   - 利用 Docker 缓存，仅构建变动的代码
#   - 平滑重启变动的容器
#   - 自动运行数据库迁移
./scripts/deploy.sh

# 2. 全量重置 (当遇到环境污染或需要重置数据时)
#   - 清理所有旧构建和缓存 (--no-cache)
#   - 清理未使用的 Docker 资源
#   - 重新播种初始数据 (seed_word_lists)
./scripts/deploy.sh --full
```

## Maintenance Scripts

| 脚本 | 用途 |
|------|------|
| `./scripts/backup.sh` | 数据库备份到 `deploy/backups/` |
| `./scripts/restore.sh list` | 列出所有备份 |
| `./scripts/restore.sh <backup_file>` | 恢复指定备份 |
| `./scripts/logs.sh` | 查看容器日志 |
| `./scripts/health-check.sh` | 系统诊断 |

## Prerequisites

1. **Docker & Docker Compose** installed
2. **PostgreSQL** container or external instance
3. `.env` 文件配置好 API keys

## Architecture Overview

```
┌─────────────────────────────────────────┐
│              nginx (reverse proxy)      │
│              :443 (HTTPS)               │
└────────────────┬────────────────────────┘
                 │
    ┌────────────┴────────────┐
    ▼                         ▼
┌─────────┐             ┌─────────────┐
│ FastAPI │             │   Vite/SPA  │
│ Backend │◄────────────│  (static)   │
│ :8000   │             │             │
└────┬────┘             └─────────────┘
     │
     ▼
┌─────────────┐
│ PostgreSQL  │
│ :5432       │
└─────────────┘
```

## Troubleshooting

- **端口冲突**: 检查 5432、8000、443 是否被占用
- **数据库连接失败**: 确认 `DATABASE_URL` 环境变量和网络配置
- **HTTPS 证书**: 使用 `scripts/generate_cert.py` 生成自签名证书
