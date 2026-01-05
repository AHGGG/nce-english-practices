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

                    {!overview ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-[#00FF94] mb-4" />
                            <p className="text-[#888] text-sm">
                                {overviewStreamContent ? 'Generating Overview...' : 'Analyzing article...'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* English Summary */}
                            <div className="p-6 border border-[#333] bg-[#0A0A0A]">
                                <div className="flex items-center gap-2 mb-3">
                                    <BookOpen className="w-4 h-4 text-[#00FF94]" />
                                    <span className="text-xs text-[#00FF94] uppercase tracking-wider">Overview</span>
                                </div>
                                <p className="font-serif text-lg leading-relaxed text-[#CCC]">
                                    {overview.summary_en}
                                </p>
                            </div>

                            {/* Chinese Translation */}
                            <div className="p-6 border border-[#444] bg-[#0A0A0A]/50">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xs text-[#888] uppercase tracking-wider">中文概要</span>
                                </div>
                                <p className="text-base leading-relaxed text-[#AAA]">
                                    {overview.summary_zh}
                                </p>
                            </div>

                            {/* Key Topics */}
                            {overview.key_topics?.length > 0 && (
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {overview.key_topics.map((topic, i) => (
                                        <span key={i} className="px-3 py-1 text-xs bg-[#1A1A1A] border border-[#333] text-[#888]">
                                            {topic}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Difficulty Hint */}
                            {overview.difficulty_hint && (
                                <p className="text-center text-xs text-[#666]">
                                    💡 {overview.difficulty_hint}
                                </p>
                            )}

                            {/* Start Button */}
                            <div className="flex justify-center pt-4">
                                <button
                                    onClick={onStartStudying}
                                    className="flex items-center gap-3 px-10 py-4 bg-[#00FF94] text-black font-bold uppercase text-sm hover:bg-[#00CC77] transition-colors"
                                >
                                    <GraduationCap className="w-5 h-5" />
                                    Start Studying
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default OverviewView;
