# 技术设计方案：Podcast 模块 AI 增强（转录与时间轴对齐）

## 1. 背景与目标 (Background & Objectives)

当前系统中，`Audiobook`（有声书）模块已实现极其流畅的音文字幕同步体验，支持点击跳转、进度跟随和句子高亮。相比之下，`Podcast`（播客）模块主要依赖 RSS 提供的文本描述，缺乏毫秒级的时间轴对齐数据。

**核心目标：**

- **功能对齐**：通过 AI 转录技术，使 Podcast 具备与 Audiobook 完全一致的交互体验。
- **架构解耦**：采用依赖反转原则，设计一套可插拔的转录引擎架构，首选集成 **SenseVoice** 引擎。
- **统一播放体验**：Podcast（转录后）与 Audiobook 共享同一个时间轴播放页面。

---

## 2. 核心设计决策 (Key Design Decisions)

| 决策项          | 选择                              | 理由                               |
| --------------- | --------------------------------- | ---------------------------------- |
| SenseVoice 部署 | 本地 GPU 推理 (Large 模型)        | 无 API 成本、隐私性好、有 GPU 资源 |
| 转录触发方式    | 用户手动点击按钮                  | 控制成本、按需生成                 |
| 长音频处理      | 分片 + Overlap 切割 + 智能合并    | 避免内存溢出、处理断句问题         |
| 前端渲染        | 统一播放页，保留 Podcast 原有功能 | 元数据有区别，但渲染层统一         |
| 进度反馈 (MVP)  | 轮询 `transcript_status`          | 简化实现，后续可升级 WebSocket     |

---

## 3. 核心架构 (Core Architecture)

### 3.1 转录引擎抽象 (Transcription Engine Abstraction)

为了屏蔽不同 AI 模型（SenseVoice, Whisper, Deepgram 等）的实现差异，系统通过抽象接口层进行解耦。

#### 3.1.1 数据契约

```python
# app/services/transcription/schemas.py

from dataclasses import dataclass
from typing import Optional
from pathlib import Path

@dataclass
class TranscriptionSegment:
    """统一的转录片段格式"""
    start_time: float              # 开始时间（秒）
    end_time: float                # 结束时间（秒）
    text: str                      # 转录文本

    # 扩展字段（Optional，不同引擎支持程度不同）
    language: Optional[str] = None        # 检测到的语言 (e.g., "en", "zh")
    emotion: Optional[str] = None         # 情绪标签 (SenseVoice 特有)
    events: Optional[list[str]] = None    # 事件标签 [Music], [Laughter], [Cough]
    confidence: Optional[float] = None    # 置信度 0.0-1.0

@dataclass
class TranscriptionResult:
    """转录结果"""
    segments: list[TranscriptionSegment]
    full_text: str                        # 合并后的完整文本
    duration: float                       # 音频总时长（秒）
    language: Optional[str] = None        # 主要语言
```

#### 3.1.2 音频输入抽象

```python
# app/services/transcription/schemas.py

class AudioInput:
    """音频输入抽象，支持多种来源"""

    def __init__(self, local_path: Path):
        self._local_path = local_path

    @staticmethod
    def from_file(path: Path) -> "AudioInput":
        """从本地文件创建"""
        if not path.exists():
            raise FileNotFoundError(f"Audio file not found: {path}")
        return AudioInput(local_path=path)

    @staticmethod
    def from_url(url: str) -> "AudioInput":
        """从 URL 创建（下载到临时目录）"""
        raise NotImplementedError("URL input not yet supported")

    @staticmethod
    def from_bytes(data: bytes, suffix: str = ".wav") -> "AudioInput":
        """从字节流创建"""
        raise NotImplementedError("Bytes input not yet supported")

    def to_local_path(self) -> Path:
        """获取本地文件路径"""
        return self._local_path
```

#### 3.1.3 引擎接口

