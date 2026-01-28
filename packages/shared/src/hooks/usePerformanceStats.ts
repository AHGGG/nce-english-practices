import { useQuery } from "@tanstack/react-query";
import { authService } from "@nce/api";

export interface PerformanceData {
  study_time: {
    total_minutes: number;
    daily_avg: number;
    history: Record<string, number>;
  };
  reading_stats: {
    total_words: number;
    articles_count: number;
  };
  memory_curve: {
    actual: { day: number; retention: number | null }[];
    ebbinghaus: { day: number; retention: number }[];
    total_words_analyzed: number;
  };
}

export interface ProfileData {
  total_sentences_studied: number;
  clear_count: number;
  unclear_count: number;
  clear_rate: number;
  vocab_gap_count: number;
  grammar_gap_count: number;
  meaning_gap_count: number;
  collocation_gap_count: number;
  recommendation: string;
  insights: string[];
  words_to_review: Array<{
    word: string;
    difficulty_score: number;
    exposure_count: number;
  }>;
}

export function usePerformanceStats(days: number = 30) {
  const query = useQuery({
    queryKey: ["performance", days],
    queryFn: async () => {
      const [perfRes, profileRes] = await Promise.all([
        authService.authFetch(`/api/performance?days=${days}`),
        authService.authFetch("/api/sentence-study/profile"),
      ]);

      if (!perfRes.ok) throw new Error("Failed to fetch performance stats");
      // Profile might fail if not initialized, handle gracefully
      const profile = profileRes.ok ? await profileRes.json() : null;
      const stats = await perfRes.json();

      return {
        stats: stats as PerformanceData,
        profile: profile as ProfileData,
      };
    },
  });

  return {
    stats: query.data?.stats,
    profile: query.data?.profile,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
}

// Utils
export const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
};

export const formatWordCount = (count: number) => {
  if (count < 1000) return count.toString();
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  return `${Math.round(count / 1000)}k`;
};
