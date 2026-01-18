import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronLeft, Loader2, Check, Clock, BookOpenCheck, Zap, ChevronDown } from 'lucide-react';
import { useState } from 'react';

/**
 * Get status styling based on article status
 */
const getStatusConfig = (status) => {
    switch (status) {
        case 'completed':
            return {
                borderClass: 'border-accent-primary/50',
                badgeClass: 'bg-accent-primary/10 text-accent-primary border-accent-primary/30',
                badgeText: 'COMPLETED',
                Icon: Check,
                iconClass: 'text-accent-primary'
            };
        case 'in_progress':
            return {
                borderClass: 'border-accent-warning/40',
                badgeClass: 'bg-accent-warning/10 text-accent-warning border-accent-warning/30',
                badgeText: 'IN PROGRESS',
                Icon: Clock,
                iconClass: 'text-accent-warning'
            };
        case 'read':
            return {
                borderClass: 'border-text-secondary/40',
                badgeClass: 'bg-text-secondary/10 text-text-secondary border-text-secondary/30',
                badgeText: 'READ',
                Icon: BookOpenCheck,
                iconClass: 'text-text-secondary'
            };
        default: // 'new' or undefined
            return {
                borderClass: 'border-border',
                badgeClass: null,
                badgeText: null,
                Icon: null,
                iconClass: null
            };
    }
};

/**
 * Article List View - Library grid showing available articles
 */