```python
# app/services/transcription/base.py

from abc import ABC, abstractmethod
from .schemas import AudioInput, TranscriptionResult

class BaseTranscriptionEngine(ABC):
    """转录引擎抽象基类"""

    @property
    @abstractmethod
    def name(self) -> str:
        """引擎名称"""
        pass

    @abstractmethod
    def transcribe(self, audio: AudioInput) -> TranscriptionResult:
        """
        执行转录

        Args:
            audio: 音频输入

        Returns:
            TranscriptionResult: 转录结果
        """
        pass

    def is_available(self) -> bool:
        """检查引擎是否可用（如 GPU 是否就绪）"""
        return True
```

### 3.2 SenseVoice 实现

```python
# app/services/transcription/sensevoice.py

class SenseVoiceEngine(BaseTranscriptionEngine):
    """SenseVoice 本地 GPU 推理引擎"""

    # 分片配置
    CHUNK_DURATION = 30.0      # 每片 30 秒
    OVERLAP_DURATION = 2.0     # 重叠 2 秒

    @property
    def name(self) -> str:
        return "sensevoice-large"

    def transcribe(self, audio: AudioInput) -> TranscriptionResult:
        """
        执行转录（分片处理 + 智能合并）

        1. 将长音频切分为 30s 片段，每片重叠 2s
        2. 逐片调用 SenseVoice 推理
        3. 合并结果，处理重叠区域的去重
        4. 调整时间戳偏移量
        """
        pass
```

### 3.3 数据模型演进 (Data Model Evolution)

在 `PodcastEpisode` 模型中新增字段：

```python
# app/models/podcast_orm.py - PodcastEpisode

# 现有字段
transcript_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
transcript_status: Mapped[str] = mapped_column(String(20), default="none")

# 新增字段
transcript_segments: Mapped[Optional[List[dict]]] = mapped_column(JSON, nullable=True)
# 格式: [{"start_time": 0.0, "end_time": 2.5, "text": "Hello", "emotion": "happy", ...}]
```

**状态机**：`transcript_status` 管理转录生命周期：

```
none → pending → processing → completed
                     ↓
                   failed
```

---

## 4. 用户流程 (User Flow)

```
┌─────────────────────────────────────────────────────────────┐
│                    Podcast Episode 页面                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [正常播放器] - 现有功能保留                          │   │
│  │  - Show Notes                                        │   │
│  │  - 章节列表                                          │   │
│  │  - 下载/离线                                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [开启精听模式] 按钮                                  │   │
│  │                                                       │   │
│  │  状态显示：                                           │   │
│  │  - none: "开启精听模式"                               │   │
│  │  - pending/processing: "正在生成字幕..."              │   │
│  │  - completed: "进入精听模式"                          │   │
│  │  - failed: "生成失败，点击重试"                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 点击按钮
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  状态 = none                                                │
│  → 调用 POST /api/podcast/episode/{id}/transcribe           │
│  → 状态变为 pending                                         │
│  → 提示 "正在生成字幕，完成后可进入精听模式"                  │
│  → 后台异步处理                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 转录完成后
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   统一时间轴播放页                           │
│                   /player/podcast/{id}                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  时间轴字幕区域（复用 AudioContentRenderer）          │   │
│  │  - 自动滚动                                          │   │
│  │  - 点击跳转                                          │   │
│  │  - 单词高亮/点击查词                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  播放控制栏                                          │   │
│  │  - 播放/暂停                                         │   │
│  │  - 进度条                                            │   │
│  │  - 倍速控制                                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. API 设计

### 5.1 触发转录

```
POST /api/podcast/episode/{episode_id}/transcribe

Response (202 Accepted):
{
  "status": "pending",
  "message": "Transcription started"
}

Response (409 Conflict - 已在处理中):
{
  "status": "processing",
  "message": "Transcription already in progress"
}
```

### 5.2 查询状态

```
GET /api/podcast/episode/{episode_id}

Response:
{
  "id": 123,
  "title": "Episode Title",
  "transcript_status": "completed",  // none | pending | processing | completed | failed
  "transcript_segments": [...]       // 仅 completed 时返回
}
```

### 5.3 统一播放页数据

```
GET /api/content/player/podcast/{episode_id}

