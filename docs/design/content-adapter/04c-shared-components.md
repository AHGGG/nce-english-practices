# 04c - Shared Components

> 共享组件设计

## 1. Component Overview

从现有 `MemoizedSentence` 和 `MemoizedImage` 提取，供所有 Renderer 复用。

| 组件                | 来源                   | 说明               |
| ------------------- | ---------------------- | ------------------ |
| `SentenceBlock`     | `MemoizedSentence.jsx` | 句子渲染、词汇高亮 |
| `ImageBlock`        | `MemoizedImage.jsx`    | 图片懒加载         |
| `HeadingBlock`      | 新建                   | 标题渲染           |
| `AudioSegmentBlock` | 新建 (Phase 2)         | 音频字幕段落       |

## 2. SentenceBlock

```tsx
// apps/web/src/components/content/shared/SentenceBlock.tsx

import React, { memo, useMemo } from "react";
import type { SentenceBlockProps, Collocation } from "../types";

/**
 * 句子渲染组件
 *
 * 功能：
 * - 词汇高亮 (COCA/CET)
 * - 学习高亮 (查过的词 - amber)
 * - 搭配词组渲染
 * - 不清楚句子标记
 *
 * 性能优化：
 * - 使用 memo 避免不必要的重渲染
 * - 自定义 arePropsEqual 处理 Set 比较
 */

// 不清楚句子样式
const getUnclearSentenceClass = (unclearChoice?: string): string => {
  switch (unclearChoice) {
    case "vocabulary":
      return "border-l-4 border-category-orange bg-category-orange/5 pl-2 -ml-2";
    case "grammar":
      return "border-l-4 border-category-blue bg-category-blue/5 pl-2 -ml-2";
    case "both":
      return "border-l-4 border-category-red bg-category-red/5 pl-2 -ml-2";
    default:
      return "";
  }
};

// Set 比较函数
const areSetsEqual = (setA?: Set<string>, setB?: Set<string>): boolean => {
  if (setA === setB) return true;
  if (!setA || !setB) return false;
  if (setA.size !== setB.size) return false;
  for (const item of setA) {
    if (!setB.has(item)) return false;
  }
  return true;
};

// Props 比较函数
const arePropsEqual = (
  prev: SentenceBlockProps,
  next: SentenceBlockProps,
): boolean => {
  if (prev.text !== next.text) return false;
  if (prev.showHighlights !== next.showHighlights) return false;
  if (!areSetsEqual(prev.highlightSet, next.highlightSet)) return false;
  if (!areSetsEqual(prev.studyHighlightSet, next.studyHighlightSet))
    return false;
  if (!areSetsEqual(prev.knownWords, next.knownWords)) return false;
  if (prev.collocations !== next.collocations) return false;
  if (prev.unclearInfo !== next.unclearInfo) return false;
  return true;
};

export const SentenceBlock = memo(function SentenceBlock({
  text,
  highlightSet,
  studyHighlightSet,
  knownWords = new Set(),
  showHighlights = true,
  collocations = [],
  unclearInfo,
}: SentenceBlockProps) {
  if (!text) return null;

  // 解析 tokens
  const tokens = text.split(/(\s+)/);

  // 构建词汇索引映射
  const { words, wordIndexMap } = useMemo(() => {
    const words: string[] = [];
    const wordIndexMap: Record<number, number> = {};

    tokens.forEach((token, tokenIdx) => {
      if (/\S/.test(token)) {
        wordIndexMap[words.length] = tokenIdx;
        words.push(token);
      }
    });

    return { words, wordIndexMap };
  }, [tokens]);

  // 过滤重叠的搭配词组
  const filteredCollocations = useMemo(() => {
    const usedIndices = new Set<number>();
    const result: Collocation[] = [];

    for (const coll of collocations) {
      let hasOverlap = false;
      for (let i = coll.start_word_idx; i <= coll.end_word_idx; i++) {
        if (usedIndices.has(i)) {
          hasOverlap = true;
          break;
        }
      }

      if (!hasOverlap) {
        result.push(coll);
        for (let i = coll.start_word_idx; i <= coll.end_word_idx; i++) {
          usedIndices.add(i);
        }
      }
    }

    return result;
  }, [collocations]);

  // 构建词汇到搭配的映射
  const wordToCollocation = useMemo(() => {
    const map: Record<number, Collocation> = {};
    filteredCollocations.forEach((coll) => {
      for (let i = coll.start_word_idx; i <= coll.end_word_idx; i++) {
        map[i] = coll;
      }
    });
    return map;
  }, [filteredCollocations]);

  // 渲染 tokens
  const rendered = useMemo(() => {
    const result: React.ReactNode[] = [];
    let wordIdx = 0;
    let i = 0;

    while (i < tokens.length) {
      const token = tokens[i];

      // 空白字符
      if (!/\S/.test(token)) {
        result.push(<span key={`ws-${i}`}>{token}</span>);
        i++;
        continue;
      }

      // 检查搭配词组
      const collocInfo = wordToCollocation[wordIdx];

      if (collocInfo && wordIdx === collocInfo.start_word_idx) {
        // 渲染整个搭配词组
        const collocationTokens: string[] = [];
        let endTokenIdx = i;

        for (
          let wIdx = collocInfo.start_word_idx;
          wIdx <= collocInfo.end_word_idx;
          wIdx++
        ) {
          const tokenIdx = wordIndexMap[wIdx];
          collocationTokens.push(tokens[tokenIdx]);
          if (wIdx < collocInfo.end_word_idx && tokenIdx + 1 < tokens.length) {
            collocationTokens.push(tokens[tokenIdx + 1]);
          }
          endTokenIdx = tokenIdx + 1;
        }

        const collocationText = collocationTokens.join("");
        const phraseText = collocInfo.text.toLowerCase();
        const isStudiedPhrase =
          showHighlights && studyHighlightSet?.has(phraseText);

        const phraseClassName = isStudiedPhrase
          ? "reading-word cursor-pointer px-0.5 text-category-amber border-b-2 border-category-amber bg-category-amber/10"
          : "reading-word cursor-pointer px-0.5 border-b-2 border-dashed border-neon-gold hover:bg-neon-gold/10 hover:text-neon-gold";

        result.push(
          <span
            key={`coll-${collocInfo.start_word_idx}`}
            data-word={phraseText}
            data-key-word={collocInfo.key_word}
            data-sentence={text}
            data-collocation="true"
            className={phraseClassName}
            title={
              isStudiedPhrase
                ? `📚 You looked this up: ${collocInfo.text}`
                : `Phrase: ${collocInfo.text}`
            }
          >
            {collocationText}
          </span>,
        );

        wordIdx = collocInfo.end_word_idx + 1;
        i = endTokenIdx;
        continue;
      }

      // 跳过已在搭配中的词
      if (collocInfo) {
        wordIdx++;
        i++;
        continue;
      }

      // 普通单词
      const clean = token.replace(/[^a-zA-Z'-]/g, "").toLowerCase();
      const isWord = /^[a-zA-Z'-]+$/.test(clean);

      if (!isWord) {
        result.push(<span key={`tok-${i}`}>{token}</span>);
      } else {
        const isKnown = knownWords.has(clean);
        const isVocabHighlighted =
          !isKnown && showHighlights && highlightSet?.has(clean);
        const isStudyHighlighted =
          !isKnown && showHighlights && studyHighlightSet?.has(clean);

        let className = "reading-word cursor-pointer px-0.5 ";
        if (isStudyHighlighted) {
          className +=
            "text-category-amber border-b border-category-amber/50 bg-category-amber/10";
        } else if (isVocabHighlighted) {
          className += "text-accent-primary border-b border-accent-primary/50";
        } else {
          className += "hover:text-accent-primary hover:bg-accent-primary/10";
        }

        result.push(
          <span
            key={`word-${i}`}
            data-word={clean}
            data-sentence={text}
            className={className}
            title={
              isStudyHighlighted
                ? "📚 You looked this up during study"
                : undefined
            }
          >
            {token}
          </span>,
        );
      }

      wordIdx++;
      i++;
    }

    return result;
  }, [
    tokens,
    wordToCollocation,
    wordIndexMap,
    showHighlights,
    highlightSet,
    studyHighlightSet,
    knownWords,
    text,
  ]);

  // 句子容器样式
  const sentenceClass = unclearInfo
    ? `mb-6 cursor-pointer hover:bg-opacity-20 ${getUnclearSentenceClass(unclearInfo.unclear_choice)}`
    : "mb-6";

  return (
    <p
      className={sentenceClass}
      title={
        unclearInfo
          ? `❓ Click to see explanation (${unclearInfo.unclear_choice || "unclear"})`
          : undefined
      }
      data-unclear-sentence={unclearInfo ? "true" : undefined}
      data-sentence-text={unclearInfo ? text : undefined}
      data-unclear-choice={unclearInfo?.unclear_choice}
    >
      {rendered}
    </p>
  );
}, arePropsEqual);

export default SentenceBlock;
```

