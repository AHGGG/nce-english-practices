/**
 * ArticleListView - Chapter/Article Selection List
 * Shows all articles in a selected book
 */
import React from 'react';
import { ChevronLeft, BookOpen, Loader2 } from 'lucide-react';

const ArticleListView = ({
    selectedBook,
    articles = [],
    loading = false,
    onBack,
    onSelectArticle
}) => {
    return (
        <div className="h-screen flex flex-col bg-[#050505] text-[#E0E0E0] font-mono">
            <header className="h-14 border-b border-[#333] flex items-center px-4 md:px-8 bg-[#0A0A0A]">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-[#888] hover:text-[#00FF94] transition-colors mr-3"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex flex-col">
                    <h1 className="text-sm font-bold uppercase tracking-wider text-white">
                        {selectedBook?.title || 'Unknown Book'}
                    </h1>
                    <span className="text-[10px] text-[#666] uppercase tracking-wider">Chapter List</span>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-2xl mx-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-[#00FF94]" />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {articles.map((article, i) => (
                                <button
                                    key={i}
                                    onClick={() => onSelectArticle(article.source_id)}
                                    className="w-full text-left p-4 border border-[#333] bg-[#0A0A0A] hover:border-[#00FF94] hover:bg-[#00FF94]/5 transition-all group"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-serif text-lg text-white truncate group-hover:text-[#00FF94]">
                                                {article.title}
                                            </h3>
                                            <p className="text-xs text-[#666] mt-1">
                                                {article.sentence_count} sentences
                                            </p>
                                        </div>
                                        <BookOpen className="w-4 h-4 text-[#666] group-hover:text-[#00FF94] ml-3 shrink-0" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ArticleListView;
