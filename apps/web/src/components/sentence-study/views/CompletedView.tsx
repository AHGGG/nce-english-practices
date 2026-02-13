/**
 * CompletedView - Article completion summary
 * Shows stats and full article with highlighted lookups and unclear sentences
 * Clicking unclear sentences opens SentenceInspector for explanations
 */
import React, { useState } from "react";
import { ChevronLeft, CheckCircle, BookMarked, Trophy } from "lucide-react";
import SentenceInspector from "../../reading/SentenceInspector";
import { getGapTypeInfo, DIFFICULTY_CHOICES } from "../constants";
import { usePodcast } from "../../../context/PodcastContext";

interface Progress {
  studied_count: number;
  clear_count: number;
}

interface UnclearSentenceInfo {
  sentence_index: number;
  unclear_choice?: string;
}

interface StudyHighlights {
  word_clicks: string[];
  phrase_clicks: string[];
  unclear_sentences: UnclearSentenceInfo[];
}

interface ArticleData {
  id?: string;
  title?: string;
}

interface SentenceItem {
  text: string;
}

interface CompletedViewProps {
  article: ArticleData | null;
  sentences?: Array<string | SentenceItem>;
  studyHighlights?: StudyHighlights;
  progress?: Progress;
  onBack: () => void;
  onWordClick?: (word: string, sentence: string) => void;
}

// Get border/bg class based on unclear type
const getUnclearSentenceStyle = (unclearChoice?: string) => {
  const gapInfo = getGapTypeInfo(unclearChoice || "both");
  // Use slightly more vibrant/visible styles for the dark theme
  return `border-l-2 ${gapInfo.cssClasses.border} bg-white/[0.03] pl-4`;
};