## 3. ImageBlock

```tsx
// apps/web/src/components/content/shared/ImageBlock.tsx

import React, { useState, useRef, useEffect, memo } from "react";
import { Loader2, ZoomIn } from "lucide-react";
import type { ImageBlockProps } from "../types";

/**
 * 图片渲染组件
 *
 * 功能：
 * - 懒加载 (Intersection Observer)
 * - 点击放大
 * - 加载状态
 * - 错误处理
 */
export const ImageBlock = memo(function ImageBlock({
  src,
  alt,
  caption,
  onImageClick,
}: ImageBlockProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // 懒加载
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && imgRef.current) {
          imgRef.current.src = src;
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  if (error) return null;

  return (
    <figure className="my-8 group">
      <div
        className="relative bg-bg-elevated border border-border overflow-hidden cursor-pointer
                   hover:border-accent-primary transition-colors"
        onClick={() => onImageClick?.(src, alt, caption)}
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-surface">
            <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
          </div>
        )}
        <img
          ref={imgRef}
          alt={alt || ""}
          className={`w-full h-auto transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
        {/* Zoom icon overlay */}
        <div className="absolute bottom-2 right-2 p-2 bg-bg-base/50 text-accent-primary opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="w-4 h-4" />
        </div>
      </div>
      {caption && (
        <figcaption className="mt-2 text-sm text-text-secondary font-mono italic px-2">
          {caption}
        </figcaption>
      )}
    </figure>
  );
});

