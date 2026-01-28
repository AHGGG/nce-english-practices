import { useQuery } from "@tanstack/react-query";
import { readingApi } from "@nce/api";

export interface Article {
  id: string;
  title: string;
  book_id: string;
  book_title: string;
  chapter: string;
  sentence_count: number;
  word_count: number;
  is_read: boolean;
  read_at?: string;
  difficulty?: number;
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
      // The API returns { articles: [...] } or just [...]?
      // Let's assume the API returns { articles: [...] } based on common patterns
      // But checking reading.ts: return res.json();
      // I should check what the backend returns.
      // Based on the plan example: const articles = data.articles || [];
      return data;
    },
    select: (data) => {
      // Handle both array and object wrapper
      let articles: Article[] = Array.isArray(data)
        ? data
        : (data as any).articles || [];

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
