# 06 - Phase 2: Audiobook Support

> Phase 2 实现计划 - 有声书支持

## 1. Overview

| 项目         | 内容                                  |
| ------------ | ------------------------------------- |
| **目标**     | 支持有声书内容类型（音频 + 字幕同步） |
| **预计周期** | 2-3 周                                |
| **依赖**     | Phase 1 完成                          |
| **风险**     | 中（涉及后端 + 前端）                 |

## 2. Features

### 2.1 Core Features

- [ ] 音频播放（播放/暂停/进度条）
- [ ] 字幕同步高亮
- [ ] 点击字幕跳转
- [ ] 播放速度调节
- [ ] 词汇点击查词

### 2.2 Nice-to-Have

- [ ] 循环播放单句
- [ ] A-B 循环
- [ ] 离线缓存

## 3. Backend Implementation

### 3.1 Schema Changes

**文件**: `app/models/content_schemas.py`

```python
# 扩展 SourceType
class SourceType(str, Enum):
    # ... existing
    AUDIOBOOK = "audiobook"

# 扩展 BlockType
class BlockType(str, Enum):
    # ... existing
    AUDIO_SEGMENT = "audio_segment"

# 扩展 ContentBlock
class ContentBlock(BaseModel):
    # ... existing fields

    # New: For AUDIO_SEGMENT
    audio_url: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
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

### 4.1 AudioContentRenderer

**文件**: `apps/web/src/components/content/renderers/AudioContentRenderer.tsx`

```tsx
import React, { useRef } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import type {
  ContentRenderer,
  ContentRendererProps,
  ContentBundle,
  AudioSegment,
} from "../types";
import { SentenceBlock } from "../shared";
import { useAudioSync } from "@nce/shared/hooks";

export class AudioContentRenderer implements ContentRenderer {
  readonly name = "AudioContentRenderer";

  canRender(bundle: ContentBundle): boolean {
    return ["podcast", "audiobook"].includes(bundle.source_type);
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
  const segments: AudioSegment[] = bundle.blocks
    .filter((b) => b.type === "audio_segment")
    .map((b, i) => ({
      index: i,
      text: b.text || "",
      sentences: b.sentences || [],
      startTime: b.start_time || 0,
      endTime: b.end_time || 0,
    }));

  // 音频同步 hook
  const { state, actions, audioRef } = useAudioSync({
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

  // 处理词汇点击
  const handleWordClick = (word: string, sentence: string) => {
    onWordClick?.(word, sentence);
    tracker?.onWordClick();
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

              {/* 句子内容 */}
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

      {/* 播放控制栏 */}
      <div className="shrink-0 border-t border-white/10 bg-bg-elevated px-4 py-4">
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
            {/* 后退 10 秒 */}
            <button
              onClick={() =>
                actions.seekTo(Math.max(0, state.currentTime - 10))
              }
              className="p-2 text-text-secondary hover:text-white transition-colors"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            {/* 播放/暂停 */}
            <button
              onClick={actions.togglePlay}
              className="p-4 bg-accent-primary text-black rounded-full hover:bg-accent-primary/90 transition-colors"
            >
              {state.isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" />
              )}
            </button>

            {/* 前进 10 秒 */}
            <button
              onClick={() =>
                actions.seekTo(Math.min(state.duration, state.currentTime + 10))
              }
              className="p-2 text-text-secondary hover:text-white transition-colors"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            {/* 播放速度 */}
            <select
              value={state.playbackRate}
              onChange={(e) =>
                actions.setPlaybackRate(parseFloat(e.target.value))
              }
              className="ml-4 bg-transparent text-text-secondary text-sm font-mono cursor-pointer"
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

      {/* 隐藏的 audio 元素 */}
      <audio ref={audioRef} src={bundle.audio_url} preload="metadata" />
    </div>
  );
}

export default AudioContentRenderer;
```

### 4.2 Register AudioContentRenderer

**文件**: `apps/web/src/components/content/index.ts`

```typescript
import { AudioContentRenderer } from "./renderers/AudioContentRenderer";

export function initializeRenderers(): void {
  // ... existing

  // Audio content
  const audioRenderer = new AudioContentRenderer();
  rendererRegistry.register("podcast", audioRenderer);
  rendererRegistry.register("audiobook", audioRenderer);
}
```

## 5. Testing Checklist

### 功能测试

- [ ] 音频播放/暂停
- [ ] 进度条拖动
- [ ] 字幕同步高亮
- [ ] 点击字幕跳转
- [ ] 播放速度调节
- [ ] 词汇点击查词
- [ ] 阅读追踪正常

### 格式测试

- [ ] SRT 字幕解析
- [ ] VTT 字幕解析
- [ ] LRC 歌词解析
- [ ] MP3 音频播放
- [ ] M4A 音频播放

### 边界测试

- [ ] 无字幕文件
- [ ] 空字幕文件
- [ ] 长音频（1小时+）

## 6. Success Criteria

- [ ] 有声书可正常播放
- [ ] 字幕同步准确
- [ ] 词汇学习功能正常
- [ ] 性能无明显问题

---

_Next: [07-phase3-comic.md](./07-phase3-comic.md) - Phase 3 漫画支持_
