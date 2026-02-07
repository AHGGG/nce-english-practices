# 06 - Phase 2: Audiobook Support

> Phase 2 实现计划 - 有声书支持

## 0. Current State Analysis (2026-02-07)

### 已有 Podcast 实现

Web 端已经有完整的 Podcast 功能：

| 组件                      | 位置                                                   | 功能                                      |
| ------------------------- | ------------------------------------------------------ | ----------------------------------------- |
| **PodcastContext**        | `apps/web/src/context/PodcastContext.jsx`              | 全局音频状态管理（HTML5 Audio API）       |
| **PlayerBar**             | `apps/web/src/components/podcast/PlayerBar.jsx`        | 底部播放器 UI（进度条、速度控制）         |
| **PodcastLayout**         | `apps/web/src/components/podcast/PodcastLayout.jsx`    | 共享布局（Library/Search/Downloads 导航） |
| **PodcastFeedDetailView** | `apps/web/src/views/podcast/PodcastFeedDetailView.jsx` | 集列表 + 播放/下载/进度追踪               |
| **PodcastProvider**       | `app/services/content_providers/podcast_provider.py`   | 后端 RSS 解析                             |

### 设计调整

1. **复用 PodcastContext 的音频播放逻辑**，而不是创建新的 `useAudioSync` hook
2. **AudioContentRenderer** 应该在 Reading 模式下使用，提供字幕同步高亮
3. **Audiobook** 是本地文件（`resources/audiobooks/`），而 Podcast 是远程 RSS

### Phase 2 范围修订

| 原计划                        | 调整                                       |
| ----------------------------- | ------------------------------------------ |
| 新建 useAudioSync hook        | 复用 PodcastContext 模式，按需抽取共享逻辑 |
| AudioContentRenderer 从头实现 | 基于现有 PlayerBar 模式，增加字幕同步高亮  |
| 完整前端 UI                   | 集成到 Reading 模式，不创建独立页面        |

## 1. Overview

| 项目         | 内容                                  |
| ------------ | ------------------------------------- |
| **目标**     | 支持有声书内容类型（音频 + 字幕同步） |
| **预计周期** | 2-3 周                                |
| **依赖**     | Phase 1 完成                          |
| **风险**     | 低（大量复用现有 Podcast 基础设施）   |

## 2. Features

### 2.1 Core Features (本 Phase 实现)

- [ ] 音频播放（播放/暂停/进度条）← **复用 PodcastContext**
- [ ] 字幕同步高亮 ← **新增**
- [ ] 点击字幕跳转 ← **新增**
- [ ] 播放速度调节 ← **复用 PlayerBar**
- [ ] 词汇点击查词 ← **复用 SentenceBlock**

### 2.2 Nice-to-Have (Future)

- [ ] 循环播放单句
- [ ] A-B 循环
- [ ] 离线缓存 ← Podcast 已有，可复用

## 3. Backend Implementation

### 3.1 Schema Changes

**文件**: `app/models/content_schemas.py`

现有 Schema 已经支持音频内容：

- `ContentSentence` 已有 `start_time`, `end_time`, `audio_url` 字段
- `ContentBundle` 已有 `audio_url` 字段

新增内容：

```python
# 扩展 SourceType
class SourceType(str, Enum):
    EPUB = "epub"
    PODCAST = "podcast"
    RSS = "rss"
    PLAIN_TEXT = "plain_text"
    AUDIOBOOK = "audiobook"  # 新增

# 扩展 BlockType
class BlockType(str, Enum):
    PARAGRAPH = "paragraph"
    IMAGE = "image"
    HEADING = "heading"
    SUBTITLE = "subtitle"
    AUDIO_SEGMENT = "audio_segment"  # 新增

# 扩展 ContentBlock
class ContentBlock(BaseModel):
    # ... existing fields

    # New: For AUDIO_SEGMENT
    start_time: Optional[float] = None  # 新增
    end_time: Optional[float] = None    # 新增
```

### 3.2 AudiobookProvider

**文件**: `app/services/content_providers/audiobook_provider.py`

