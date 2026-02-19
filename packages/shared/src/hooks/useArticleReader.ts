import { useQuery } from "@tanstack/react-query";
import { readingApi } from "@nce/api";
import { useReadingTracker } from "./useReadingTracker";
import { useState, useMemo } from "react";
import { normalizeStudyHighlights } from "../utils/collocationHighlight";

// Types (Mirrored from Mobile/Web)
export interface ContentBlock {
  type: "paragraph" | "heading" | "image" | "subtitle";
  text?: string;
  sentences?: string[];
  level?: number;
  image_path?: string;
  alt?: string;
  caption?: string;
}

export interface ArticleDetail {
  id: number;
  title: string;
  author: string;
  content: string;
  created_at: string;
  updated_at: string;
  book_code: string;
  source_id: string;
  status: "new" | "in_progress" | "completed" | "read";
  blocks: ContentBlock[];
  sentence_count: number;
  word_count: number;
  highlightSet?: Record<string, number>;
  studyHighlightSet?: Record<string, boolean>;
  studyWordSet?: Set<string>;
  studyPhraseSet?: Set<string>;
  highlights?: string[];
  study_highlights?: string[];
  unclearSentenceMap?: Record<number, any>;
  metadata: {
    filename: string;
    [key: string]: any;
  };
}

export function useArticleReader(articleId: string) {
  // 1. Fetch Article Data
  const query = useQuery({
    queryKey: ["article", articleId],
    queryFn: async () => {
      const raw = (await readingApi.getArticleDetail(articleId)) as Record<
        string,
        any
      >;

      const normalized = { ...raw } as ArticleDetail;

      // Normalize study highlights from backend payload (legacy: study_highlights[]).
      const studyHighlightsSource =
        raw.studyHighlightSet || raw.study_highlights || [];
      const { studyHighlightMap, studyWordSet, studyPhraseSet } =
        normalizeStudyHighlights(studyHighlightsSource);

      normalized.studyHighlightSet = studyHighlightMap;
      normalized.studyWordSet = studyWordSet;
      normalized.studyPhraseSet = studyPhraseSet;

      // Normalize vocabulary highlight map if backend returns a plain string list.
      if (!raw.highlightSet && Array.isArray(raw.highlights)) {
        const fallbackMap: Record<string, number> = {};
        raw.highlights.forEach((word: unknown) => {
          if (typeof word === "string") {
            const key = word.toLowerCase().trim();
            if (key) fallbackMap[key] = 1;
          }
        });
        normalized.highlightSet = fallbackMap;
      }

      return normalized;
    },
    enabled: !!articleId,
  });

  const article = query.data;

  // 2. Prepare Sentences for Tracker
  const sentences = useMemo(() => {
    if (!article?.blocks) return [];
    const s: string[] = [];
    article.blocks.forEach((block) => {
      if (block.type === "paragraph" && block.sentences) {
        s.push(...block.sentences);
      }
    });
    return s;
  }, [article]);

  // 3. Initialize Tracker
  const tracker = useReadingTracker({
    articleId: article?.source_id || "",
    articleTitle: article?.title || "",
    sentences,
    sourceType: "epub", // Assuming EPUB for now
  });

  return {
    article,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
    tracker,
  };
}
