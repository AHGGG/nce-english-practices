/**
 * CompletedView - Article completion summary
 * Shows stats and full article with highlighted lookups and unclear sentences
 * Clicking unclear sentences opens SentenceInspector for explanations
 */
import React, { useState } from 'react';
import { ChevronLeft, CheckCircle, BookMarked, AlertCircle } from 'lucide-react';
import SentenceInspector from '../../reading/SentenceInspector';

// Get border/bg class based on unclear type
const getUnclearSentenceStyle = (unclearChoice) => {
    switch (unclearChoice) {
        case 'vocabulary':
            return 'border-l-4 border-orange-400 bg-orange-500/10 pl-3';
        case 'grammar':
            return 'border-l-4 border-blue-400 bg-blue-500/10 pl-3';
        case 'both':
            return 'border-l-4 border-red-400 bg-red-500/10 pl-3';
        default:
            return 'border-l-4 border-yellow-400 bg-yellow-500/10 pl-3';
    }
};

// HighlightedText subcomponent
const HighlightedText = ({ text, highlights = [], onWordClick }) => {
    if (!highlights || highlights.length === 0) {
        return <span>{text}</span>;
    }

    const pattern = highlights
        .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
    const regex = new RegExp(`\\b(${pattern})\\b`, 'gi');
    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, i) => {
                const isHighlight = highlights.some(
                    h => h.toLowerCase() === part.toLowerCase()
                );
                return isHighlight ? (
                    <mark
                        key={i}
                        className="bg-amber-500/30 text-amber-200 px-0.5 rounded cursor-pointer hover:bg-amber-500/50"
                        onClick={(e) => {
                            e.stopPropagation();
                            onWordClick?.(part, text);
                        }}
                    >
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                );
            })}
        </>
    );
};

const CompletedView = ({
    article,
    sentences = [],
    studyHighlights = { word_clicks: [], phrase_clicks: [], unclear_sentences: [] },
    progress = { studied_count: 0, clear_count: 0 },
    onBack,
    onWordClick
}) => {
    // Sentence Inspector state
    const [selectedSentence, setSelectedSentence] = useState(null);
    const [selectedSentenceInfo, setSelectedSentenceInfo] = useState(null);

    const allHighlights = [
        ...(studyHighlights.word_clicks || []),
        ...(studyHighlights.phrase_clicks || [])
    ];

    // Build a map of sentence index -> unclear info for quick lookup
    const unclearMap = {};
    (studyHighlights.unclear_sentences || []).forEach(info => {
        unclearMap[info.sentence_index] = info;
    });

    const unclearCount = studyHighlights.unclear_sentences?.length || 0;

    const clearRate = progress.studied_count > 0
        ? Math.round((progress.clear_count / progress.studied_count) * 100)
        : 0;

    // Handle sentence click for unclear sentences
    const handleSentenceClick = (sentence, unclearInfo) => {
        setSelectedSentence(sentence);
        setSelectedSentenceInfo(unclearInfo);
    };

    const closeSentenceInspector = () => {
        setSelectedSentence(null);
        setSelectedSentenceInfo(null);
    };

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
                <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-[#00FF94]" />
                    <span className="text-xs text-[#00FF94] uppercase tracking-wider font-bold">Completed</span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-3xl mx-auto">
                    {/* Article Title */}
                    <h1 className="font-serif text-2xl md:text-3xl text-white text-center mb-6">
                        {article?.title}
                    </h1>

                    {/* Stats */}
                    <div className="flex justify-center gap-6 mb-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-[#00FF94]">{progress.studied_count}</div>
                            <div className="text-xs text-[#666]">Sentences</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-[#00FF94]">{clearRate}%</div>
                            <div className="text-xs text-[#666]">Clear Rate</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-amber-400">{allHighlights.length}</div>
                            <div className="text-xs text-[#666]">Looked Up</div>
                        </div>
                        {unclearCount > 0 && (
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-400">{unclearCount}</div>
                                <div className="text-xs text-[#666]">Unclear</div>
                            </div>
                        )}
                    </div>

                    {/* Legend for unclear sentence colors */}
                    {unclearCount > 0 && (
                        <div className="flex flex-wrap justify-center gap-4 mb-6 text-xs text-[#888]">
                            <div className="flex items-center gap-1">
                                <span className="inline-block w-3 h-3 border-l-4 border-orange-400 bg-orange-500/20"></span>
                                <span>Vocabulary</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="inline-block w-3 h-3 border-l-4 border-blue-400 bg-blue-500/20"></span>
                                <span>Grammar</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="inline-block w-3 h-3 border-l-4 border-red-400 bg-red-500/20"></span>
                                <span>Both</span>
                            </div>
                        </div>
                    )}

                    {/* Hint */}
                    {(allHighlights.length > 0 || unclearCount > 0) && (
                        <p className="text-center text-sm text-[#888] mb-6">
                            🔍 Click highlighted words to review | Click colored sentences to see explanations
                        </p>
                    )}

                    {/* Full Article with Highlights */}
                    <div className="p-6 border border-[#333] bg-[#0A0A0A]">
                        <div className="font-serif text-base md:text-lg leading-relaxed space-y-4">
                            {sentences.map((sentence, idx) => {
                                const unclearInfo = unclearMap[idx];
                                const isUnclear = !!unclearInfo;
                                const sentenceClass = isUnclear
                                    ? `text-[#CCC] py-1 cursor-pointer hover:bg-opacity-30 ${getUnclearSentenceStyle(unclearInfo.unclear_choice)}`
                                    : 'text-[#CCC]';

                                return (
                                    <p
                                        key={idx}
                                        className={sentenceClass}
                                        onClick={isUnclear ? () => handleSentenceClick(sentence.text, unclearInfo) : undefined}
                                        title={isUnclear ? '❓ Click to see explanation' : undefined}
                                    >
                                        <HighlightedText
                                            text={sentence.text}
                                            highlights={allHighlights}
                                            onWordClick={onWordClick}
                                        />
                                    </p>
                                );
                            })}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap justify-center gap-4 mt-8">
                        <button
                            onClick={() => {
                                window.location.href = `/reading?source_id=${encodeURIComponent(article?.id)}`;
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-[#00FF94] text-black font-bold hover:bg-[#00FF94]/80 transition-colors"
                        >
                            <BookMarked className="w-4 h-4" />
                            Read Full Article
                        </button>
                        <button
                            onClick={onBack}
                            className="px-6 py-3 border border-[#666] text-[#888] hover:text-white hover:border-white transition-colors"
                        >
                            Back to Chapter List
                        </button>
                    </div>
                </div>
            </main>

            {/* Sentence Inspector */}
            <SentenceInspector
                sentence={selectedSentence}
                unclearInfo={selectedSentenceInfo}
                isOpen={!!selectedSentence}
                onClose={closeSentenceInspector}
            />
        </div>
    );
};

export default CompletedView;