```python
import re
from pathlib import Path
from typing import List, Optional, Any, Tuple
from app.models.content_schemas import (
    ContentBundle, ContentBlock, BlockType, SourceType
)
from app.services.content_providers.base import BaseContentProvider
import logging

logger = logging.getLogger(__name__)


class AudiobookProvider(BaseContentProvider):
    """
    有声书内容提供者

    目录结构:
    resources/audiobooks/
    ├── {book_id}/
    │   ├── audio.mp3 (or .m4a, .wav)
    │   ├── subtitles.srt (or .vtt, .lrc)
    │   └── metadata.json (optional)
    """

    AUDIOBOOK_DIR = Path("resources/audiobooks")
    SUPPORTED_AUDIO = {".mp3", ".m4a", ".wav", ".ogg"}
    SUPPORTED_SUBTITLE = {".srt", ".vtt", ".lrc"}

    @property
    def source_type(self) -> SourceType:
        return SourceType.AUDIOBOOK

    def _find_audio_file(self, book_path: Path) -> Optional[Path]:
        """查找音频文件"""
        for ext in self.SUPPORTED_AUDIO:
            for pattern in ["audio", "main", "*"]:
                matches = list(book_path.glob(f"{pattern}{ext}"))
                if matches:
                    return matches[0]
        return None

    def _find_subtitle_file(self, book_path: Path) -> Optional[Path]:
        """查找字幕文件"""
        for ext in self.SUPPORTED_SUBTITLE:
            for pattern in ["subtitles", "subtitle", "captions", "*"]:
                matches = list(book_path.glob(f"{pattern}{ext}"))
                if matches:
                    return matches[0]
        return None

    def _parse_srt(self, srt_path: Path) -> List[ContentBlock]:
        """解析 SRT 字幕"""
        blocks = []
        content = srt_path.read_text(encoding="utf-8")

        # SRT 格式:
        # 1
        # 00:00:01,000 --> 00:00:04,000
        # Text content

        pattern = r"(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n(.*?)(?=\n\n|\Z)"
        matches = re.findall(pattern, content, re.DOTALL)

        for idx, start, end, text in matches:
            start_sec = self._time_to_seconds(start)
            end_sec = self._time_to_seconds(end)
            text = text.strip().replace("\n", " ")

            blocks.append(ContentBlock(
                type=BlockType.AUDIO_SEGMENT,
                text=text,
                sentences=[text],
                start_time=start_sec,
                end_time=end_sec,
            ))

        return blocks

    def _parse_vtt(self, vtt_path: Path) -> List[ContentBlock]:
        """解析 VTT 字幕"""
        blocks = []
        content = vtt_path.read_text(encoding="utf-8")

        # 跳过 WEBVTT 头
        if content.startswith("WEBVTT"):
            content = content.split("\n\n", 1)[1] if "\n\n" in content else ""

        # VTT 格式类似 SRT，但时间用 . 而不是 ,
        pattern = r"(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})\n(.*?)(?=\n\n|\Z)"
        matches = re.findall(pattern, content, re.DOTALL)

        for start, end, text in matches:
            start_sec = self._time_to_seconds(start.replace(".", ","))
            end_sec = self._time_to_seconds(end.replace(".", ","))
            text = text.strip().replace("\n", " ")

            blocks.append(ContentBlock(
                type=BlockType.AUDIO_SEGMENT,
                text=text,
                sentences=[text],
                start_time=start_sec,
                end_time=end_sec,
            ))

        return blocks

    def _parse_lrc(self, lrc_path: Path) -> List[ContentBlock]:
        """解析 LRC 歌词"""
        blocks = []
        content = lrc_path.read_text(encoding="utf-8")

        # LRC 格式: [mm:ss.xx]Text
        pattern = r"\[(\d{2}):(\d{2})\.(\d{2})\](.*)"
        matches = re.findall(pattern, content)

        for i, (mm, ss, ms, text) in enumerate(matches):
            start_sec = int(mm) * 60 + int(ss) + int(ms) / 100

            # 结束时间 = 下一行开始时间
            if i + 1 < len(matches):
                next_mm, next_ss, next_ms, _ = matches[i + 1]
                end_sec = int(next_mm) * 60 + int(next_ss) + int(next_ms) / 100
            else:
                end_sec = start_sec + 5  # 默认 5 秒

            text = text.strip()
            if text:
                blocks.append(ContentBlock(
                    type=BlockType.AUDIO_SEGMENT,
                    text=text,
                    sentences=[text],
                    start_time=start_sec,
                    end_time=end_sec,
                ))

        return blocks

    def _time_to_seconds(self, time_str: str) -> float:
        """转换时间字符串为秒数"""
        # 格式: HH:MM:SS,mmm 或 MM:SS,mmm
        parts = time_str.replace(",", ".").split(":")
        if len(parts) == 3:
            h, m, s = parts
            return int(h) * 3600 + int(m) * 60 + float(s)
        elif len(parts) == 2:
            m, s = parts
            return int(m) * 60 + float(s)
        return 0

    async def fetch(
        self,
        book_id: str,
        chapter_index: int = 0,
        **kwargs: Any
    ) -> ContentBundle:
        """获取有声书内容"""
        book_path = self.AUDIOBOOK_DIR / book_id

        if not book_path.exists():
            raise FileNotFoundError(f"Audiobook not found: {book_id}")

        # 查找音频文件
        audio_file = self._find_audio_file(book_path)
        if not audio_file:
            raise FileNotFoundError(f"No audio file found in: {book_id}")

        # 查找字幕文件
        subtitle_file = self._find_subtitle_file(book_path)
        blocks = []

        if subtitle_file:
            ext = subtitle_file.suffix.lower()
            if ext == ".srt":
                blocks = self._parse_srt(subtitle_file)
            elif ext == ".vtt":
                blocks = self._parse_vtt(subtitle_file)
            elif ext == ".lrc":
                blocks = self._parse_lrc(subtitle_file)

        # 构建音频 URL
        audio_url = f"/api/content/audiobook/{book_id}/audio"

        # 读取元数据
        metadata_file = book_path / "metadata.json"
        metadata = {}
        if metadata_file.exists():
            import json
            metadata = json.loads(metadata_file.read_text())

        title = metadata.get("title", book_id)

        # 合并全文
        full_text = " ".join(b.text for b in blocks if b.text)

        return ContentBundle(
            id=f"audiobook:{book_id}:{chapter_index}",
            source_type=SourceType.AUDIOBOOK,
            title=title,
            audio_url=audio_url,
            blocks=blocks,
            full_text=full_text,
            metadata={
                "book_id": book_id,
                "chapter_index": chapter_index,
                "audio_file": audio_file.name,
                "subtitle_file": subtitle_file.name if subtitle_file else None,
                **metadata,
            },
        )

    def get_audio_file(self, book_id: str) -> Optional[Tuple[Path, str]]:
        """获取音频文件路径和 MIME 类型"""
        book_path = self.AUDIOBOOK_DIR / book_id
        audio_file = self._find_audio_file(book_path)

        if not audio_file:
            return None

        mime_types = {
            ".mp3": "audio/mpeg",
            ".m4a": "audio/mp4",
            ".wav": "audio/wav",
            ".ogg": "audio/ogg",
        }
        mime_type = mime_types.get(audio_file.suffix.lower(), "audio/mpeg")

        return audio_file, mime_type
```

