/**
 * OverviewView - Article Overview before studying
 * Shows summary, Chinese translation, key topics, and difficulty hint
 */
import React from 'react';
import { ChevronLeft, BookOpen, Loader2, GraduationCap } from 'lucide-react';

const OverviewView = ({
    article,
    overview,
    overviewStreamContent = '',
    onBack,
    onStartStudying
}) => {
    const sentenceCount = article?.sentence_count || article?.sentences?.length || 0;

    // Helper to extract fields from partial JSON string
    const parsePartialJSON = (jsonStr) => {
        if (!jsonStr) return null;
        const result = {};

        // Extract summary_en
        const enMatch = jsonStr.match(/"summary_en"\s*:\s*"((?:[^"\\]|\\.)*)/);
        if (enMatch) result.summary_en = enMatch[1].replace(/\\"/g, '"');

        // Extract summary_zh
        const zhMatch = jsonStr.match(/"summary_zh"\s*:\s*"((?:[^"\\]|\\.)*)/);
        if (zhMatch) result.summary_zh = zhMatch[1].replace(/\\"/g, '"');

        return result;
    };

    const partialOverview = parsePartialJSON(overviewStreamContent);
    const displayOverview = overview || (partialOverview?.summary_en ? partialOverview : null);
    const isStreaming = !overview && !!overviewStreamContent;

    return (
        <div className="h-screen flex flex-col bg-[#050505] text-[#E0E0E0] font-mono">
            {/* Header */}
            <header className="h-14 border-b border-[#333] flex items-center justify-between px-4 md:px-8 bg-[#0A0A0A]">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-[#888] hover:text-[#00FF94] transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Back</span>
                </button>
                <div className="text-xs text-[#666]">
                    {sentenceCount} sentences
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-2xl w-full mx-auto">
                    {/* Article Title */}
                    <h1 className="font-serif text-2xl md:text-3xl text-white text-center mb-8">
                        {article?.title}
                    </h1>

                    {!displayOverview ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-[#00FF94] mb-4" />
                            <p className="text-[#888] text-sm">
                                {overviewStreamContent ? 'Generating Overview...' : 'Analyzing article...'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* English Summary */}
                            <div className={`p-6 border border-[#333] bg-[#0A0A0A] transition-all duration-500 ${isStreaming ? 'border-t-[#00FF94]/30' : ''}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <BookOpen className={`w-4 h-4 ${isStreaming ? 'text-[#00FF94] animate-pulse' : 'text-[#00FF94]'}`} />
                                    <span className="text-xs text-[#00FF94] uppercase tracking-wider">Overview</span>
                                </div>
                                <p className="font-serif text-lg leading-relaxed text-[#CCC]">
                                    {displayOverview.summary_en || (isStreaming && <span className="animate-pulse">...</span>)}
                                    {isStreaming && !displayOverview.summary_zh && <span className="inline-block w-2 h-4 ml-1 bg-[#00FF94] animate-pulse" />}
                                </p>
                            </div>

                            {/* Chinese Translation */}
                            {(displayOverview.summary_zh || isStreaming) && (
                                <div className="p-6 border border-[#444] bg-[#0A0A0A]/50">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-xs text-[#888] uppercase tracking-wider">中文概要</span>
                                    </div>
                                    <p className="text-base leading-relaxed text-[#AAA]">
                                        {displayOverview.summary_zh}
                                        {isStreaming && displayOverview.summary_zh && <span className="inline-block w-2 h-4 ml-1 bg-[#888] animate-pulse" />}
                                    </p>
                                </div>
                            )}

                            {/* Key Topics */}
                            {displayOverview.key_topics?.length > 0 && (
                                <div className="flex flex-wrap gap-2 justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    {displayOverview.key_topics.map((topic, i) => (
                                        <span key={i} className="px-3 py-1 text-xs bg-[#1A1A1A] border border-[#333] text-[#888]">
                                            {topic}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Difficulty Hint */}
                            {displayOverview.difficulty_hint && (
                                <p className="text-center text-xs text-[#666] animate-in fade-in zoom-in duration-500">
                                    💡 {displayOverview.difficulty_hint}
                                </p>
                            )}

                            {/* Start Button */}
                            {!isStreaming && (
                                <div className="flex justify-center pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                                    <button
                                        onClick={onStartStudying}
                                        className="flex items-center gap-3 px-10 py-4 bg-[#00FF94] text-black font-bold uppercase text-sm hover:bg-[#00CC77] transition-colors"
                                    >
                                        <GraduationCap className="w-5 h-5" />
                                        Start Studying
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default OverviewView;
