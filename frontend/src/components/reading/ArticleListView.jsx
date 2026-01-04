import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronLeft, Loader2, Check, Clock, BookOpenCheck } from 'lucide-react';

/**
 * Get status styling based on article status
 */
const getStatusConfig = (status) => {
    switch (status) {
        case 'completed':
            return {
                borderClass: 'border-[#00FF94]/50',
                badgeClass: 'bg-[#00FF94]/10 text-[#00FF94] border-[#00FF94]/30',
                badgeText: 'COMPLETED',
                Icon: Check,
                iconClass: 'text-[#00FF94]'
            };
        case 'in_progress':
            return {
                borderClass: 'border-[#FFD700]/40',
                badgeClass: 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30',
                badgeText: 'IN PROGRESS',
                Icon: Clock,
                iconClass: 'text-[#FFD700]'
            };
        case 'read':
            return {
                borderClass: 'border-[#888]/40',
                badgeClass: 'bg-[#888]/10 text-[#888] border-[#888]/30',
                badgeText: 'READ',
                Icon: BookOpenCheck,
                iconClass: 'text-[#888]'
            };
        default: // 'new' or undefined
            return {
                borderClass: 'border-[#333]',
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
    onArticleClick
}) => {
    const navigate = useNavigate();
    // Separate completed and non-completed articles
    const completedArticles = articles.filter(a => a.status === 'completed');
    const nonCompletedArticles = articles.filter(a => a.status !== 'completed');

    const renderArticleCard = (article, idx, showOriginalIndex = false) => {
        const statusConfig = getStatusConfig(article.status);
        const displayIdx = showOriginalIndex ? articles.indexOf(article) + 1 : idx + 1;

        return (
            <button
                key={article.source_id}
                onClick={() => onArticleClick(article.source_id)}
                className={`group relative flex flex-col items-start text-left p-6 md:p-8 bg-[#0A0A0A] border ${statusConfig.borderClass} hover:border-[#00FF94] transition-all duration-300 h-full hover:shadow-[0_0_20px_rgba(0,255,148,0.1)] hover:-translate-y-1`}
            >
                {/* Corner Index + Status Icon */}
                <div className="absolute top-0 right-0 p-3 flex items-center gap-2">
                    {statusConfig.Icon && (
                        <statusConfig.Icon size={14} className={statusConfig.iconClass} />
                    )}
                    <span className="opacity-30 text-[10px] font-mono text-[#666] group-hover:text-[#00FF94] transition-colors">
                        {String(displayIdx).padStart(2, '0')}
                    </span>
                </div>

                <div className="flex items-center gap-2 mb-4 w-full">
                    <span className="px-1.5 py-0.5 bg-[#1a1a1a] text-[#00FF94] text-[10px] font-bold uppercase tracking-wider border border-[#00FF94]/20 group-hover:border-[#00FF94] transition-colors">
                        Chapter {displayIdx}
                    </span>
                    {/* Status Badge */}
                    {statusConfig.badgeText && (
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${statusConfig.badgeClass}`}>
                            {statusConfig.badgeText}
                        </span>
                    )}
                    <div className="h-[1px] bg-[#333] flex-1 group-hover:bg-[#00FF94]/30 transition-colors"></div>
                </div>

                <h3 className="text-xl md:text-2xl font-serif font-bold text-[#E0E0E0] group-hover:text-[#00FF94] transition-colors mb-4 line-clamp-2 leading-tight min-h-[3rem]">
                    {article.title}
                </h3>

                <p className="text-sm text-[#888] line-clamp-3 leading-relaxed font-mono mb-6 flex-grow">
                    {article.preview}
                </p>

                {/* Footer with progress or action hint */}
                <div className="mt-auto pt-4 border-t border-[#333] w-full flex justify-between items-center group-hover:border-[#00FF94]/30 transition-colors">
                    <span className="text-[10px] text-[#444] uppercase tracking-wider font-mono">
                        {article.study_progress ? (
                            `${article.study_progress.studied_count}/${article.study_progress.total} studied`
                        ) : article.word_count ? (
                            `${article.word_count} words`
                        ) : (
                            'Read Article'
                        )}
                    </span>
                    <span className="text-[#00FF94] text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 flex items-center gap-1">
                        {article.status === 'completed' ? 'Review' : 'Read Now'} <ChevronLeft size={12} className="rotate-180" />
                    </span>
                </div>
            </button>
        );
    };

    return (
        <div className="min-h-screen bg-[#050505] text-[#E0E0E0] font-mono selection:bg-[#00FF94] selection:text-black">
            {/* GLOBAL NOISE TEXTURE OVERLAY */}
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

            {/* HEADER SECTION */}
            <header className="border-b border-[#333] px-6 md:px-12 py-8 flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <button
                            onClick={() => navigate('/nav')}
                            className="text-[#888] hover:text-[#00FF94] transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="w-6 h-6 bg-[#00FF94] flex items-center justify-center">
                            <BookOpen size={16} className="text-black" />
                        </div>
                        <span className="text-[#00FF94] text-xs font-bold tracking-[0.3em] uppercase">Reading Mode</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-white tracking-tight">
                        Article <span className="italic text-[#333]">/</span> Library
                    </h1>
                </div>
                <div className="hidden md:flex items-center gap-6">
                    {/* Stats: Completed / Total */}
                    {completedArticles.length > 0 && (
                        <div className="flex items-center gap-3 px-4 py-2 bg-[#111] border border-[#00FF94]/30">
                            <Check size={14} className="text-[#00FF94]" />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-[#666] uppercase tracking-wider leading-none">Completed</span>
                                <span className="text-sm font-bold text-[#00FF94] font-mono leading-none mt-1">{completedArticles.length}/{articles.length}</span>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-3 px-4 py-2 bg-[#111] border border-[#333]">
                        <BookOpen size={14} className="text-[#666]" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-[#666] uppercase tracking-wider leading-none">Articles</span>
                            <span className="text-sm font-bold text-white font-mono leading-none mt-1">{articles.length}</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="px-6 md:px-12 py-12">
                {isLoading && articles.length === 0 ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#888]" /></div>
                ) : (
                    <>
                        {/* Non-Completed Articles Section */}
                        {nonCompletedArticles.length > 0 && (
                            <>
                                <h2 className="text-sm font-bold text-[#666] uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                                    01. To Read
                                    <div className="h-[1px] bg-[#333] flex-grow"></div>
                                    <span className="text-[#888]">{nonCompletedArticles.length}</span>
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1920px] mb-16">
                                    {nonCompletedArticles.map((article, idx) => renderArticleCard(article, idx, true))}
                                </div>
                            </>
                        )}

                        {/* Completed Articles Section */}
                        {completedArticles.length > 0 && (
                            <>
                                <h2 className="text-sm font-bold text-[#00FF94]/70 uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                                    <Check size={14} className="text-[#00FF94]" />
                                    Completed
                                    <div className="h-[1px] bg-[#00FF94]/20 flex-grow"></div>
                                    <span className="text-[#00FF94]">{completedArticles.length}</span>
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1920px]">
                                    {completedArticles.map((article, idx) => renderArticleCard(article, idx, true))}
                                </div>
                            </>
                        )}

                        {/* Empty State */}
                        {articles.length === 0 && (
                            <div className="text-center py-20 text-[#666]">
                                <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
                                <p>No articles available</p>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default ArticleListView;