### 3.3 API Routes

**文件**: `app/api/routers/audiobook.py`

```python
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from app.services.content_service import content_service
from app.services.content_providers.audiobook_provider import AudiobookProvider
from app.models.content_schemas import SourceType

router = APIRouter(prefix="/api/content/audiobook", tags=["audiobook"])

# 获取 Provider 实例
def get_audiobook_provider() -> AudiobookProvider:
    provider = content_service._providers.get(SourceType.AUDIOBOOK)
    if not isinstance(provider, AudiobookProvider):
        raise HTTPException(500, "AudiobookProvider not registered")
    return provider


@router.get("/{book_id}")
async def get_audiobook(book_id: str, chapter_index: int = 0):
    """获取有声书内容"""
    try:
        bundle = await content_service.get_content(
            SourceType.AUDIOBOOK,
            book_id=book_id,
            chapter_index=chapter_index,
        )
        return bundle.model_dump()
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@router.get("/{book_id}/audio")
async def get_audio(book_id: str):
    """获取音频文件"""
    provider = get_audiobook_provider()
    result = provider.get_audio_file(book_id)

    if not result:
        raise HTTPException(404, f"Audio not found: {book_id}")

    audio_path, mime_type = result
    return FileResponse(
        audio_path,
        media_type=mime_type,
        filename=audio_path.name,
    )


@router.get("/{book_id}/audio/clip")
async def get_audio_clip(book_id: str, start: float, end: float):
    """获取音频片段（用于单句循环）"""
    # TODO: 使用 ffmpeg 切割音频
    raise HTTPException(501, "Audio clip not implemented yet")
```

