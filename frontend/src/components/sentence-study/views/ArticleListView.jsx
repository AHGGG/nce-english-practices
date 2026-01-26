/**
 * ArticleListView - Chapter/Article Selection List
 * Shows all articles in a selected book, with completed articles at bottom
 */
import React, { useState } from 'react';
import { ChevronLeft, BookOpen, Loader2, Zap, Check, ChevronDown } from 'lucide-react';
import { usePodcast } from '../../../context/PodcastContext';

const ArticleListView = ({
    selectedBook,
    articles = [],
    loading = false,
    onBack,
    onSelectArticle,
    books = [],
    onSelectBook
}) => {
    const { currentEpisode } = usePodcast();
    const [isBookMenuOpen, setIsBookMenuOpen] = useState(false);
    // Check if article was recently accessed (within 24 hours)
    const isRecent = (article) => {
        const lastActivity = Math.max(
            new Date(article.last_read || 0).getTime(),
            new Date(article.last_studied_at || 0).getTime()
        );
        // eslint-disable-next-line
        return lastActivity > Date.now() - 24 * 60 * 60 * 1000;
    };

    // Separate completed and non-completed articles
    const completedArticles = articles.filter(a => a.status === 'completed');
    const nonCompletedArticles = articles.filter(a => a.status !== 'completed');

    const renderArticleCard = (article, idx) => (
        <button
            key={idx}
            onClick={() => onSelectArticle(article.source_id)}
            className={`w-full text-left p-4 border bg-bg-surface hover:border-accent-primary hover:bg-accent-primary/5 transition-all group ${article.status === 'completed' ? 'border-accent-primary/30' : 'border-border'
                }`}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-serif text-lg text-text-primary line-clamp-2 leading-tight group-hover:text-accent-primary">
                            {article.title}
                        </h3>
                        {article.status === 'completed' && (
                            <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border bg-accent-primary/10 text-accent-primary border-accent-primary/30 flex items-center gap-1">
                                <Check size={8} /> COMPLETED
                            </span>
                        )}
                        {isRecent(article) && (
                            <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border bg-accent-warning/10 text-accent-warning border-accent-warning/30 flex items-center gap-1">
                                <Zap size={8} /> RECENT
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                        {article.sentence_count} sentences
                    </p>
                </div>
                <BookOpen className="w-4 h-4 text-text-muted group-hover:text-accent-primary ml-3 shrink-0" />
            </div>
        </button>
    );

    return (
        <div className="h-screen flex flex-col bg-bg-base text-text-primary font-mono">
            {/* Header: Large Semantic Design */}
            <header className="border-b border-border px-6 md:px-12 py-8 bg-bg-base relative z-50 shrink-0">
                <div className="flex flex-col items-start">
                    {/* Breadcrumb / Back Link */}
                    <div className="flex items-center gap-3 mb-3">
                        <button
                            onClick={onBack}
                            className="text-text-secondary hover:text-accent-primary transition-colors"
                            title="Back to Dashboard"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="w-6 h-6 bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center">
                            <BookOpen size={14} className="text-accent-primary" />
                        </div>
                        <span className="text-accent-primary text-xs font-bold tracking-[0.3em] uppercase">Sentence Study</span>
                    </div>

                    {/* Book Selector (Big Title) */}
                    <div className="relative">
                        <button
                            onClick={() => setIsBookMenuOpen(!isBookMenuOpen)}
                            className="flex items-center gap-3 group text-left"
                            disabled={books.length <= 1}
                        >
                            <h1 className="text-3xl md:text-5xl font-serif font-bold text-text-primary tracking-tight group-hover:text-accent-primary transition-colors line-clamp-1">
                                {selectedBook?.title || 'Unknown Book'}
                            </h1>
                            {books.length > 1 && (
                                <ChevronDown className={`w-6 h-6 md:w-8 md:h-8 opacity-30 text-text-primary group-hover:text-accent-primary group-hover:opacity-100 transition-all duration-300 ${isBookMenuOpen ? 'rotate-180' : ''}`} />
                            )}
                        </button>

                        {/* Dropdown Menu */}
                        {isBookMenuOpen && books.length > 0 && (
                            <>
                                <div
                                    className="fixed inset-0 z-40 bg-bg-base/50 backdrop-blur-[1px]"
                                    onClick={() => setIsBookMenuOpen(false)}
                                />
                                <div className="absolute top-full left-0 mt-4 w-[320px] md:w-[400px] max-w-[90vw] bg-bg-elevated border border-accent-primary/20 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl">
                                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                                        {books.map(book => (
                                            <button
                                                key={book.filename}
                                                onClick={() => {
                                                    onSelectBook(book.filename);
                                                    setIsBookMenuOpen(false);
                                                }}
                                                className={`w-full text-left p-5 border-b border-border/50 hover:bg-accent-primary/10 transition-colors flex items-center justify-between group/item ${selectedBook?.filename === book.filename ? 'bg-accent-primary/5' : ''}`}
                                            >
                                                <div className="flex flex-col gap-1">
                                                    <span className={`font-serif font-bold text-lg leading-tight ${selectedBook?.filename === book.filename ? 'text-accent-primary' : 'text-text-primary'}`}>
                                                        {book.title}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">
                                                        {(book.size_bytes / 1024 / 1024).toFixed(1)} MB
                                                    </span>
                                                </div>
                                                {selectedBook?.filename === book.filename && <Check size={18} className="text-accent-primary" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className={`flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 ${currentEpisode ? 'pb-32' : ''}`}>
                <div className="max-w-2xl mx-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
                        </div>
                    ) : (
                        <>
                            {/* Non-completed articles first */}
                            {nonCompletedArticles.length > 0 && (
                                <div className="space-y-3 mb-8">
                                    {nonCompletedArticles.map((article, i) => renderArticleCard(article, i))}
                                </div>
                            )}

                            {/* Completed articles at bottom */}
                            {completedArticles.length > 0 && (
                                <>
                                    <div className="flex items-center gap-3 mb-4 mt-8">
                                        <Check size={14} className="text-accent-primary" />
                                        <span className="text-xs text-accent-primary/70 uppercase tracking-wider font-bold">
                                            Completed ({completedArticles.length})
                                        </span>
                                        <div className="h-[1px] bg-accent-primary/20 flex-grow" />
                                    </div>
                                    <div className="space-y-3">
                                        {completedArticles.map((article, i) => renderArticleCard(article, i))}
                                    </div>
                                </>
                            )}

                            {/* Empty state */}
                            {articles.length === 0 && (
                                <div className="text-center py-12 text-text-muted">
                                    <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
                                    <p>No articles available</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ArticleListView;

