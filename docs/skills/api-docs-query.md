# API Documentation Query Tool

> **When to use**: 需要查询 ElevenLabs/Deepgram 离线 API 文档时

本地 CLI 工具，无需手动浏览文件即可查询离线 API 文档。

## Usage

```bash
# 通用格式
uv run python scripts/analyze_voice_api.py [query] [options]
```

## Examples

```bash
# 0. 获取 API 目录索引（紧凑模式）
# 列出所有可用端点
uv run python scripts/analyze_voice_api.py --compact

# 1. 搜索 "websocket" 相关端点
uv run python scripts/analyze_voice_api.py "websocket"

# 2. 列出所有 ElevenLabs 端点
uv run python scripts/analyze_voice_api.py --provider elevenlabs

# 3. 获取特定端点的详细 YAML 规范
uv run python scripts/analyze_voice_api.py "/v1/speak" --details
```

## Options

| 选项 | 说明 |
|------|------|
| `query` | 搜索词（路径、摘要、描述） |
| `-p, --provider` | 按提供商过滤（elevenlabs, deepgram） |
| `-m, --method` | 按 HTTP 方法过滤（GET, POST） |
| `-d, --details` | 显示完整 OpenAPI 规范 |
| `--compact` | 紧凑目录格式 |