// HighlightedText subcomponent
const HighlightedText = ({
  text,
  highlights = [],
  onWordClick,
}: {
  text: string;
  highlights?: string[];
  onWordClick?: (word: string, sentence: string) => void;
}) => {
  if (!highlights || highlights.length === 0) {
    return <span>{text}</span>;
  }

  const pattern = highlights
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const regex = new RegExp(`\\b(${pattern})\\b`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        const isHighlight = highlights.some(
          (h) => h.toLowerCase() === part.toLowerCase(),
        );
        return isHighlight ? (
          <mark
            key={i}
            className="bg-accent-primary/20 text-accent-primary px-1 rounded cursor-pointer hover:bg-accent-primary/40 transition-colors"
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
  studyHighlights = {
    word_clicks: [],
    phrase_clicks: [],
    unclear_sentences: [],
  },
  progress = { studied_count: 0, clear_count: 0 },
  onBack,
  onWordClick,
}: CompletedViewProps) => {
  const { currentEpisode } = usePodcast();
  // Sentence Inspector state
  const [selectedSentence, setSelectedSentence] = useState<string | null>(null);
  const [selectedSentenceInfo, setSelectedSentenceInfo] =
    useState<UnclearSentenceInfo | null>(null);

  const allHighlights = [
    ...(studyHighlights.word_clicks || []),
    ...(studyHighlights.phrase_clicks || []),
  ];

  // Build a map of sentence index -> unclear info for quick lookup
  const unclearMap: Record<number, UnclearSentenceInfo> = {};
  (studyHighlights.unclear_sentences || []).forEach((info) => {
    unclearMap[info.sentence_index] = info;
  });

  const unclearCount = studyHighlights.unclear_sentences?.length || 0;

  const clearRate =
    progress.studied_count > 0
      ? Math.round((progress.clear_count / progress.studied_count) * 100)
      : 0;

  // Handle sentence click for unclear sentences
  const handleSentenceClick = (
    sentence: string,
    unclearInfo: UnclearSentenceInfo,
  ) => {
    setSelectedSentence(sentence);
    setSelectedSentenceInfo(unclearInfo);
  };

  const closeSentenceInspector = () => {
    setSelectedSentence(null);
    setSelectedSentenceInfo(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0f0d] text-white font-sans relative overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0a1418] via-[#0c1815] to-[#0a0f0d] pointer-events-none" />
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-radial from-emerald-900/20 via-transparent to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-gradient-radial from-teal-900/10 via-transparent to-transparent blur-3xl" />
      </div>
      <div
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Header */}
      <header className="relative z-10 h-16 border-b border-white/[0.05] flex items-center justify-between px-6 md:px-8 bg-[#0a0f0d]/80 backdrop-blur-xl">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Back
          </span>
        </button>
        <div className="flex items-center gap-2 px-3 py-1 bg-accent-primary/10 border border-accent-primary/20 rounded-full">
          <CheckCircle className="w-4 h-4 text-accent-primary" />
          <span className="text-[10px] text-accent-primary uppercase tracking-widest font-bold">
            Session Complete
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={`flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 relative z-10 ${currentEpisode ? "pb-32" : ""}`}
      >
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero Stats Section */}
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-primary/10 border border-accent-primary/20 shadow-[0_0_30px_rgba(var(--color-accent-primary-rgb),0.2)] mb-2">
              <Trophy className="w-8 h-8 text-accent-primary" />
            </div>
            <h1 className="font-serif text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight">
              {article?.title}
            </h1>

            {/* Glass Stats Card */}
            <div className="grid grid-cols-3 gap-4 md:gap-8 p-6 md:p-8 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl max-w-2xl mx-auto">
              <div className="text-center space-y-1">
                <div className="text-3xl md:text-4xl font-bold text-white font-serif">
                  {progress.studied_count}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-white/40">
                  Sentences
                </div>
              </div>
              <div className="text-center space-y-1 relative">
                <div className="absolute inset-y-0 -left-4 md:-left-8 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                <div className="text-3xl md:text-4xl font-bold text-accent-primary font-serif">
                  {clearRate}%
                </div>
                <div className="text-[10px] uppercase tracking-widest text-white/40">
                  Clear Rate
                </div>
                <div className="absolute inset-y-0 -right-4 md:-right-8 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
              </div>
              <div className="text-center space-y-1">
                <div className="text-3xl md:text-4xl font-bold text-accent-warning font-serif">
                  {allHighlights.length}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-white/40">
                  Lookups
                </div>
              </div>
            </div>
          </div>

          {/* Unclear Legend */}
          {unclearCount > 0 && (
            <div className="flex flex-wrap justify-center gap-4 text-[10px] font-mono uppercase tracking-widest text-white/50">
              {DIFFICULTY_CHOICES.map((choice) => (
                <div
                  key={choice.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5 bg-white/[0.02]"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${choice.cssClasses.bg.replace("/10", "")} shadow-[0_0_8px_currentColor]`}
                  ></span>
                  <span>{choice.shortLabel}</span>
                </div>
              ))}
            </div>
          )}

          {/* Full Article Review */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000" />
            <div className="relative p-8 md:p-10 bg-[#0a0f0d]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
              <div className="flex items-center gap-2 mb-6 text-xs text-accent-primary font-mono uppercase tracking-widest border-b border-white/5 pb-4">
                <BookMarked className="w-4 h-4" />
                Review Content
              </div>

              <div className="font-serif text-lg leading-loose space-y-6 text-white/80">
                {sentences.map((sentence, idx) => {
                  const sentenceText =
                    typeof sentence === "string" ? sentence : sentence.text;
                  const unclearInfo = unclearMap[idx];
                  const isUnclear = !!unclearInfo;
                  const sentenceClass = isUnclear
                    ? `text-white py-2 px-2 -mx-2 rounded transition-all cursor-pointer hover:bg-white/5 ${getUnclearSentenceStyle(unclearInfo.unclear_choice)}`
                    : "text-white/80";

                  return (
                    <p
                      key={idx}
                      className={sentenceClass}
                      onClick={
                        isUnclear
                          ? () => handleSentenceClick(sentenceText, unclearInfo)
                          : undefined
                      }
                      title={isUnclear ? "Click to see explanation" : undefined}
                    >
                      <HighlightedText
                        text={sentenceText}
                        highlights={allHighlights}
                        onWordClick={onWordClick}
                      />
                    </p>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <button
              onClick={() => {
                window.location.href = `/reading?source_id=${encodeURIComponent(article?.id || "")}`;
              }}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-accent-primary text-black font-bold uppercase tracking-widest text-sm rounded-xl hover:bg-white transition-all shadow-[0_0_20px_rgba(var(--color-accent-primary-rgb),0.3)] hover:shadow-[0_0_30px_rgba(var(--color-accent-primary-rgb),0.5)] active:scale-95"
            >
              <BookMarked className="w-4 h-4" />
              Read Full Article
            </button>
            <button
              onClick={onBack}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-white/5 border border-white/10 text-white font-bold uppercase tracking-widest text-sm rounded-xl hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
            >
              Back to Library
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
