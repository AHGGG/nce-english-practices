# Deepgram API Documentation Index

This directory contains the scraped markdown documentation for the Deepgram API.

## 🚀 Key Endpoints for NCE English Practices

### Text to Speech (TTS) - "Speak"
*   **[Stream Text to Audio](reference-text-to-speech-speak-streaming.md)** (`wss://api.deepgram.com/v1/speak`)
    *   *Realtime TTS via WebSocket. This is the primary method for low-latency voice bots.*
*   **[REST Text to Audio](reference-text-to-speech-speak-request.md)** (`POST /v1/speak`)
    *   *Standard HTTP endpoint for generating audio files.*

### Speech to Text (STT) - "Listen"
*   **[Realtime Transcription](reference-speech-to-text-listen-streaming.md)** (`wss://api.deepgram.com/v1/listen`)
    *   *Realtime STT via WebSocket. Used for the user's voice input.*
*   **[Pre-recorded Audio](reference-speech-to-text-listen-pre-recorded.md)** (`POST /v1/listen`)
    *   *For transcribing uploaded files or buffers.*

### Managing Models (Voices)
*   **[List Models](reference-manage-models-list.md)** (`GET /v1/models`)
    *   *Retrieve available models, including **Aura** voices (TTS) and **Nova** models (STT).*

## Verified SDK Usage (Python v3)

*Note: Deepgram SDK v3 uses a unified client structure.*

**TTS (Stream)**
```python
from deepgram import DeepgramClient, SpeakOptions

deepgram = DeepgramClient("API_KEY")

options = SpeakOptions(
    model="aura-asteria-en",
    encoding="linear16",
    sample_rate=24000
)

# Returns a generator if configured for streaming, or bytes
response = deepgram.speak.v("1").stream(
    {"text": "Hello world"},
    options
)
```

**STT (Realtime)**
```python
# See app/services/voice_lab.py for full implementation
options = LiveOptions(
    model="nova-2",
    language="en-US",
    smart_format=True
)
dg_connection = deepgram.listen.live.v("1")
dg_connection.start(options)
```

---

## ⚠️ 浏览器音频格式指南 (Nova vs Flux)

### 核心差异

| API | 端点 | 支持的格式 | 浏览器兼容性 |
|-----|------|-----------|-------------|
| **Nova v1** | `/v1/listen` | 自动检测容器格式（WebM、WAV、MP3等） | ✅ MediaRecorder 直接兼容 |
| **Flux v2** | `/v2/listen` | **仅支持原始编码**：`linear16`, `linear32`, `mulaw`, `alaw`, `opus`, `ogg-opus` | ❌ 需要 Web Audio API 转换 |

### 问题场景

浏览器 `MediaRecorder` 输出 `audio/webm` **容器格式**：
- ✅ Nova v1 - 自动解析容器元数据
- ❌ Flux v2 - 报错 `"Submitted audio is not in a supported format"`

### 解决方案

**Nova**：直接使用 MediaRecorder
```javascript
const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
```

**Flux**：使用 Web Audio API 捕获原始 PCM
```javascript
const audioContext = new AudioContext({ sampleRate: 16000 });
const processor = audioContext.createScriptProcessor(4096, 1, 1);
processor.onaudioprocess = (e) => {
    const pcmData = floatTo16BitPCM(e.inputBuffer.getChannelData(0));
    ws.send(pcmData);
};
```

后端参数：
```python
# Flux 必须指定 encoding 和 sample_rate
url = "wss://api.deepgram.com/v2/listen?model=flux-general-en&encoding=linear16&sample_rate=16000"
```

### 关键记忆点

1. **Flux v2 不支持容器格式** - 必须发送原始音频流 + 明确指定 `encoding` 和 `sample_rate`
2. **Nova v1 支持自动检测** - 可以直接发送 WebM/WAV 等容器格式
3. **浏览器 MediaRecorder** → WebM 容器 → **只能用于 Nova**
4. **浏览器 Web Audio API** → 原始 PCM → **可用于 Flux**

---

## 🔊 TTS Streaming WebSocket 消息格式

### 问题场景

发送文本到 Deepgram TTS WebSocket 时，如果消息格式不正确，TTS 会收到文本但**不返回任何音频**。

### 正确的消息格式

发送文本时**必须**包含 `type: "Speak"`：

```python
# ✅ 正确
await tts_ws.send(json.dumps({"type": "Speak", "text": response_text}))
await tts_ws.send(json.dumps({"type": "Flush"}))

# ❌ 错误 - 缺少 type 字段，TTS 不会返回音频
await tts_ws.send(json.dumps({"text": response_text}))
```

### 完整消息类型

| 操作 | 消息格式 | 说明 |
|------|----------|------|
| 发送文本 | `{"type": "Speak", "text": "..."}` | 发送待转语音的文本 |
| 刷新缓冲 | `{"type": "Flush"}` | 立即生成已发送文本的音频 |
| 清除缓冲 | `{"type": "Clear"}` | 丢弃缓冲区中未处理的文本 |
| 关闭连接 | `{"type": "Close"}` | 刷新缓冲并优雅关闭连接 |

### 调试技巧

如果 TTS 没有返回音频：
1. 检查 `Metadata` 消息是否收到 → 连接成功
2. 检查发送的消息是否包含 `"type": "Speak"` → 格式正确
3. 检查是否发送了 `Flush` → 触发音频生成
