import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  podcastApi,
  ItunesSearchResult,
  PodcastFeed,
  FeedDetailResponse,
  apiPost,
} from "@nce/api";

export interface UsePodcastSearchOptions {
  limit?: number;
}

export function usePodcastSearch(
  query: string,
  options: UsePodcastSearchOptions = {},
) {
  const q = useQuery({
    queryKey: ["podcast", "search", query],
    queryFn: () => podcastApi.search(query, options.limit),
    enabled: !!query,
  });

  return {
    results: q.data || [],
    isLoading: q.isLoading,
    error: q.error ? (q.error as Error).message : null,
  };
}

export function useTrendingPodcasts(limit = 10) {
  const q = useQuery({
    queryKey: ["podcast", "trending", limit],
    queryFn: () => podcastApi.getTrending(limit),
  });

  return {
    trending: q.data || [],
    isLoading: q.isLoading,
    error: q.error ? (q.error as Error).message : null,
  };
}

export function useSubscriptions() {
  const q = useQuery({
    queryKey: ["podcast", "subscriptions"],
    queryFn: () => podcastApi.getSubscriptions(),
  });

  return {
    feeds: q.data || [],
    isLoading: q.isLoading,
    error: q.error ? (q.error as Error).message : null,
    refetch: q.refetch,
  };
}

export function usePodcastFeed(feedId: number, limit = 20) {
  const q = useQuery({
    queryKey: ["podcast", "feed", feedId],
    queryFn: () => podcastApi.getFeed(feedId, limit),
    enabled: !!feedId,
  });

  return {
    data: q.data,
    isLoading: q.isLoading,
    error: q.error ? (q.error as Error).message : null,
    refetch: q.refetch,
  };
}

export function usePodcastPreview(rssUrl: string) {
  const q = useQuery({
    queryKey: ["podcast", "preview", rssUrl],
    queryFn: () => apiPost("/api/podcast/preview", { rss_url: rssUrl }),
    enabled: !!rssUrl,
  });

  return {
    data: q.data,
    isLoading: q.isLoading,
    error: q.error ? (q.error as Error).message : null,
  };
}

export function usePodcastMutations() {
  const queryClient = useQueryClient();

  const subscribeMutation = useMutation({
    mutationFn: (rssUrl: string) => podcastApi.subscribe(rssUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["podcast", "subscriptions"] });
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: (feedId: number) => podcastApi.unsubscribe(feedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["podcast", "subscriptions"] });
    },
  });

  return {
    subscribe: subscribeMutation.mutateAsync,
    unsubscribe: unsubscribeMutation.mutateAsync,
    isSubscribing: subscribeMutation.isPending,
  };
}
