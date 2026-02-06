# 04d - Shared Hooks

> 共享 Hooks 设计

## 1. Hook Overview

| Hook                     | 职责                     | 状态    |
| ------------------------ | ------------------------ | ------- |
| `useWordInteraction`     | 词汇点击、查词、更新高亮 | 新建    |
| `useVocabularyHighlight` | 计算词汇高亮集合         | 新建    |
| `useLearningIntegration` | 复习队列、熟练度         | 新建    |
| `useReadingTracker`      | 阅读行为追踪             | 已存在  |
| `useAudioSync`           | 音频字幕同步             | Phase 2 |

## 2. useWordInteraction

```typescript
// packages/shared/src/hooks/useWordInteraction.ts

import { useState, useCallback } from "react";
import { useWordExplainer } from "./useWordExplainer";

export interface UseWordInteractionOptions {
  /** 初始学习高亮集合 */
  initialStudyHighlights?: Set<string>;

  /** 词汇点击回调 */
  onWordClick?: (word: string, sentence: string) => void;

  /** 查词完成回调 */
  onWordLookup?: (word: string) => void;
}

export interface UseWordInteractionReturn {
  /** 当前选中的词 */
  selectedWord: string | null;

  /** 当前选中词的句子上下文 */
  selectedSentence: string | null;

  /** 学习高亮集合（查过的词） */
  studyHighlightSet: Set<string>;

  /** 处理词汇点击 */
  handleWordClick: (word: string, sentence: string) => void;

  /** 清除选中 */
  clearSelection: () => void;

  /** 词汇解释器 */
  explainer: ReturnType<typeof useWordExplainer>;
}

export function useWordInteraction(
  options: UseWordInteractionOptions = {},
): UseWordInteractionReturn {
  const {
    initialStudyHighlights = new Set(),
    onWordClick,
    onWordLookup,
  } = options;

  // 选中状态
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedSentence, setSelectedSentence] = useState<string | null>(null);

  // 学习高亮集合
  const [studyHighlightSet, setStudyHighlightSet] = useState<Set<string>>(
    initialStudyHighlights,
  );

  // 词汇解释器
  const explainer = useWordExplainer();

  // 处理词汇点击
  const handleWordClick = useCallback(
    (word: string, sentence: string) => {
      const cleanWord = word.toLowerCase().trim();

      // 更新选中状态
      setSelectedWord(cleanWord);
      setSelectedSentence(sentence);

      // 添加到学习高亮
      setStudyHighlightSet((prev) => {
        const next = new Set(prev);
        next.add(cleanWord);
        return next;
      });

      // 触发查词
      explainer.lookup(cleanWord, sentence);

      // 回调
      onWordClick?.(cleanWord, sentence);
      onWordLookup?.(cleanWord);
    },
    [explainer, onWordClick, onWordLookup],
  );

  // 清除选中
  const clearSelection = useCallback(() => {
    setSelectedWord(null);
    setSelectedSentence(null);
    explainer.clear();
  }, [explainer]);

  return {
    selectedWord,
    selectedSentence,
    studyHighlightSet,
    handleWordClick,
    clearSelection,
    explainer,
  };
}
```

## 3. useVocabularyHighlight

