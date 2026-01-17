/**
 * ArticleListView - Chapter/Article Selection List
 * Shows all articles in a selected book, with completed articles at bottom
 */
import React from 'react';
import { ChevronLeft, BookOpen, Loader2, Zap, Check } from 'lucide-react';

const ArticleListView = ({
    selectedBook,
    articles = [],
    loading = false,
    onBack,
    onSelectArticle
}) => {
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
                        <h3 className="font-serif text-lg text-text-primary truncate group-hover:text-accent-primary">
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
            <header className="h-14 border-b border-border flex items-center px-4 md:px-8 bg-bg-elevated">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-text-secondary hover:text-accent-primary transition-colors mr-3"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex flex-col">
                    <h1 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                        {selectedBook?.title || 'Unknown Book'}
                    </h1>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider">Chapter List</span>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-8">
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

