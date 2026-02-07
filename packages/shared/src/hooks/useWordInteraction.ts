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
      explainer.handleWordClick(cleanWord, sentence);

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
    explainer.closeInspector();
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