### 3.4 Register Provider

**文件**: `app/services/content_service.py`

```python
# 添加导入
from app.services.content_providers.audiobook_provider import AudiobookProvider

# 在 __init__ 中注册
self.register_provider(AudiobookProvider())
```

## 4. Frontend Implementation

### 4.1 设计决策：复用 vs 新建

**现有 PodcastContext 优势**：

- 完整的 HTML5 Audio API 封装
- 进度追踪（本地 + 云端同步）
- 离线下载支持
- 播放速度持久化

**AudioContentRenderer 需要的额外功能**：

- 字幕同步高亮（根据 currentTime 高亮对应 segment）
- 点击字幕跳转（seekTo segment.startTime）

**决策**：创建独立的 `useAudioPlayer` hook，从 PodcastContext 抽取核心播放逻辑，供 AudioContentRenderer 使用。PodcastContext 继续服务于 Podcast 专用功能（订阅、下载、进度同步）。

### 4.2 useAudioPlayer Hook (新建)

**文件**: `packages/shared/src/hooks/useAudioPlayer.ts`

```typescript
import { useState, useRef, useCallback, useEffect } from "react";

export interface AudioSegment {
  index: number;
  text: string;
  sentences: string[];
  startTime: number; // seconds
  endTime: number; // seconds
}

export interface UseAudioPlayerOptions {
  audioUrl: string;
  segments?: AudioSegment[];
  onSegmentChange?: (index: number) => void;
  initialPlaybackRate?: number;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  activeSegmentIndex: number;
}

export interface AudioPlayerActions {
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => void;
  seekTo: (seconds: number) => void;
  seekToSegment: (index: number) => void;
  setPlaybackRate: (rate: number) => void;
}

export function useAudioPlayer(options: UseAudioPlayerOptions): {
  state: AudioPlayerState;
  actions: AudioPlayerActions;
  audioRef: React.RefObject<HTMLAudioElement>;
} {
  const {
    audioUrl,
    segments = [],
    onSegmentChange,
    initialPlaybackRate = 1,
  } = options;

  const audioRef = useRef<HTMLAudioElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(initialPlaybackRate);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(-1);

  // 计算当前活跃的 segment
  useEffect(() => {
    if (!segments.length) return;

    const idx = segments.findIndex(
      (seg) => currentTime >= seg.startTime && currentTime < seg.endTime,
    );

    if (idx !== activeSegmentIndex && idx !== -1) {
      setActiveSegmentIndex(idx);
      onSegmentChange?.(idx);
    }
  }, [currentTime, segments, activeSegmentIndex, onSegmentChange]);

  // Audio element event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, []);

  // Update audio src when URL changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    audio.src = audioUrl;
    audio.playbackRate = playbackRate;
  }, [audioUrl]);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      await audio.play();
      setIsPlaying(true);
    } catch (e) {
      console.error("Play failed:", e);
    }
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    isPlaying ? pause() : play();
  }, [isPlaying, play, pause]);

  const seekTo = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      if (!audio) return;

      audio.currentTime = Math.max(0, Math.min(seconds, duration));
      setCurrentTime(audio.currentTime);
    },
    [duration],
  );

  const seekToSegment = useCallback(
    (index: number) => {
      if (index >= 0 && index < segments.length) {
        seekTo(segments[index].startTime);
      }
    },
    [segments, seekTo],
  );

  const setPlaybackRate = useCallback((rate: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = rate;
    }
    setPlaybackRateState(rate);
  }, []);

  return {
    state: {
      isPlaying,
      isLoading,
      currentTime,
      duration,
      playbackRate,
      activeSegmentIndex,
    },
    actions: {
      play,
      pause,
      togglePlay,
      seekTo,
      seekToSegment,
      setPlaybackRate,
    },
    audioRef,
  };
}
```

