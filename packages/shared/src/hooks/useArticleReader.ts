import { useQuery } from "@tanstack/react-query";
import { readingApi } from "@nce/api";
import { useReadingTracker } from "./useReadingTracker";
import { useState, useMemo } from "react";

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
      const data = await readingApi.getArticleDetail(articleId);
      return data as ArticleDetail;
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
