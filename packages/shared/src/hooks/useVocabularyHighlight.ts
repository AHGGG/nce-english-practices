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