```typescript
// packages/shared/src/hooks/useVocabularyHighlight.ts

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { vocabularyApi } from "@nce/api";

export interface HighlightOption {
  label: string;
  value: string;
  range?: [number, number];
}

export const HIGHLIGHT_OPTIONS: HighlightOption[] = [
  { label: "COCA Top 5000", value: "coca20000", range: [1, 5000] },
  { label: "COCA 5k-10k", value: "coca20000", range: [5001, 10000] },
  { label: "COCA 10k-15k", value: "coca20000", range: [10001, 15000] },
  { label: "COCA 15k-20k", value: "coca20000", range: [15001, 20000] },
  { label: "CET-4", value: "cet4" },
  { label: "CET-6", value: "cet6" },
];

export interface UseVocabularyHighlightOptions {
  /** 高亮选项索引 */
  optionIndex: number;

  /** 是否启用 */
  enabled?: boolean;

  /** 已知词汇（排除） */
  knownWords?: Set<string>;
}

export interface UseVocabularyHighlightReturn {
  /** 高亮词汇集合 */
  highlightSet: Set<string>;

  /** 是否加载中 */
  isLoading: boolean;

  /** 当前选项 */
  currentOption: HighlightOption;
}

export function useVocabularyHighlight(
  options: UseVocabularyHighlightOptions,
): UseVocabularyHighlightReturn {
  const { optionIndex, enabled = true, knownWords = new Set() } = options;

  const currentOption = HIGHLIGHT_OPTIONS[optionIndex] || HIGHLIGHT_OPTIONS[0];

  // 获取词汇表
  const { data: vocabulary, isLoading } = useQuery({
    queryKey: ["vocabulary", currentOption.value, currentOption.range],
    queryFn: async () => {
      const result = await vocabularyApi.getVocabularyList(
        currentOption.value,
        currentOption.range,
      );
      return new Set(result.words.map((w: string) => w.toLowerCase()));
    },
    enabled,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // 计算高亮集合（排除已知词汇）
  const highlightSet = useMemo(() => {
    if (!vocabulary) return new Set<string>();

    const result = new Set<string>();
    vocabulary.forEach((word) => {
      if (!knownWords.has(word)) {
        result.add(word);
      }
    });
    return result;
  }, [vocabulary, knownWords]);

  return {
    highlightSet,
    isLoading,
    currentOption,
  };
}
```

## 4. useLearningIntegration

```typescript
// packages/shared/src/hooks/useLearningIntegration.ts

import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewApi, proficiencyApi } from "@nce/api";

export interface UseLearningIntegrationOptions {
  /** 文章 ID */
  articleId?: string;

  /** 来源类型 */
  sourceType?: string;
}

export interface UseLearningIntegrationReturn {
  /** 标记词汇为已知 */
  markAsKnown: (word: string) => Promise<void>;

  /** 添加到复习队列 */
  addToReview: (word: string, sentence?: string) => Promise<void>;

  /** 更新熟练度 */
  updateProficiency: (word: string, correct: boolean) => Promise<void>;

  /** 批量标记已知（Sweep） */
  sweepAsKnown: (words: string[]) => Promise<void>;

  /** 是否正在处理 */
  isProcessing: boolean;
}

export function useLearningIntegration(
  options: UseLearningIntegrationOptions = {},
): UseLearningIntegrationReturn {
  const { articleId, sourceType } = options;
  const queryClient = useQueryClient();

  // 标记已知
  const markKnownMutation = useMutation({
    mutationFn: async (word: string) => {
      await proficiencyApi.markAsKnown(word);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knownWords"] });
    },
  });

  // 添加到复习
  const addReviewMutation = useMutation({
    mutationFn: async ({
      word,
      sentence,
    }: {
      word: string;
      sentence?: string;
    }) => {
      await reviewApi.addToQueue({
        word,
        sentence,
        source_id: articleId,
        source_type: sourceType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviewQueue"] });
    },
  });

  // 更新熟练度
  const updateProficiencyMutation = useMutation({
    mutationFn: async ({
      word,
      correct,
    }: {
      word: string;
      correct: boolean;
    }) => {
      await proficiencyApi.updateProficiency(word, correct);
    },
  });

  // 批量标记已知
  const sweepMutation = useMutation({
    mutationFn: async (words: string[]) => {
      await proficiencyApi.batchMarkAsKnown(words);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knownWords"] });
    },
  });

  const markAsKnown = useCallback(
    async (word: string) => {
      await markKnownMutation.mutateAsync(word);
    },
    [markKnownMutation],
  );

  const addToReview = useCallback(
    async (word: string, sentence?: string) => {
      await addReviewMutation.mutateAsync({ word, sentence });
    },
    [addReviewMutation],
  );

  const updateProficiency = useCallback(
    async (word: string, correct: boolean) => {
      await updateProficiencyMutation.mutateAsync({ word, correct });
    },
    [updateProficiencyMutation],
  );

  const sweepAsKnown = useCallback(
    async (words: string[]) => {
      await sweepMutation.mutateAsync(words);
    },
    [sweepMutation],
  );

  const isProcessing =
    markKnownMutation.isPending ||
    addReviewMutation.isPending ||
    updateProficiencyMutation.isPending ||
    sweepMutation.isPending;

  return {
    markAsKnown,
    addToReview,
    updateProficiency,
    sweepAsKnown,
    isProcessing,
  };
}
```

