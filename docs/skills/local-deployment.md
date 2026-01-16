# Local Deployment (Docker)

> **When to use**: 需要将应用部署到本地/内网 Docker 环境时

完整的本地/内网部署架构文档见 `docs/plans/2025-12-31-local-deployment-architecture.md`。

## Quick Deploy

```bash
cd deploy

# 1. 一键部署（先检查 prerequisites）
#   - 清理旧构建 (docker system prune)
#   - 使用 --no-cache 构建
#   - (可选) ./scripts/generate_htpasswd.sh admin password
./scripts/deploy.sh
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