Response (ContentBundle 格式):
{
  "id": "podcast:123",
  "source_type": "podcast",
  "title": "Episode Title",
  "audio_url": "/api/podcast/episode/123/audio",
  "blocks": [
    {
      "type": "audio_segment",
      "text": "Hello and welcome...",
      "sentences": ["Hello and welcome..."],
      "start_time": 0.0,
      "end_time": 3.5
    },
    ...
  ]
}
```

---

## 6. 统一播放页路由

| 来源      | 路由                                        | 说明         |
| --------- | ------------------------------------------- | ------------ |
| Audiobook | `/player/audiobook/{book_id}?track={index}` | 有声书播放   |
| Podcast   | `/player/podcast/{episode_id}`              | 播客精听模式 |

两者共享同一个 `UnifiedAudioPlayer` 组件，根据 `source_type` 加载不同数据。

---

## 7. 分片处理策略 (Chunking Strategy)

### 7.1 Overlap 切割

```
原始音频: |-------- 60s --------|

切割后:
Chunk 1: |-- 0-30s --|
Chunk 2:          |-- 28-58s --|  (overlap 2s)
Chunk 3:                    |-- 56-60s --|
```

### 7.2 智能合并

重叠区域的处理：

1. 对比两个 chunk 在重叠时间段的文本
2. 使用文本相似度匹配找到最佳切分点
3. 去除重复内容，保留置信度更高的版本

```python
def merge_overlapping_segments(
    chunk1_segments: list[TranscriptionSegment],
    chunk2_segments: list[TranscriptionSegment],
    overlap_start: float,
    chunk1_offset: float,
) -> list[TranscriptionSegment]:
    """
    合并两个 chunk 的重叠区域
    """
    pass
```

---

## 8. 文件结构

```
app/
├── services/
│   └── transcription/
│       ├── __init__.py           # 导出 transcription_service 单例
│       ├── base.py               # BaseTranscriptionEngine 抽象
│       ├── schemas.py            # TranscriptionSegment, AudioInput 等
│       ├── sensevoice.py         # SenseVoice 本地 GPU 实现
│       └── utils.py              # 分片、合并、时间戳偏移工具
├── api/routers/
│   └── podcast.py                # 新增 POST /episode/{id}/transcribe
│   └── player.py                 # 新增统一播放页 API (可选，或复用 content.py)
```

---

## 9. 数据库迁移

```python
# alembic/versions/xxx_add_transcript_segments.py

def upgrade():
    op.add_column(
        'podcast_episodes',
        sa.Column('transcript_segments', sa.JSON(), nullable=True)
    )

def downgrade():
    op.drop_column('podcast_episodes', 'transcript_segments')
```

---

## 10. MVP 范围与后续迭代

### MVP (P0)

- [x] 数据层：新增 `transcript_segments` 字段 + 迁移
- [x] 引擎抽象：`BaseTranscriptionEngine` + `TranscriptionSegment`
- [x] SenseVoice 实现：本地 GPU 推理，分片 + Overlap 合并
- [x] API：`POST /api/podcast/episode/{id}/transcribe`
- [x] 前端触发：Podcast 页面添加"开启精听模式"按钮
- [x] 统一播放页：复用 `AudioContentRenderer`
- [x] 进度反馈：轮询 `transcript_status`

### 后续迭代 (P1+)

- [ ] WebSocket 实时进度推送
- [ ] 支持 URL 输入（自动下载远程音频）
- [ ] 其他引擎适配（Whisper, Deepgram）
- [ ] SenseVoice 特色功能：情绪标签、事件标签的前端展示
- [ ] 转录结果编辑/校正功能

---

## 11. 上下文依赖 (Context Dependencies)

- **AudiobookProvider**: 参考其 `ContentBundle` 构建逻辑
- **AudioContentRenderer**: 统一播放页的渲染组件
- **useAudioPlayer**: 共享的音频播放 Hook (`@nce/shared`)
- **BackgroundTasks**: FastAPI 异步任务处理
