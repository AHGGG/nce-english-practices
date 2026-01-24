/**
 * Podcast Search View - Search and subscribe to podcasts via iTunes.
 * Enhanced with PodcastLayout wrapper.
 */

import { useState } from 'react';
import { Search, Plus, Check, Loader2, Headphones, Info } from 'lucide-react';
import * as podcastApi from '../../api/podcast';
import PodcastLayout from '../../components/podcast/PodcastLayout';
import { useToast } from '../../components/ui';

export default function PodcastSearchView() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [subscribing, setSubscribing] = useState({});
    const [subscribed, setSubscribed] = useState({});
    const { addToast } = useToast();

    async function handleSearch(e) {
        e.preventDefault();
        if (!query.trim()) return;

        try {
            setLoading(true);
            const data = await podcastApi.searchPodcasts(query);
            setResults(data);
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubscribe(podcast) {
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

                {/* Results */}
                {results.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-sm text-text-muted">{results.length} results</p>

                        {results.map((podcast) => (
                            <div
                                key={podcast.itunes_id}
                                className="flex items-center gap-4 p-4 bg-bg-surface border border-border rounded-xl hover:border-accent-primary/30 transition-colors"
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
                                    <h3 className="font-medium text-text-primary truncate">
                                        {podcast.title}
                                    </h3>
                                    <p className="text-sm text-text-muted truncate">
                                        {podcast.author}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs text-accent-primary/70 font-mono">
                                            {podcast.genre}
                                        </span>
                                        <span
                                            className="flex items-center gap-1 text-xs text-text-muted group/eps cursor-help"
                                            title="This is the iTunes total count. RSS feeds often only provide recent episodes."
                                        >
                                            {podcast.episode_count || 0} episodes
                                            <Info className="w-3 h-3 opacity-0 group-hover/eps:opacity-60 transition-opacity" />
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleSubscribe(podcast)}
                                    disabled={!podcast.rss_url || subscribing[podcast.itunes_id] || subscribed[podcast.itunes_id]}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${subscribed[podcast.itunes_id]
                                        ? 'bg-accent-success/20 text-accent-success border border-accent-success/30'
                                        : 'bg-gradient-to-r from-accent-primary to-accent-secondary text-black hover:shadow-lg hover:shadow-accent-primary/20'
                                        } disabled:opacity-50`}
                                >
                                    {subscribing[podcast.itunes_id] ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : subscribed[podcast.itunes_id] ? (
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
                )}

                {/* Empty state */}
                {results.length === 0 && query && !loading && (
                    <div className="text-center py-12">
                        <p className="text-text-muted">No results found for "{query}"</p>
                    </div>
                )}

                {/* Initial state */}
                {results.length === 0 && !query && !loading && (
                    <div className="text-center py-16 space-y-4">
                        <div className="inline-flex p-6 bg-gradient-to-br from-accent-primary/10 to-accent-secondary/10 rounded-2xl">
                            <Search className="w-12 h-12 text-accent-primary" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-medium text-text-primary">Find podcasts</h3>
                            <p className="text-text-muted max-w-sm mx-auto">
                                Search for podcasts by name, topic, or host
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </PodcastLayout>
    );
}