### 4.3 AudioContentRenderer

**文件**: `apps/web/src/components/content/renderers/AudioContentRenderer.tsx`

```tsx
import React from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Gauge,
  Loader2,
} from "lucide-react";
import type {
  ContentRenderer,
  ContentRendererProps,
  ContentBundle,
} from "../types";
import { SentenceBlock } from "../shared";
import { useAudioPlayer, AudioSegment } from "@nce/shared/hooks";

export class AudioContentRenderer implements ContentRenderer {
  readonly name = "AudioContentRenderer";

  canRender(bundle: ContentBundle): boolean {
    // Audiobook 使用 blocks with AUDIO_SEGMENT
    // 也可以处理有 audio_url 的 ContentBundle
    return (
      bundle.source_type === "audiobook" ||
      (bundle.audio_url &&
        bundle.blocks.some((b) => b.type === "audio_segment"))
    );
  }

  render(props: ContentRendererProps): React.ReactNode {
    return <AudioContentRendererComponent {...props} />;
  }
}

function AudioContentRendererComponent({
  bundle,
  highlightSet,
  studyHighlightSet,
  showHighlights = true,
  onWordClick,
  tracker,
}: ContentRendererProps) {
  // 转换 blocks 为 segments
  const segments: AudioSegment[] = React.useMemo(
    () =>
      bundle.blocks
        .filter((b) => b.type === "audio_segment")
        .map((b, i) => ({
          index: i,
          text: b.text || "",
          sentences: b.sentences || [],
          startTime: b.start_time || 0,
          endTime: b.end_time || 0,
        })),
    [bundle.blocks],
  );

  // 使用抽取的 hook
  const { state, actions, audioRef } = useAudioPlayer({
    audioUrl: bundle.audio_url || "",
    segments,
    onSegmentChange: (index) => {
      tracker?.onSentenceView(index);
    },
  });

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* 字幕区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {segments.map((segment, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg cursor-pointer transition-all ${
                state.activeSegmentIndex === idx
                  ? "bg-accent-primary/20 border-l-4 border-accent-primary"
                  : "hover:bg-white/5"
              }`}
              onClick={() => actions.seekToSegment(idx)}
            >
              {/* 时间戳 */}
              <div className="text-xs text-text-muted font-mono mb-2">
                {formatTime(segment.startTime)}
              </div>

              {/* 句子内容 - 点击词汇不触发 segment seek */}
              <div onClick={(e) => e.stopPropagation()}>
                <SentenceBlock
                  text={segment.text}
                  highlightSet={highlightSet}
                  studyHighlightSet={studyHighlightSet}
                  showHighlights={showHighlights}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 播放控制栏 - 复用 PlayerBar 样式 */}
      <div className="shrink-0 border-t border-white/10 bg-white/[0.02] backdrop-blur-xl px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {/* 进度条 */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-text-muted font-mono w-12">
              {formatTime(state.currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={state.duration || 100}
              value={state.currentTime}
              onChange={(e) => actions.seekTo(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none
                         [&::-webkit-slider-thumb]:w-3
                         [&::-webkit-slider-thumb]:h-3
                         [&::-webkit-slider-thumb]:bg-accent-primary
                         [&::-webkit-slider-thumb]:rounded-full"
            />
            <span className="text-xs text-text-muted font-mono w-12 text-right">
              {formatTime(state.duration)}
            </span>
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() =>
                actions.seekTo(Math.max(0, state.currentTime - 15))
              }
              className="p-2 text-white/50 hover:text-white transition-colors hover:bg-white/5 rounded-full"
              title="Back 15s"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={actions.togglePlay}
              className="p-4 bg-accent-primary text-black rounded-full hover:bg-accent-primary/90 transition-colors shadow-lg"
            >
              {state.isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : state.isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={() =>
                actions.seekTo(Math.min(state.duration, state.currentTime + 30))
              }
              className="p-2 text-white/50 hover:text-white transition-colors hover:bg-white/5 rounded-full"
              title="Forward 30s"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            {/* 播放速度 */}
            <div className="ml-4 flex items-center gap-1 px-3 py-1.5 text-sm bg-white/5 rounded-lg text-white border border-white/10">
              <Gauge className="w-4 h-4 text-accent-primary" />
              <select
                value={state.playbackRate}
                onChange={(e) =>
                  actions.setPlaybackRate(parseFloat(e.target.value))
                }
                className="bg-transparent font-mono cursor-pointer outline-none"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 隐藏的 audio 元素 */}
      <audio ref={audioRef} preload="metadata" />
    </div>
  );
}

export default AudioContentRenderer;
```

### 4.4 Register AudioContentRenderer

**文件**: `apps/web/src/components/content/index.ts`

```typescript
import { AudioContentRenderer } from "./renderers/AudioContentRenderer";

export function initializeRenderers(): void {
  // ... existing registrations

  // Audio content (Audiobook only - Podcast has its own UI)
  const audioRenderer = new AudioContentRenderer();
  rendererRegistry.register("audiobook", audioRenderer);
}
```

**注意**: Podcast 不使用 AudioContentRenderer，因为它有专门的 `PodcastFeedDetailView` + `PlayerBar` 组合。

## 5. Testing Checklist

### 后端测试

- [x] AudiobookProvider 正确解析 SRT 字幕
- [x] AudiobookProvider 正确解析 VTT 字幕
- [x] AudiobookProvider 正确解析 LRC 歌词
- [x] `/api/content/audiobook/{book_id}` 返回正确的 ContentBundle
- [x] `/api/content/audiobook/{book_id}/audio` 正确流式传输音频文件
- [x] 无字幕时返回空 blocks 列表（不报错）

### 前端测试

- [x] useAudioPlayer hook 正确管理播放状态
- [ ] 字幕同步高亮准确（±0.5s 误差内）
- [x] 点击字幕跳转到对应时间点
- [x] 进度条拖动正常
- [x] 播放速度切换正常（0.5x - 2x）
- [x] 词汇点击弹出词典（复用 SentenceBlock）

### 格式测试

- [ ] MP3 音频播放正常
- [ ] M4A 音频播放正常
- [ ] WAV 音频播放正常（如支持）

### 边界测试

- [ ] 无字幕文件时显示纯播放器
- [ ] 空字幕文件不报错
- [ ] 长音频（1小时+）渲染性能正常

## 6. Success Criteria

- [ ] 有声书可正常播放
- [ ] 字幕同步准确（视觉体验流畅）
- [ ] 词汇学习功能正常（点击查词）
- [ ] 无性能问题（长列表使用虚拟化或分页）
- [ ] 与现有 Podcast 功能无冲突

## 7. Implementation Order

1. **后端**: Schema 扩展 (SourceType.AUDIOBOOK, BlockType.AUDIO_SEGMENT) ✅
2. **后端**: AudiobookProvider + 注册 ✅
3. **后端**: API routes (`/api/content/audiobook/...`) ✅
4. **前端**: useAudioPlayer hook (packages/shared) ✅
5. **前端**: AudioContentRenderer + 注册 ✅
6. **集成测试**: 端到端测试 ⏳

---

_Next: [07-phase3-comic.md](./07-phase3-comic.md) - Phase 3 漫画支持_