## 5. useAudioSync (Phase 2)

```typescript
// packages/shared/src/hooks/useAudioSync.ts

import { useState, useRef, useCallback, useEffect } from "react";
import type {
  AudioSegment,
  AudioSyncState,
  AudioSyncActions,
  UseAudioSyncReturn,
} from "../types";

export interface UseAudioSyncOptions {
  /** 音频 URL */
  audioUrl: string;

  /** 音频片段列表 */
  segments: AudioSegment[];

  /** 自动播放 */
  autoPlay?: boolean;

  /** 播放完成回调 */
  onComplete?: () => void;

  /** Segment 变化回调 */
  onSegmentChange?: (index: number) => void;
}

export function useAudioSync(options: UseAudioSyncOptions): UseAudioSyncReturn {
  const {
    audioUrl,
    segments,
    autoPlay = false,
    onComplete,
    onSegmentChange,
  } = options;

  const audioRef = useRef<HTMLAudioElement>(null);

  // 状态
  const [state, setState] = useState<AudioSyncState>({
    currentTime: 0,
    isPlaying: false,
    activeSegmentIndex: -1,
    duration: 0,
    playbackRate: 1,
  });

  // 根据当前时间找到对应的 segment
  const findActiveSegment = useCallback(
    (time: number): number => {
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (time >= seg.startTime && time < seg.endTime) {
          return i;
        }
      }
      return -1;
    },
    [segments],
  );

  // 时间更新处理
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;
      const activeIndex = findActiveSegment(currentTime);

      setState((prev) => {
        if (prev.activeSegmentIndex !== activeIndex) {
          onSegmentChange?.(activeIndex);
        }
        return {
          ...prev,
          currentTime,
          activeSegmentIndex: activeIndex,
        };
      });
    };

    const handleLoadedMetadata = () => {
      setState((prev) => ({
        ...prev,
        duration: audio.duration,
      }));
    };

    const handlePlay = () => {
      setState((prev) => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
    };

    const handleEnded = () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
      onComplete?.();
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [findActiveSegment, onComplete, onSegmentChange]);

  // Actions
  const actions: AudioSyncActions = {
    togglePlay: useCallback(() => {
      const audio = audioRef.current;
      if (!audio) return;

      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
      }
    }, []),

    seekTo: useCallback((time: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = time;
    }, []),

    seekToSegment: useCallback(
      (index: number) => {
        const segment = segments[index];
        if (!segment) return;

        const audio = audioRef.current;
        if (!audio) return;

        audio.currentTime = segment.startTime;
        if (audio.paused) {
          audio.play();
        }
      },
      [segments],
    ),

    setPlaybackRate: useCallback((rate: number) => {
      const audio = audioRef.current;
      if (!audio) return;

      audio.playbackRate = rate;
      setState((prev) => ({ ...prev, playbackRate: rate }));
    }, []),
  };

  // 自动播放
  useEffect(() => {
    if (autoPlay && audioRef.current) {
      audioRef.current.play().catch(() => {
        // 自动播放被阻止，忽略
      });
    }
  }, [autoPlay, audioUrl]);

  return {
    state,
    actions,
    audioRef,
  };
}
```

## 6. Index Export

```typescript
// packages/shared/src/hooks/index.ts

// Existing
export { useReadingTracker } from "./useReadingTracker";
export { useWordExplainer } from "./useWordExplainer";
export { useSentenceExplainer } from "./useSentenceExplainer";
export { useArticleReader } from "./useArticleReader";
export { useArticleList } from "./useArticleList";

// New (Phase 1)
export { useWordInteraction } from "./useWordInteraction";
export {
  useVocabularyHighlight,
  HIGHLIGHT_OPTIONS,
} from "./useVocabularyHighlight";
export { useLearningIntegration } from "./useLearningIntegration";

// New (Phase 2)
export { useAudioSync } from "./useAudioSync";
```

---

_Next: [05-phase1-renderer.md](./05-phase1-renderer.md) - Phase 1 实现计划_
