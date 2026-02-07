// apps/web/src/components/content/renderers/TextContentRenderer.tsx

import React, { useRef, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import type {
  ContentRenderer,
  ContentRendererProps,
  ContentBundle,
} from "../types";
import { SentenceBlock, ImageBlock, HeadingBlock } from "../shared";

const BATCH_SIZE = 20;

/**
 * 文本内容渲染器
 *
 * 支持类型: epub, rss, plain_text
 *
 * 功能:
 * - Block-based 渲染 (heading, paragraph, image, subtitle)
 * - 渐进加载
 * - 词汇高亮
 * - 事件委托
 */
export class TextContentRenderer implements ContentRenderer {
  readonly name = "TextContentRenderer";

  canRender(bundle: ContentBundle): boolean {
    // 兼容处理：有些旧数据可能没有 blocks，但有 sentences
    // 或者 source_type 可能是 'epub:TheEconomist...' 这种复合格式
    const type = bundle.source_type?.split(":")[0] || "plain_text";
    return ["epub", "rss", "plain_text"].includes(type);
  }

  render(props: ContentRendererProps): React.ReactNode {
    return <TextContentRendererComponent {...props} />;
  }
}

// 内部组件
function TextContentRendererComponent({
  bundle,
  highlightSet,
  studyHighlightSet,
  knownWords,
  showHighlights = true,
  collocations = [],
  unclearSentenceMap = {},
  onWordClick,
  onSentenceClick,
  onImageClick,
  tracker,
  visibleCount: initialVisibleCount,
  metadata,
}: ContentRendererProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = React.useState(
    initialVisibleCount || BATCH_SIZE,
  );

  // 计算总内容数
  const totalContentCount = React.useMemo(() => {
    // 如果有 structured blocks
    if (bundle.blocks && bundle.blocks.length > 0) {
      return bundle.blocks.reduce((acc, block) => {
        if (block.type === "paragraph") {
          return acc + (block.sentences?.length || 0);
        }
        return acc + 1;
      }, 0);
    }
    // 回退：如果只有 sentences（旧 API）
    // @ts-ignore
    return bundle.sentences?.length || 0;
  }, [bundle.blocks, bundle]);

  // 渐进加载
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(prev + BATCH_SIZE, totalContentCount),
          );
        }
      },
      { rootMargin: "200px" },
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [totalContentCount]);

  // 句子可见性追踪
  useEffect(() => {
    if (!tracker) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = (entry.target as HTMLElement).dataset.sentenceIdx;
            if (idx) {
              tracker.onSentenceView(parseInt(idx, 10));
            }
          }
        });
      },
      { rootMargin: "0px", threshold: 0.5 },
    );

    const sentenceEls = document.querySelectorAll("[data-sentence-idx]");
    sentenceEls.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [totalContentCount, visibleCount, tracker]);

  // 事件委托处理点击
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;

      // 检查不清楚句子点击
      let el: HTMLElement | null = target;
      while (el && el !== e.currentTarget) {
        if (el.dataset?.unclearSentence === "true") {
          if (!target.dataset?.word) {
            const sentenceText = el.dataset.sentenceText;
            const unclearChoice = el.dataset.unclearChoice;
            if (sentenceText && onSentenceClick) {
              onSentenceClick(sentenceText, { unclear_choice: unclearChoice });
            }
            return;
          }
          break;
        }
        el = el.parentElement;
      }

      // 词汇点击
      const word = target.dataset?.word;
      const sentence = target.dataset?.sentence;

      if (!word) return;

      const cleanWord = word.toLowerCase();
      if (cleanWord.length < 2) return;

      onWordClick?.(cleanWord, sentence || "");
      tracker?.onWordClick();
    },
    [onWordClick, onSentenceClick, tracker],
  );

  // 构建图片 URL
  const buildImageUrl = useCallback(
    (imagePath: string) => {
      const filename = metadata?.filename || "";
      return `/api/reading/epub/image?filename=${encodeURIComponent(filename)}&image_path=${encodeURIComponent(imagePath)}`;
    },
    [metadata],
  );

  // 渲染内容
  const renderBlocks = () => {
    // 1. 优先使用 Structured Blocks
    if (bundle.blocks && bundle.blocks.length > 0) {
      let globalSentenceIndex = 0;

      return bundle.blocks.map((block, blockIdx) => {
        switch (block.type) {
          case "heading":
            return (
              <HeadingBlock
                key={`h-${blockIdx}`}
                text={block.text || ""}
                level={block.level || 2}
              />
            );

          case "image":
            return (
              <ImageBlock
                key={`i-${blockIdx}`}
                src={buildImageUrl(block.image_path || "")}
                alt={block.alt}
                caption={block.caption}
                onImageClick={onImageClick}
              />
            );

          case "paragraph": {
            const startIdx = globalSentenceIndex;
            globalSentenceIndex += block.sentences?.length || 0;

            return (
              <div key={`p-${blockIdx}`} className="mb-4">
                {block.sentences?.map((sentence, sentIdx) => {
                  const globalIdx = startIdx + sentIdx;
                  return (
                    <span key={`s-${globalIdx}`} data-sentence-idx={globalIdx}>
                      <SentenceBlock
                        text={sentence}
                        highlightSet={highlightSet}
                        studyHighlightSet={studyHighlightSet}
                        knownWords={knownWords}
                        showHighlights={showHighlights}
                        collocations={collocations.filter(
                          (c) => c.start_word_idx >= 0, // TODO: 按句子过滤
                        )}
                        unclearInfo={unclearSentenceMap[globalIdx]}
                      />{" "}
                    </span>
                  );
                })}
              </div>
            );
          }

          case "subtitle":
            return (
              <div
                key={`sub-${blockIdx}`}
                className="text-lg italic text-text-secondary mb-4 font-serif"
              >
                {block.text}
              </div>
            );

          default:
            return null;
        }
      });
    }

    // 2. 兼容旧 API (只有 sentences 数组)
    // @ts-ignore
    if (bundle.sentences && bundle.sentences.length > 0) {
      // @ts-ignore
      return (
        <div className="mb-4">
          {/* @ts-ignore */}
          {bundle.sentences.map((sentenceObj, sentIdx) => {
            const text =
              typeof sentenceObj === "string" ? sentenceObj : sentenceObj.text;
            return (
              <span key={`s-${sentIdx}`} data-sentence-idx={sentIdx}>
                <SentenceBlock
                  text={text}
                  highlightSet={highlightSet}
                  studyHighlightSet={studyHighlightSet}
                  knownWords={knownWords}
                  showHighlights={showHighlights}
                  collocations={collocations}
                  unclearInfo={unclearSentenceMap[sentIdx]}
                />{" "}
              </span>
            );
          })}
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className="prose prose-invert prose-lg max-w-none font-serif md:text-xl leading-loose text-text-primary"
      style={{ contain: "content" }}
      onClick={handleClick}
    >
      {renderBlocks()}

      {/* 渐进加载 sentinel */}
      {visibleCount < totalContentCount && (
        <div
          ref={sentinelRef}
          className="flex justify-center py-4 text-text-muted"
        >
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="ml-2 text-xs font-mono">Loading more...</span>
        </div>
      )}
    </div>
  );
}

export default TextContentRenderer;
