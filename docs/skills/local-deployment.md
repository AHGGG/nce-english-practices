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
#   - 自动清理 dangling images，避免磁盘被 <none> 镜像占满
./scripts/deploy.sh

# 2. 全量重置 (当遇到环境污染或需要重置数据时)
#   - 清理所有旧构建和缓存 (--no-cache)
#   - 清理未使用的 Docker 资源
#   - 重新播种初始数据 (seed_word_lists)
./scripts/deploy.sh --full

# 3. 保留 dangling images (调试构建链路时)
./scripts/deploy.sh --no-prune
```

## Maintenance Scripts

| 脚本                                 | 用途                           |
| ------------------------------------ | ------------------------------ |
| `./scripts/backup.sh`                | 数据库备份到 `deploy/backups/` |
| `./scripts/prod-backup.sh`           | 生产手动备份（含元数据）       |
| `./scripts/restore.sh list`          | 列出所有备份                   |
| `./scripts/restore.sh <backup_file>` | 恢复指定备份                   |
| `./scripts/prod-rollback.sh latest`  | 生产一键回滚到最近备份         |
| `./scripts/logs.sh`                  | 查看容器日志                   |
| `./scripts/health-check.sh`          | 系统诊断                       |

## Production Backup & Rollback

```bash
cd deploy

# 1) 变更前先做生产手动备份（推荐）
./scripts/prod-backup.sh --tag pre_migration

# 2) 如果发布后异常，回滚到最近备份
./scripts/prod-rollback.sh latest

# 3) 或指定某个备份文件回滚
./scripts/prod-rollback.sh nce_nce_practice_20260222_163000.sql.gz

# 4) 非交互模式（自动确认，谨慎使用）
./scripts/prod-rollback.sh latest --yes
```

说明：`prod-rollback.sh` 在恢复前会自动再做一次 `pre_rollback` 备份，避免二次损失。

## Production Operation: Clear Collocation Cache

当 collocation prompt/schema 升级后，需要清理历史识别缓存，触发全量重识别。

### Docker deployment (recommended)

```bash
# 1) 确认 app 容器名称
docker ps

# 2) 先 dry-run 查看将删除的行数
docker exec -it deploy-app-1 sh -lc 'cd /app && uv run python scripts/clear_collocation_cache.py --dry-run'

# 3) 正式清理
docker exec -it deploy-app-1 sh -lc 'cd /app && uv run python scripts/clear_collocation_cache.py --yes'

# 4) 重启 app 容器，清理进程内内存缓存
docker restart deploy-app-1

# 5) 观察日志确认恢复正常
docker logs -f --tail=200 deploy-app-1
```

### Notes

- 若容器内没有 `uv`，使用 `python` 直接运行脚本：
  `docker exec -it deploy-app-1 sh -lc 'cd /app && python scripts/clear_collocation_cache.py --yes'`
- 若项目目录不是 `/app`，请替换为容器内实际代码目录。
- 建议在低峰期执行，避免短时 LLM 重识别请求高峰。

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
