/**
 * Podcast Search View - Search and subscribe to podcasts via iTunes.
 * Enhanced with PodcastLayout wrapper.
 */

import { useState, useEffect } from "react";
import type { FormEvent, MouseEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Plus, Check, Loader2, Headphones } from "lucide-react";
import * as podcastApi from "../../api/podcast";
import PodcastLayout from "../../components/podcast/PodcastLayout";
import { useToast } from "../../components/ui";

interface PodcastCategory {
  id: string;
  name: string;
}

interface PodcastSearchItem {
  itunes_id: number;
  title: string;
  author?: string;
  genre?: string;
  episode_count: number;
  rss_url?: string;
  is_subscribed?: boolean;
  artwork_url?: string;
}

interface PreviewResponse {
  feed: {
    id: number;
  };
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Unknown error";
};

export default function PodcastSearchView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<PodcastSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [subscribing, setSubscribing] = useState<Record<number, boolean>>({});
  const [subscribed, setSubscribed] = useState<Record<number, boolean>>({});
  const [categories, setCategories] = useState<PodcastCategory[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<PodcastCategory | null>(null);
  const [trending, setTrending] = useState<PodcastSearchItem[]>([]);
  const [previewing, setPreviewing] = useState<number | null>(null);
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Sync local state if URL changes externally
  useEffect(() => {
    const urlQuery = searchParams.get("q") || "";
    if (urlQuery !== query) {
      setQuery(urlQuery);
    }
  }, [searchParams]);

  // Load categories on mount
  useEffect(() => {
    podcastApi.getCategories().then(setCategories).catch(console.error);
  }, []);

  // Perform search or load trending when URL query or category changes
  useEffect(() => {
    const urlQuery = searchParams.get("q");

    if (urlQuery && urlQuery.trim()) {
      performSearch(urlQuery);
    } else {
      loadTrending();
    }
  }, [searchParams, selectedCategory]);

  async function loadTrending() {
    try {
      setLoading(true);
      const data = (await podcastApi.getTrendingPodcasts({
        category: selectedCategory?.id,
      })) as PodcastSearchItem[];
      setTrending(data);
    } catch (err: unknown) {
      console.error("Failed to load trending:", err);
    } finally {
      setLoading(false);
    }
  }

  async function performSearch(searchQuery: string) {
    try {
      setLoading(true);
      const data = (await podcastApi.searchPodcasts(searchQuery, {
        category: selectedCategory?.id,
      })) as PodcastSearchItem[];
      setResults(data);
    } catch (err: unknown) {
      console.error("Search failed:", err);
      addToast("Search failed: " + getErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      setSearchParams({ q: trimmed });
    } else {
      setSearchParams({});
    }
  }

  async function handleSubscribe(
    e: MouseEvent<HTMLButtonElement>,
    podcast: PodcastSearchItem,
  ) {
    e.stopPropagation(); // Prevent preview click
    if (!podcast.rss_url || subscribing[podcast.itunes_id]) return;

    try {
      setSubscribing((prev) => ({ ...prev, [podcast.itunes_id]: true }));
      await podcastApi.subscribeToPodcast(podcast.rss_url);
      setSubscribed((prev) => ({ ...prev, [podcast.itunes_id]: true }));
      addToast(`Subscribed to ${podcast.title}`, "success");
    } catch (err: unknown) {
      addToast("Subscribe failed: " + getErrorMessage(err), "error");
    } finally {
      setSubscribing((prev) => ({ ...prev, [podcast.itunes_id]: false }));
    }
  }

  async function handlePreview(podcast: PodcastSearchItem) {
    if (!podcast.rss_url) {
      addToast("Cannot preview this podcast (missing RSS)", "error");
      return;
    }

    try {
      setPreviewing(podcast.itunes_id);
      // Call preview API to get/create feed and get ID
      const result = (await podcastApi.previewPodcast(
        podcast.rss_url,
      )) as PreviewResponse;
      // Result is FeedDetailResponse -> feed.id
      navigate(`/podcast/feed/${result.feed.id}`);
    } catch (err: unknown) {
      console.error(err);
      addToast("Preview failed: " + getErrorMessage(err), "error");
    } finally {
      setPreviewing(null);
    }
  }

  // Determine which list to show
  const displayList = query.trim() ? results : trending;
  const isTrending = !query.trim();

  return (
    <PodcastLayout title="Search">
      <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-700">
        {/* Search form */}
        <form onSubmit={handleSearch} className="flex gap-3 relative z-10">
          <div className="relative flex-1 group">
            <div className="absolute inset-0 bg-accent-primary/20 blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 rounded-2xl pointer-events-none" />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-accent-primary transition-colors" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search podcasts..."
              className="w-full pl-12 pr-4 py-3.5 bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-2xl focus:border-accent-primary/50 focus:outline-none focus:ring-1 focus:ring-accent-primary/50 text-white placeholder:text-white/30 transition-all font-serif text-lg shadow-inner shadow-black/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-14 h-auto flex items-center justify-center bg-accent-primary text-[#0a0f0d] rounded-2xl hover:bg-white hover:shadow-[0_0_20px_rgba(var(--color-accent-primary-rgb),0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent-primary/10"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Search className="w-6 h-6" />
            )}
          </button>
        </form>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar mask-gradient-r">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                !selectedCategory
                  ? "bg-accent-primary text-[#0a0f0d] border-accent-primary shadow-[0_0_15px_rgba(var(--color-accent-primary-rgb),0.3)]"
                  : "bg-white/[0.03] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.08] hover:border-white/20"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                  selectedCategory?.id === cat.id
                    ? "bg-accent-primary text-[#0a0f0d] border-accent-primary shadow-[0_0_15px_rgba(var(--color-accent-primary-rgb),0.3)]"
                    : "bg-white/[0.03] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.08] hover:border-white/20"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Results / Trending */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-accent-primary" />
              <span className="text-xs font-mono uppercase tracking-widest text-white/40">
                Searching iTunes...
              </span>
            </div>
          ) : displayList.length > 0 ? (
            <>
              <h2 className="text-2xl font-bold font-serif text-white flex items-center gap-3 mb-6">
                <span className="w-1.5 h-8 bg-accent-primary rounded-full" />
                {isTrending
                  ? selectedCategory
                    ? `Trending in ${selectedCategory.name}`
                    : "Trending Podcasts"
                  : "Search Results"}
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {displayList.map((podcast) => (
                  <div
                    key={podcast.itunes_id}
                    onClick={() => handlePreview(podcast)}
                    className="group relative flex items-center gap-5 p-5 bg-[#0a0f0d]/40 backdrop-blur-sm border border-white/5 hover:border-accent-primary/30 rounded-2xl hover:bg-white/[0.02] transition-all cursor-pointer hover:shadow-xl hover:shadow-black/50 hover:-translate-y-0.5"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />

                    {podcast.artwork_url ? (
                      <div className="relative flex-shrink-0">
                        <div className="absolute inset-0 bg-accent-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                        <img
                          src={podcast.artwork_url}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border border-white/10 relative z-10 shadow-lg"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                        <Headphones className="w-8 h-8 text-white/20" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 z-10">
                      <h3
                        className="text-lg font-bold font-serif text-white line-clamp-1 leading-tight mb-1 group-hover:text-accent-primary transition-colors"
                        title={podcast.title}
                      >
                        {podcast.title}
                      </h3>
                      <p className="text-sm text-white/50 truncate font-mono uppercase tracking-wide">
                        {podcast.author}
                      </p>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-[10px] text-accent-primary bg-accent-primary/10 px-2 py-1 rounded border border-accent-primary/20 font-bold uppercase tracking-wider">
                          {podcast.genre}
                        </span>
                        {podcast.episode_count > 0 && (
                          <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">
                            {podcast.episode_count} Episodes
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleSubscribe(e, podcast)}
                      disabled={
                        !podcast.rss_url ||
                        subscribing[podcast.itunes_id] ||
                        subscribed[podcast.itunes_id] ||
                        podcast.is_subscribed
                      }
                      className={`relative z-10 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 border ${
                        subscribed[podcast.itunes_id] || podcast.is_subscribed
                          ? "bg-accent-success/10 text-accent-success border-accent-success/20 cursor-default"
                          : "bg-white/5 text-white border-white/10 hover:bg-accent-primary hover:text-black hover:border-accent-primary hover:shadow-lg hover:shadow-accent-primary/20"
                      } disabled:opacity-50`}
                    >
                      {subscribing[podcast.itunes_id] ||
                      previewing === podcast.itunes_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : subscribed[podcast.itunes_id] ||
                        podcast.is_subscribed ? (
                        <>
                          <Check className="w-4 h-4" />
                          Added
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Add
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            query && (
              <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl">
                <p className="text-white/40 font-mono text-sm">
                  No results found for "{query}"
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </PodcastLayout>
  );
}
