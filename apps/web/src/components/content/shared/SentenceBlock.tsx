import React, { memo, useMemo } from "react";
import type { SentenceBlockProps, Collocation } from "../types";

interface RenderCollocation extends Collocation {
  isStudiedPhrase: boolean;
}

const normalizePhrase = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[^a-zA-Z']+|[^a-zA-Z']+$/g, "");

const tokenizePhrase = (text: string): string[] => {
  const matches = text.toLowerCase().match(/[a-zA-Z'-]+/g);
  return matches || [];
};

const areTokenArraysEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const isContiguousSubsequence = (small: string[], large: string[]): boolean => {
  if (!small.length || small.length > large.length) return false;
  for (let i = 0; i <= large.length - small.length; i++) {
    let matched = true;
    for (let j = 0; j < small.length; j++) {
      if (large[i + j] !== small[j]) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }
  return false;
};

/**
 * 句子渲染组件
 *
 * 功能：
 * - 词汇高亮 (COCA/CET)
 * - 学习高亮 (查过的词 - amber underline, 查过的短语 - amber background)
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
  if (!areSetsEqual(prev.studyWordSet, next.studyWordSet)) return false;
  if (!areSetsEqual(prev.studyPhraseSet, next.studyPhraseSet)) return false;
  if (!areSetsEqual(prev.knownWords, next.knownWords)) return false;
  if (prev.collocations !== next.collocations) return false;
  if (prev.unclearInfo !== next.unclearInfo) return false;
  return true;
};

export const SentenceBlock = memo(function SentenceBlock({
  text,
  highlightSet,
  studyWordSet = new Set(),
  studyPhraseSet = new Set(),
  knownWords = new Set(),
  showHighlights = true,
  collocations = [],
  unclearInfo,
}: SentenceBlockProps) {
  if (!text) return null;

  const studiedPhraseMeta = useMemo(
    () =>
      Array.from(studyPhraseSet || [])
        .map((phrase) => ({
          normalized: normalizePhrase(phrase),
          tokens: tokenizePhrase(phrase),
        }))
        .filter((item) => item.tokens.length > 1),
    [studyPhraseSet],
  );

  const isStudiedCollocation = (collocationText: string): boolean => {
    if (!showHighlights || !studiedPhraseMeta.length) return false;

    const normalized = normalizePhrase(collocationText);
    const tokens = tokenizePhrase(collocationText);
    if (!normalized || tokens.length < 2) return false;

    for (const studied of studiedPhraseMeta) {
      if (studied.normalized === normalized) return true;
      if (areTokenArraysEqual(studied.tokens, tokens)) return true;
      if (isContiguousSubsequence(tokens, studied.tokens)) return true;
      if (isContiguousSubsequence(studied.tokens, tokens)) return true;
    }

    return false;
  };

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
    const result: RenderCollocation[] = [];

    const sorted = (collocations || [])
      .map((coll) => ({
        ...coll,
        isStudiedPhrase: isStudiedCollocation(coll.text),
      }))
      .sort((a, b) => {
        if (a.isStudiedPhrase !== b.isStudiedPhrase) {
          return a.isStudiedPhrase ? -1 : 1;
        }

        const aLen = a.end_word_idx - a.start_word_idx;
        const bLen = b.end_word_idx - b.start_word_idx;
        if (aLen !== bLen) return bLen - aLen;

        const aConfidence = a.confidence ?? 0;
        const bConfidence = b.confidence ?? 0;
        if (aConfidence !== bConfidence) return bConfidence - aConfidence;

        return a.start_word_idx - b.start_word_idx;
      });

    for (const coll of sorted) {
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
  }, [collocations, showHighlights, studiedPhraseMeta]);

  // 构建词汇到搭配的映射
  const wordToCollocation = useMemo(() => {
    const map: Record<number, RenderCollocation> = {};
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
        const isStudiedPhrase = showHighlights && collocInfo.isStudiedPhrase;

        // Studied phrases keep amber background and also preserve detected-collocation dashed cue.
        const phraseClassName = isStudiedPhrase
          ? "reading-word cursor-pointer px-1 py-0.5 rounded text-category-amber bg-category-amber/15 border border-category-amber/50 border-b-2 border-dashed border-neon-gold"
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
                ? `📚 Studying + detected collocation: ${collocInfo.text}`
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
        const isStudyWordHighlighted =
          !isKnown && showHighlights && studyWordSet?.has(clean);

        // Priority: Study word (amber underline) > Vocab highlight (green) > Normal
        let className = "reading-word cursor-pointer px-0.5 ";
        if (isStudyWordHighlighted) {
          // Amber underline for single words looked up during Sentence Study
          className += "text-category-amber border-b-2 border-category-amber";
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
              isStudyWordHighlighted
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
    studyWordSet,
    studyPhraseSet,
    knownWords,
    text,
  ]);

  // 句子容器样式
  const sentenceClass = unclearInfo
    ? `mb-6 cursor-pointer hover:bg-opacity-20 break-words [overflow-wrap:anywhere] ${getUnclearSentenceClass(unclearInfo.unclear_choice)}`
    : "mb-6 break-words [overflow-wrap:anywhere]";

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
