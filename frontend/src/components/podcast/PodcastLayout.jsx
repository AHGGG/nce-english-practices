/**
 * Podcast Layout - Shared wrapper for podcast views with header and consistent styling.
 * Includes navigation tabs: Library, Search, Downloads
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Headphones, Search, Library, CloudOff, HardDrive } from 'lucide-react';
import { getStorageEstimate, getOfflineEpisodeIds } from '../../utils/offline';

export default function PodcastLayout({ children, title, showBackButton = true }) {
    const navigate = useNavigate();
    const location = useLocation();

    const [storageInfo, setStorageInfo] = useState(null);
    const [offlineCount, setOfflineCount] = useState(0);

    const isLibrary = location.pathname === '/podcast';
    const isSearch = location.pathname === '/podcast/search';
    const isDownloads = location.pathname === '/podcast/downloads';

    // Load storage info on mount
    useEffect(() => {
        getStorageEstimate().then(setStorageInfo);
        setOfflineCount(getOfflineEpisodeIds().length);
    }, []);

    return (
        <div className="min-h-screen bg-bg-base">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-bg-base/95 backdrop-blur border-b border-border">
                <div className="max-w-5xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {showBackButton && (
                                <button
                                    onClick={() => navigate('/nav')}
                                    className="p-2 -ml-2 text-text-muted hover:text-text-primary transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                            )}

                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 rounded-lg">
                                    <Headphones className="w-6 h-6 text-accent-primary" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold font-serif text-text-primary">
                                        {title || 'Podcast'}
                                    </h1>
                                    <p className="text-xs text-text-muted font-mono">// AUDIO_LEARNING_MODE</p>
                                </div>
                            </div>
                        </div>

                        {/* Storage indicator */}
                        {storageInfo && (
                            <div className="hidden md:flex items-center gap-2 text-xs text-text-muted px-3 py-1.5 bg-bg-surface rounded-lg border border-border">
                                <HardDrive className="w-4 h-4" />
                                <span className="font-mono">{storageInfo.usedMB} MB</span>
                                <span className="text-text-muted/50">/</span>
                                <span className="font-mono text-text-muted/70">{storageInfo.quotaMB} MB</span>
                            </div>
                        )}
                    </div>

                    {/* Nav tabs */}
                    <nav className="flex items-center gap-1 mt-4 -mb-4 border-b border-transparent overflow-x-auto w-full no-scrollbar">
                        <button
                            onClick={() => navigate('/podcast')}
                            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${isLibrary
                                ? 'border-accent-primary text-accent-primary bg-accent-primary/10'
                                : 'border-transparent text-text-muted hover:text-text-primary'
                                }`}
                        >
                            <Library className="w-4 h-4" />
                            <span>Library</span>
                        </button>

                        <button
                            onClick={() => navigate('/podcast/search')}
                            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${isSearch
                                ? 'border-accent-primary text-accent-primary bg-accent-primary/10'
                                : 'border-transparent text-text-muted hover:text-text-primary'
                                }`}
                        >
                            <Search className="w-4 h-4" />
                            <span>Search</span>
                        </button>

                        <button
                            onClick={() => navigate('/podcast/downloads')}
                            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${isDownloads
                                ? 'border-accent-primary text-accent-primary bg-accent-primary/10'
                                : 'border-transparent text-text-muted hover:text-text-primary'
                                }`}
                        >
                            <CloudOff className="w-4 h-4" />
                            <span>Downloads</span>
                            {offlineCount > 0 && (
                                <span className="px-1.5 py-0.5 text-xs font-mono bg-accent-success/20 text-accent-success rounded-full">
                                    {offlineCount}
                                </span>
                            )}
                        </button>
                    </nav>
                </div>
            </header>

            {/* Main content */}
            <main className="max-w-5xl mx-auto px-4 py-6 pb-32">
                {children}
            </main>
        </div>
    );
}
