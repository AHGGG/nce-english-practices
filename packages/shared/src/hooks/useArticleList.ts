import { useQuery } from "@tanstack/react-query";
import { readingApi } from "@nce/api";

export interface Article {
  id?: string;
  source_id: string;
  title: string;
  book_id?: string;
  book_title?: string;
  chapter?: string;
  index?: number;
  sentence_count: number;
  word_count?: number;
  is_read?: boolean;
  read_at?: string;
  difficulty?: number;
  status?: string; // "new", "read", "in_progress", "completed"
}

export interface UseArticleListOptions {
  bookId?: string;
  searchQuery?: string;
}

export function useArticleList(options: UseArticleListOptions = {}) {
  const query = useQuery({
    queryKey: ["articles", options.bookId, options.searchQuery],
    queryFn: async () => {
      const data = await readingApi.getArticlesWithStatus();
      return data;
    },
    select: (data) => {
      // Handle both array and object wrapper
      let articles: Article[] = Array.isArray(data)
        ? data
        : (data as any).articles || [];

      const filename = (data as any).filename;
      if (filename) {
        // Format filename as title: TheEconomist.2025.12.27.epub -> The Economist 2025.12.27
        const formattedTitle = filename
          .replace(/\.epub$/i, "")
          .replace(/[._-]/g, " ");

        articles = articles.map((a) => ({
          ...a,
          book_title: a.book_title || formattedTitle,
          is_read: a.status === "read" || a.status === "completed",
          word_count: a.word_count || a.sentence_count * 15, // Estimate if missing
        }));
      }

      if (options.bookId) {
        articles = articles.filter((a) => a.book_id === options.bookId);
      }

      if (options.searchQuery) {
        const q = options.searchQuery.toLowerCase();
        articles = articles.filter((a) => a.title.toLowerCase().includes(q));
      }

      return articles;
    },
  });

  return {
    articles: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}
