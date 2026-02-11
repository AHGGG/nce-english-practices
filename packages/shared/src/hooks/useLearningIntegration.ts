import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { proficiencyApi, reviewApi } from "@nce/api";

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
      // @ts-ignore
      await proficiencyApi.updateWordStatus(word, "mastered");
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
      // @ts-ignore
      await proficiencyApi.updateProficiency(word, correct);
    },
  });

  // 批量标记已知
  const sweepMutation = useMutation({
    mutationFn: async (words: string[]) => {
      await proficiencyApi.sweep(words, []);
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
