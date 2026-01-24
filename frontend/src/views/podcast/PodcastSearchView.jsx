/**
 * Podcast Search View - Search and subscribe to podcasts via iTunes.
 * Enhanced with PodcastLayout wrapper.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Check, Loader2, Headphones, Info } from 'lucide-react';
import * as podcastApi from '../../api/podcast';
import PodcastLayout from '../../components/podcast/PodcastLayout';
import { useToast } from '../../components/ui';

export default function PodcastSearchView() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [subscribing, setSubscribing] = useState({});
    const [subscribed, setSubscribed] = useState({}); // Local override for search results
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [trending, setTrending] = useState([]);
    const [previewing, setPreviewing] = useState(null); // iTunes ID of podcast being previewed
    const { addToast } = useToast();
    const navigate = useNavigate();

    // Load categories and trending on mount
    useEffect(() => {
        podcastApi.getCategories().then(setCategories).catch(console.error);
        loadTrending();
    }, []);

    // Reload trending when category changes
    useEffect(() => {
        loadTrending();
    }, [selectedCategory]);

    async function loadTrending() {
        try {
            setLoading(true);
            const data = await podcastApi.getTrendingPodcasts({ 
                category: selectedCategory?.id 
            });
            setTrending(data);
        } catch (err) {
            console.error('Failed to load trending:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSearch(e) {
        e.preventDefault();
        // If query is empty, just load trending (already done via effect if we clear query)
        if (!query.trim()) {
            loadTrending();
            return;
        }

        try {
            setLoading(true);
            const data = await podcastApi.searchPodcasts(query, {
                category: selectedCategory?.id
            });
            setResults(data);
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubscribe(e, podcast) {
        e.stopPropagation(); // Prevent preview click
        if (!podcast.rss_url || subscribing[podcast.itunes_id]) return;

        try {
            setSubscribing(prev => ({ ...prev, [podcast.itunes_id]: true }));
            await podcastApi.subscribeToPodcast(podcast.rss_url);
            setSubscribed(prev => ({ ...prev, [podcast.itunes_id]: true }));
            addToast(`Subscribed to ${podcast.title}`, 'success');
        } catch (err) {
            addToast('Subscribe failed: ' + err.message, 'error');
        } finally {
            setSubscribing(prev => ({ ...prev, [podcast.itunes_id]: false }));
        }
    }

    async function handlePreview(podcast) {
        if (!podcast.rss_url) {
            addToast('Cannot preview this podcast (missing RSS)', 'error');
            return;
        }
        
        try {
            setPreviewing(podcast.itunes_id);
            // Call preview API to get/create feed and get ID
            const result = await podcastApi.previewPodcast(podcast.rss_url);
            // Result is FeedDetailResponse -> feed.id
            navigate(`/podcast/feed/${result.feed.id}`);
        } catch (err) {
            console.error(err);
            addToast('Preview failed: ' + err.message, 'error');
        } finally {
            setPreviewing(null);
        }
    }

    // Determine which list to show
    const displayList = query.trim() ? results : trending;
    const isTrending = !query.trim();

    return (
        <PodcastLayout title="Search">
            <div className="space-y-6">
                {/* Search form */}
                <form onSubmit={handleSearch} className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search podcasts on iTunes..."
                            className="w-full pl-12 pr-4 py-4 bg-bg-surface border border-border rounded-xl focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-text-primary placeholder:text-text-muted transition-all"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-4 bg-gradient-to-r from-accent-primary to-accent-secondary text-black font-medium rounded-xl hover:shadow-lg hover:shadow-accent-primary/20 transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
                    </button>
                </form>

                {/* Categories */}
                {categories.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                !selectedCategory
                                    ? 'bg-accent-primary text-black'
                                    : 'bg-bg-surface border border-border text-text-muted hover:text-text-primary hover:border-text-primary/30'
                            }`}
                        >
                            All
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                    selectedCategory?.id === cat.id
                                        ? 'bg-accent-primary text-black'
                                        : 'bg-bg-surface border border-border text-text-muted hover:text-text-primary hover:border-text-primary/30'
                                }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Results / Trending */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="py-12 text-center">
                            <Loader2 className="w-8 h-8 animate-spin text-accent-primary mx-auto" />
                        </div>
                    ) : displayList.length > 0 ? (
                        <>
                            <h2 className="text-lg font-bold font-serif text-text-primary">
                                {isTrending ? (selectedCategory ? `Trending in ${selectedCategory.name}` : 'Trending Podcasts') : 'Search Results'}
                            </h2>
                            {displayList.map((podcast) => (
                                <div
                                    key={podcast.itunes_id}
                                    onClick={() => handlePreview(podcast)}
                                    className="group flex items-center gap-4 p-4 bg-bg-surface border border-border rounded-xl hover:border-accent-primary/30 transition-colors cursor-pointer"
                                >
                                    {podcast.artwork_url ? (
                                        <img
                                            src={podcast.artwork_url}
                                            alt=""
                                            className="w-20 h-20 rounded-lg object-cover flex-shrink-0 border border-border"
                                        />
                                    ) : (
                                        <div className="w-20 h-20 rounded-lg bg-bg-elevated flex items-center justify-center flex-shrink-0 border border-border">
                                            <Headphones className="w-8 h-8 text-text-muted" />
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-text-primary truncate group-hover:text-accent-primary transition-colors">
                                            {podcast.title}
                                        </h3>
                                        <p className="text-sm text-text-muted truncate">
                                            {podcast.author}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs text-accent-primary/70 font-mono">
                                                {podcast.genre}
                                            </span>
                                            {podcast.episode_count > 0 && (
                                                <span className="text-xs text-text-muted">
                                                    {podcast.episode_count} eps
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => handleSubscribe(e, podcast)}
                                        disabled={!podcast.rss_url || subscribing[podcast.itunes_id] || subscribed[podcast.itunes_id] || podcast.is_subscribed}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
                                            subscribed[podcast.itunes_id] || podcast.is_subscribed
                                            ? 'bg-accent-success/20 text-accent-success border border-accent-success/30 cursor-default'
                                            : 'bg-gradient-to-r from-accent-primary to-accent-secondary text-black hover:shadow-lg hover:shadow-accent-primary/20'
                                        } disabled:opacity-50`}
                                    >
                                        {subscribing[podcast.itunes_id] || previewing === podcast.itunes_id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : subscribed[podcast.itunes_id] || podcast.is_subscribed ? (
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
                        </>
                    ) : (
                        query && (
                            <div className="text-center py-12">
                                <p className="text-text-muted">No results found for "{query}"</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </PodcastLayout>
    );
}
