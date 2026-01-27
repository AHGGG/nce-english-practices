// apps/mobile/src/modules/study/useStudyData.ts
import { useState, useEffect } from "react";
import { authService } from "@nce/api";
import { Book, Article, ArticleDetail } from "./types";

import { ContentBlock } from "./types";

// Helper to extract flat list of sentences from blocks
export function extractSentencesFromBlocks(
  blocks: ContentBlock[] = [],
): string[] {
  const sentences: string[] = [];
  blocks.forEach((block) => {
    if (block.type === "paragraph" && block.sentences) {
      block.sentences.forEach((s) => sentences.push(s));
    }
  });
  return sentences;
}

export function useBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBooks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.authFetch("/api/reading/epub/books");
      if (!res.ok) throw new Error("Failed to fetch books");
      const data = await res.json();
      // Map EPUB structure to Book interface
      const mappedBooks = data.books.map((b: any) => ({
        code: b.filename, // Using filename as code for EPUBs
        name: b.title,
      }));
      setBooks(mappedBooks);
    } catch (e: any) {
      setError(e.message || "Failed to load books");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  return { books, isLoading, error, refetch: fetchBooks };
}

export function useArticles(bookCode: string) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchArticles = async () => {
    if (!bookCode) return;
    setIsLoading(true);
    setError(null);
    try {
      // Using list-with-status to get articles including status info
      const res = await authService.authFetch(
        `/api/reading/epub/list-with-status?filename=${encodeURIComponent(bookCode)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch articles");
      const data = await res.json();

      // Map response to Article interface
      const mappedArticles = data.articles.map((a: any) => ({
        id: a.index,
        title: a.title,
        author: "Unknown", // Metadata not available in list
        content: a.preview, // Using preview as content summary
        created_at: a.last_read || new Date().toISOString(),
        updated_at: a.last_studied_at || new Date().toISOString(),
        book_code: bookCode,
        source_id: a.source_id,
        status: a.status,
        study_progress: a.study_progress,
      }));
      setArticles(mappedArticles);
    } catch (e: any) {
      setError(e.message || "Failed to load articles");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [bookCode]);

  return { articles, isLoading, error, refetch: fetchArticles };
}

export function useArticleDetail(sourceId: string | undefined) {
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchArticle = async () => {
    if (!sourceId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.authFetch(
        `/api/reading/article?source_id=${encodeURIComponent(sourceId)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch article details");
      const data = await res.json();
      setArticle(data);
    } catch (e: any) {
      setError(e.message || "Failed to load article");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArticle();
  }, [sourceId]);

  return { article, isLoading, error, refetch: fetchArticle };
}
