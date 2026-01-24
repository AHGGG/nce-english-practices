/**
 * Podcast Library View - Shows subscribed podcasts with enhanced styling.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, RefreshCw, Upload, Download, Headphones, Loader2, Rss } from 'lucide-react';
import * as podcastApi from '../../api/podcast';
import PodcastLayout from '../../components/podcast/PodcastLayout';
import RecentlyPlayed from '../../components/podcast/RecentlyPlayed';
import { useToast } from '../../components/ui';

export default function PodcastLibraryView() {
    const navigate = useNavigate();
    const [feeds, setFeeds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Import progress state
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0, title: '' });

    const { addToast } = useToast();

    useEffect(() => {
        loadFeeds();
    }, []);

    async function loadFeeds() {
        try {
            setLoading(true);
            const data = await podcastApi.getSubscriptions();
            setFeeds(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleImportOPML(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset file input
        e.target.value = '';

        try {
            setImporting(true);
            setImportProgress({ current: 0, total: 0, title: 'Parsing OPML...' });

            const result = await podcastApi.importOPMLStreaming(file, (event) => {
                switch (event.type) {
                    case 'start':
                        setImportProgress({ current: 0, total: event.total, title: 'Starting import...' });
                        break;
                    case 'progress':
                        setImportProgress({ current: event.current, total: event.total, title: event.title });
                        break;
                    case 'complete':
                        setImportProgress({ current: event.total, total: event.total, title: 'Complete!' });
                        break;
                }
            });

            // Show detailed status
            const statusType = result.failed > 0 ? 'warning' : 'success';
            addToast(`Import Complete: ${result.imported} imported, ${result.skipped} skipped, ${result.failed} failed (Total: ${result.total})`, statusType);
            
            loadFeeds();
        } catch (err) {
            addToast('Import failed: ' + err.message, 'error');
        } finally {
            setImporting(false);
        }
    }

    async function handleExportOPML() {
        try {
            const blob = await podcastApi.exportOPML();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'podcasts.opml';
            a.click();
            URL.revokeObjectURL(url);
            addToast('OPML export started', 'info');
        } catch (err) {
            addToast('Export failed: ' + err.message, 'error');
        }
    }

    return (
        <PodcastLayout title="My Library">
            {/* Import Progress Overlay */}
            {importing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-bg-surface border border-border rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
                                <h3 className="text-lg font-medium text-text-primary">Importing Podcasts</h3>
                            </div>

                            {importProgress.total > 0 && (
                                <>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-text-muted">Progress</span>
                                            <span className="text-accent-primary font-mono">
                                                {importProgress.current} / {importProgress.total}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-300"
                                                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    <p className="text-sm text-text-muted truncate" title={importProgress.title}>
                                        {importProgress.title}
                                    </p>
                                </>
                            )}

                            {importProgress.total === 0 && (
                                <p className="text-sm text-text-muted">{importProgress.title || 'Parsing OPML file...'}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Action bar */}
                    <div className="flex items-center justify-between">
                        <p className="text-text-muted text-sm">
                            {feeds.length} subscriptions
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={loadFeeds}
                                className="p-2 text-text-muted hover:text-accent-primary transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>

                            <label className="p-2 text-text-muted hover:text-accent-primary transition-colors cursor-pointer" title="Import OPML">
                                <Upload className="w-4 h-4" />
                                <input
                                    type="file"
                                    accept=".opml,.xml"
                                    onChange={handleImportOPML}
                                    className="hidden"
                                />
                            </label>

                            <button
                                onClick={handleExportOPML}
                                className="p-2 text-text-muted hover:text-accent-primary transition-colors"
                                title="Export OPML"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Empty state */}
                    {feeds.length === 0 && !error && (
                        <div className="text-center py-16 space-y-6">
                            <div className="inline-flex p-6 bg-gradient-to-br from-accent-primary/10 to-accent-secondary/10 rounded-2xl">
                                <Rss className="w-16 h-16 text-accent-primary" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-medium text-text-primary">No podcasts yet</h3>
                                <p className="text-text-muted max-w-sm mx-auto">
                                    Search for your favorite podcasts or import your existing subscriptions via OPML.
                                </p>
                            </div>
                            <button
                                onClick={() => navigate('/podcast/search')}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-accent-primary to-accent-secondary text-black font-medium rounded-lg hover:shadow-lg hover:shadow-accent-primary/20 transition-all"
                            >
                                <Plus className="w-5 h-5" />
                                Find Podcasts
                            </button>
                        </div>
                    )}

                    {/* Recently Played */}
                    {feeds.length > 0 && <RecentlyPlayed />}

                    {/* Grid of podcasts */}
                    {feeds.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {feeds.map((feed) => (
                                <Link
                                    key={feed.id}
                                    to={`/podcast/feed/${feed.id}`}
                                    className="group block bg-bg-surface border border-border hover:border-accent-primary/50 transition-all rounded-xl overflow-hidden hover:shadow-lg hover:shadow-accent-primary/5"
                                >
                                    <div className="aspect-square relative">
                                        {feed.image_url ? (
                                            <img
                                                src={feed.image_url}
                                                alt={feed.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-bg-elevated to-bg-base flex items-center justify-center">
                                                <Headphones className="w-12 h-12 text-text-muted" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-xs text-white/80 font-mono">PLAY_FEED &gt;&gt;</span>
                                        </div>
                                    </div>

                                    <div className="p-3">
                                        <h3 className="font-medium text-text-primary truncate group-hover:text-accent-primary transition-colors">
                                            {feed.title}
                                        </h3>
                                        <p className="text-xs text-text-muted truncate">
                                            {feed.author || 'Unknown'}
                                        </p>
                                        {feed.episode_count && (
                                            <p className="text-xs text-accent-primary/70 mt-1 font-mono">
                                                {feed.episode_count} eps
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </PodcastLayout>
    );
}
