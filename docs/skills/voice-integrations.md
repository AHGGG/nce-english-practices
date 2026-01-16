# Voice Integrations (Raw API Pattern)

> **When to use**: 需要调用 ElevenLabs/Deepgram/Gemini/Dashscope 语音 API 时

As of 2025-12-19, all voice provider integrations use **raw `httpx` API calls** instead of SDKs for better stability and control.

## ElevenLabs

文件: `app/services/voice_lab.py`

| 功能 | 端点 | 方法 |
|------|------|------|
| TTS | `/v1/text-to-speech/{voice_id}` | POST JSON, streaming response |
| STT | `/v1/speech-to-text` | POST multipart form data |
| SFX | `/v1/sound-generation` | POST JSON |
| STS | `/v1/speech-to-speech/{voice_id}` | POST multipart form data |

**Header**: `xi-api-key: {API_KEY}`

## Deepgram

文件: `app/services/voice_lab.py` + `app/api/routers/deepgram/`

| 功能 | 端点 | 备注 |
|------|------|------|
| TTS | `POST https://api.deepgram.com/v1/speak?model={voice}&encoding=mp3` | |
| STT | `POST https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true` | |
| Live STT/TTS | WebSocket | 使用 `websockets` 库代理 |

**Header**: `Authorization: Token {API_KEY}`

> **注意**: websockets v15.x 使用 `additional_headers`（不是 `extra_headers`）

## Google Gemini

文件: `app/services/voice_lab.py`

使用官方 `google-genai` SDK，通过 Live API 支持多模态 TTS/STT。

## Dashscope (Alibaba Cloud)

文件: `app/services/voice_lab.py`

| 功能 | 端点 |
|------|------|
| TTS | `POST https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation` (Qwen3-TTS) |
| STT | `POST https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription` (Qwen3-ASR) |
| LLM | 使用 `AsyncOpenAI` 兼容模式，模型 `qwen3-30b-a3b` "Deep Thinking" |

**Header**: `Authorization: Bearer {API_KEY}`

## 为什么选择 Raw API 而非 SDK？

1. SDK 版本不匹配导致频繁故障（v3 vs v4 vs v5 API 变更）
2. 文档经常过时；原始 API 规范更可靠
3. 更好的错误处理和调试可见性
4. 减少依赖包体积
