import React from 'react';
import { BookOpen, ChevronLeft, Loader2 } from 'lucide-react';

/**
 * Article List View - Library grid showing available articles
 */
const ArticleListView = ({
    articles,
    isLoading,
    onArticleClick
}) => {
    return (
        <div className="min-h-screen bg-[#050505] text-[#E0E0E0] font-mono selection:bg-[#00FF94] selection:text-black">
            {/* GLOBAL NOISE TEXTURE OVERLAY */}
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

            {/* HEADER SECTION */}
            <header className="border-b border-[#333] px-6 md:px-12 py-8 flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-6 h-6 bg-[#00FF94] flex items-center justify-center">
                            <BookOpen size={16} className="text-black" />
                        </div>
                        <span className="text-[#00FF94] text-xs font-bold tracking-[0.3em] uppercase">Reading Mode</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-white tracking-tight">
                        Article <span className="italic text-[#333]">/</span> Library
                    </h1>
                </div>
                <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-[#111] border border-[#333]">
                    <BookOpen size={14} className="text-[#666]" />
                    <div className="flex flex-col">
                        <span className="text-[10px] text-[#666] uppercase tracking-wider leading-none">Articles</span>
                        <span className="text-sm font-bold text-white font-mono leading-none mt-1">{articles.length}</span>
                    </div>
                </div>
            </header>

            <main className="px-6 md:px-12 py-12">
                {isLoading && articles.length === 0 ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#888]" /></div>
                ) : (
                    <>
                        {/* Section Header */}
                        <h2 className="text-sm font-bold text-[#666] uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                            01. Available Articles
                            <div className="h-[1px] bg-[#333] flex-grow"></div>
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1920px]">
                            {articles.map((article, idx) => (
                                <button
                                    key={article.source_id}
                                    onClick={() => onArticleClick(article.source_id)}
                                    className="group relative flex flex-col items-start text-left p-6 md:p-8 bg-[#0A0A0A] border border-[#333] hover:border-[#00FF94] transition-all duration-300 h-full hover:shadow-[0_0_20px_rgba(0,255,148,0.1)] hover:-translate-y-1"
                                >
                                    {/* Corner Index */}
                                    <div className="absolute top-0 right-0 p-3 opacity-30 text-[10px] font-mono text-[#666] group-hover:text-[#00FF94] transition-colors">
                                        {String(idx + 1).padStart(2, '0')}
                                    </div>

                                    <div className="flex items-center gap-2 mb-4 w-full">
                                        <span className="px-1.5 py-0.5 bg-[#1a1a1a] text-[#00FF94] text-[10px] font-bold uppercase tracking-wider border border-[#00FF94]/20 group-hover:border-[#00FF94] transition-colors">
                                            Chapter {idx + 1}
                                        </span>
                                        <div className="h-[1px] bg-[#333] flex-1 group-hover:bg-[#00FF94]/30 transition-colors"></div>
                                    </div>

                                    <h3 className="text-xl md:text-2xl font-serif font-bold text-[#E0E0E0] group-hover:text-[#00FF94] transition-colors mb-4 line-clamp-2 leading-tight min-h-[3rem]">
                                        {article.title}
                                    </h3>

                                    <p className="text-sm text-[#888] line-clamp-3 leading-relaxed font-mono mb-6 flex-grow">
                                        {article.preview}
                                    </p>

                                    {/* Footer with action hint */}
                                    <div className="mt-auto pt-4 border-t border-[#333] w-full flex justify-between items-center group-hover:border-[#00FF94]/30 transition-colors">
                                        <span className="text-[10px] text-[#444] uppercase tracking-wider font-mono">
                                            {article.word_count ? `${article.word_count} words` : 'Read Article'}
                                        </span>
                                        <span className="text-[#00FF94] text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 flex items-center gap-1">
                                            Read Now <ChevronLeft size={12} className="rotate-180" />
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default ArticleListView;