const ArticleListView = ({
    articles,
    isLoading,

    books = [],
    selectedBookFilename,
    onBookSelect,
    onArticleClick
}) => {
    const navigate = useNavigate();
    const [isBookMenuOpen, setIsBookMenuOpen] = useState(false);

    // Find current book title
    const currentBook = books.find(b => b.filename === selectedBookFilename);
    const currentBookTitle = currentBook ? currentBook.title : 'Library';
    // Separate completed and non-completed articles
    const completedArticles = articles.filter(a => a.status === 'completed');
    const nonCompletedArticles = articles.filter(a => a.status !== 'completed');
    const [now] = useState(() => Date.now());

    const renderArticleCard = (article, idx, showOriginalIndex = false) => {
        const statusConfig = getStatusConfig(article.status);
        const displayIdx = showOriginalIndex ? articles.indexOf(article) + 1 : idx + 1;

        // Check if recently accessed (within 24 hours)
        const lastActivity = Math.max(
            new Date(article.last_read || 0).getTime(),
            new Date(article.last_studied_at || 0).getTime()
        );
        const isRecent = lastActivity > now - 24 * 60 * 60 * 1000;

        return (
            <button
                key={article.source_id}
                onClick={() => onArticleClick(article.source_id)}
                className={`group relative flex flex-col items-start text-left p-6 md:p-8 bg-bg-surface border ${statusConfig.borderClass} hover:border-accent-primary transition-all duration-300 h-full hover:shadow-[0_0_20px_rgba(0,255,148,0.1)] hover:-translate-y-1`}
            >
                {/* Corner Index + Status Icon */}
                <div className="absolute top-0 right-0 p-3 flex items-center gap-2">
                    {statusConfig.Icon && (
                        <statusConfig.Icon size={14} className={statusConfig.iconClass} />
                    )}
                    <span className="opacity-30 text-[10px] font-mono text-text-muted group-hover:text-accent-primary transition-colors">
                        {String(displayIdx).padStart(2, '0')}
                    </span>
                </div>

                <div className="flex items-center gap-2 mb-4 w-full">
                    <span className="px-1.5 py-0.5 bg-bg-elevated text-accent-primary text-[10px] font-bold uppercase tracking-wider border border-accent-primary/20 group-hover:border-accent-primary transition-colors">
                        Chapter {displayIdx}
                    </span>
                    {/* Status Badge */}
                    {statusConfig.badgeText && (
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${statusConfig.badgeClass}`}>
                            {statusConfig.badgeText}
                        </span>
                    )}
                    {/* Recent Badge */}
                    {isRecent && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border bg-orange-500/10 text-orange-500 border-orange-500/30 flex items-center gap-1">
                            <Zap size={8} /> RECENT
                        </span>
                    )}
                    <div className="h-[1px] bg-border flex-1 group-hover:bg-accent-primary/30 transition-colors"></div>
                </div>

                <h3 className="text-xl md:text-2xl font-serif font-bold text-text-primary group-hover:text-accent-primary transition-colors mb-4 line-clamp-2 leading-tight min-h-[3rem]">
                    {article.title}
                </h3>

                <p className="text-sm text-text-secondary line-clamp-3 leading-relaxed font-mono mb-6 flex-grow">
                    {article.preview}
                </p>

                {/* Footer with progress or action hint */}
                <div className="mt-auto pt-4 border-t border-border w-full flex justify-between items-center group-hover:border-accent-primary/30 transition-colors">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider font-mono">
                        {article.study_progress ? (
                            `${article.study_progress.studied_count}/${article.study_progress.total} studied`
                        ) : article.word_count ? (
                            `${article.word_count} words`
                        ) : (
                            'Read Article'
                        )}
                    </span>
                    <span className="text-accent-primary text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 flex items-center gap-1">
                        {article.status === 'completed' ? 'Review' : 'Read Now'} <ChevronLeft size={12} className="rotate-180" />
                    </span>
                </div>
            </button>
        );
    };

    return (
        <div className="min-h-screen bg-bg-base text-text-primary font-mono selection:bg-accent-primary selection:text-text-inverse">
            {/* GLOBAL NOISE TEXTURE OVERLAY */}
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

            {/* HEADER SECTION */}
            <header className="border-b border-border px-6 md:px-12 py-8 flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <button
                            onClick={() => navigate('/nav')}
                            className="text-text-secondary hover:text-accent-primary transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="w-6 h-6 bg-accent-primary flex items-center justify-center">
                            <BookOpen size={16} className="text-text-inverse" />
                        </div>
                        <span className="text-accent-primary text-xs font-bold tracking-[0.3em] uppercase">Reading Mode</span>
                    </div>


                    {/* Book Selector (Dropdown) */}
                    <div className="relative">
                        <button
                            onClick={() => setIsBookMenuOpen(!isBookMenuOpen)}
                            className="group flex items-center gap-3 text-3xl md:text-5xl font-serif font-bold text-text-primary tracking-tight hover:text-accent-primary transition-colors text-left"
                        >
                            <span className="line-clamp-1">{currentBookTitle}</span>
                            {books.length > 1 && (
                                <ChevronDown className={`w-6 h-6 md:w-8 md:h-8 opacity-50 group-hover:opacity-100 transition-transform duration-300 ${isBookMenuOpen ? 'rotate-180' : ''}`} />
                            )}
                        </button>

                        {/* Dropdown Menu */}
                        {isBookMenuOpen && books.length > 0 && (
                            <>
                                <div
                                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
                                    onClick={() => setIsBookMenuOpen(false)}
                                ></div>
                                <div className="absolute left-0 top-full mt-4 w-[320px] md:w-[400px] max-w-[90vw] bg-bg-elevated border border-accent-primary/20 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl">
                                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                                        {books.map(book => (
                                            <button
                                                key={book.filename}
                                                onClick={() => {
                                                    onBookSelect(book.filename);
                                                    setIsBookMenuOpen(false);
                                                }}
                                                className={`w-full text-left p-5 border-b border-border/50 hover:bg-accent-primary/10 transition-colors flex items-center justify-between group/item ${selectedBookFilename === book.filename ? 'bg-accent-primary/5' : ''}`}
                                            >
                                                <div className="flex flex-col gap-1">
                                                    <span className={`font-serif font-bold text-lg leading-tight ${selectedBookFilename === book.filename ? 'text-accent-primary' : 'text-text-primary'}`}>
                                                        {book.title}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">
                                                        {(book.size_bytes / 1024 / 1024).toFixed(1)} MB
                                                    </span>
                                                </div>
                                                {selectedBookFilename === book.filename && <Check size={18} className="text-accent-primary flex-shrink-0 ml-4" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-6">
                    {/* Stats: Completed / Total */}
                    {completedArticles.length > 0 && (
                        <div className="flex items-center gap-3 px-4 py-2 bg-bg-elevated border border-accent-primary/30">
                            <Check size={14} className="text-accent-primary" />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-text-muted uppercase tracking-wider leading-none">Completed</span>
                                <span className="text-sm font-bold text-accent-primary font-mono leading-none mt-1">{completedArticles.length}/{articles.length}</span>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-3 px-4 py-2 bg-bg-elevated border border-border">
                        <BookOpen size={14} className="text-text-muted" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-text-muted uppercase tracking-wider leading-none">Articles</span>
                            <span className="text-sm font-bold text-text-primary font-mono leading-none mt-1">{articles.length}</span>
                        </div>
                    </div>
                </div>
            </header >

            <main className="px-6 md:px-12 py-12">
                {isLoading && articles.length === 0 ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-text-secondary" /></div>
                ) : (
                    <>
                        {/* Non-Completed Articles Section */}
                        {nonCompletedArticles.length > 0 && (
                            <>
                                <h2 className="text-sm font-bold text-text-muted uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                                    01. To Read
                                    <div className="h-[1px] bg-border flex-grow"></div>
                                    <span className="text-text-secondary">{nonCompletedArticles.length}</span>
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1920px] mb-16">
                                    {nonCompletedArticles.map((article, idx) => renderArticleCard(article, idx, true))}
                                </div>
                            </>
                        )}

                        {/* Completed Articles Section */}
                        {completedArticles.length > 0 && (
                            <>
                                <h2 className="text-sm font-bold text-accent-primary/70 uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                                    <Check size={14} className="text-accent-primary" />
                                    Completed
                                    <div className="h-[1px] bg-accent-primary/20 flex-grow"></div>
                                    <span className="text-accent-primary">{completedArticles.length}</span>
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1920px]">
                                    {completedArticles.map((article, idx) => renderArticleCard(article, idx, true))}
                                </div>
                            </>
                        )}

                        {/* Empty State */}
                        {articles.length === 0 && (
                            <div className="text-center py-20 text-text-muted">
                                <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
                                <p>No articles available</p>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div >
    );
};

export default ArticleListView;