export default ImageBlock;
```

## 4. HeadingBlock

```tsx
// apps/web/src/components/content/shared/HeadingBlock.tsx

import React, { memo } from "react";
import type { HeadingBlockProps } from "../types";

/**
 * 标题渲染组件
 */

const headingStyles: Record<number, string> = {
  1: "text-3xl font-serif text-text-primary mt-10 mb-6",
  2: "text-2xl font-serif text-text-primary mt-8 mb-4",
  3: "text-xl font-serif text-text-secondary mt-6 mb-3",
  4: "text-lg font-serif text-text-secondary mt-4 mb-2",
};

export const HeadingBlock = memo(function HeadingBlock({
  text,
  level,
}: HeadingBlockProps) {
  const className = headingStyles[level] || headingStyles[2];

  // 使用对应的 HTML 标签
  const Tag =
    `h${Math.min(Math.max(level, 1), 6)}` as keyof JSX.IntrinsicElements;

  return <Tag className={className}>{text}</Tag>;
});

export default HeadingBlock;
```

## 5. Index Export

```typescript
// apps/web/src/components/content/shared/index.ts

export { SentenceBlock } from "./SentenceBlock";
export { ImageBlock } from "./ImageBlock";
export { HeadingBlock } from "./HeadingBlock";
// export { AudioSegmentBlock } from './AudioSegmentBlock'; // Phase 2
```

---

_Next: [04d-shared-hooks.md](./04d-shared-hooks.md) - 共享 Hooks 设计_
