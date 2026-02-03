/**
 * OverviewView - Article Overview before studying
 * Shows summary, Chinese translation, key topics, and difficulty hint
 */
import React from "react";
import { ChevronLeft, BookOpen, Loader2, GraduationCap } from "lucide-react";
import { usePodcast } from "../../../context/PodcastContext";

const OverviewView = ({
  article,
  overview,
  overviewStreamContent = "",
  onBack,
  onStartStudying,
}) => {
  const { currentEpisode } = usePodcast();
  const sentenceCount =
    article?.sentence_count || article?.sentences?.length || 0;

  // Helper to extract fields from partial JSON string
  const parsePartialJSON = (jsonStr) => {
    if (!jsonStr) return null;
    const result = {};

    const extractField = (key) => {
      // Match key and opening quote: "key": "
      const regex = new RegExp(`"${key}"\\s*:\\s*"`, "g");
      const match = regex.exec(jsonStr);
      if (!match) return null;

      const startIndex = match.index + match[0].length;
      let content = "";
      let isEscaped = false;

      for (let i = startIndex; i < jsonStr.length; i++) {
        const char = jsonStr[i];
        if (isEscaped) {
          content += char;
          isEscaped = false;
          continue;
        }
        if (char === "\\") {
          isEscaped = true;
          continue; // Skip the backslash itself
        }
        if (char === '"') {
          break; // Found closing quote
        }
        content += char;
      }
      return content;
    };

    result.summary_en = extractField("summary_en");
    result.summary_zh = extractField("summary_zh");

    // Simple array extraction for key_topics is harder, skipping for streaming
    // Only streaming text fields is critical

    return result;
  };

  const partialOverview = parsePartialJSON(overviewStreamContent);
  const displayOverview =
    overview || (partialOverview?.summary_en ? partialOverview : null);
  const isStreaming = !overview && !!overviewStreamContent;

  return (
    <div className="h-screen flex flex-col bg-[#0a0f0d] text-white font-sans relative overflow-hidden">
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
      <header className="relative z-10 h-14 md:h-16 border-b border-white/[0.05] flex items-center justify-between px-4 md:px-8 bg-[#0a0f0d]/80 backdrop-blur-xl">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Back
          </span>
        </button>
        <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest border border-white/10 px-3 py-1 rounded-full">
          {sentenceCount} Sentences
        </div>
      </header>

      {/* Main Content */}
      <main
        className={`relative z-10 flex-1 overflow-y-auto custom-scrollbar p-4 md:p-12 ${currentEpisode ? "pb-32" : ""}`}
      >
        <div className="max-w-3xl w-full mx-auto">
          {/* Article Title */}
          <div className="mb-8 md:mb-10 text-center">
            <h1 className="font-serif text-2xl md:text-5xl font-bold text-white tracking-tight leading-tight mb-4 drop-shadow-2xl px-2">
              {article?.title}
            </h1>
            <div className="h-1 w-24 bg-accent-primary/30 mx-auto rounded-full" />
          </div>

          {!displayOverview ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white/[0.02] border border-white/5 rounded-2xl">
              <Loader2 className="w-10 h-10 animate-spin text-accent-primary mb-6" />
              <p className="text-white/40 font-mono text-xs uppercase tracking-widest animate-pulse">
                {overviewStreamContent
                  ? "Generating Overview..."
                  : "Analyzing Article Context..."}
              </p>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-700">
              {/* English Summary */}
              <div
                className={`p-8 border border-white/10 bg-white/[0.02] backdrop-blur-md rounded-2xl shadow-xl transition-all duration-500 hover:border-white/20 ${isStreaming ? "border-t-accent-primary/50 shadow-[0_-5px_20px_-5px_rgba(var(--color-accent-primary-rgb),0.1)]" : ""}`}
              >
                <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                  <div
                    className={`p-2 rounded-lg bg-accent-primary/10 ${isStreaming ? "animate-pulse" : ""}`}
                  >
                    <BookOpen className="w-5 h-5 text-accent-primary" />
                  </div>
                  <span className="text-sm font-bold text-accent-primary uppercase tracking-widest">
                    Executive Summary
                  </span>
                </div>
                <p className="font-serif text-lg md:text-xl leading-loose text-white/90">
                  {displayOverview.summary_en ||
                    (isStreaming && (
                      <span className="animate-pulse opacity-50">
                        Analyzing content structure...
                      </span>
                    ))}
                  {isStreaming && !displayOverview.summary_zh && (
                    <span className="inline-block w-2 h-5 ml-1 bg-accent-primary animate-pulse align-middle" />
                  )}
                </p>
              </div>

              {/* Chinese Translation */}
              {(displayOverview.summary_zh || isStreaming) && (
                <div className="p-6 md:p-8 border border-white/5 bg-black/20 rounded-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                      Chinese Translation
                    </span>
                  </div>
                  <p className="text-sm md:text-lg leading-loose text-white/60 font-light text-justify">
                    {displayOverview.summary_zh}
                    {isStreaming && displayOverview.summary_zh && (
                      <span className="inline-block w-2 h-5 ml-1 bg-white/40 animate-pulse align-middle" />
                    )}
                  </p>
                </div>
              )}

              {/* Key Topics */}
              {displayOverview.key_topics?.length > 0 && (
                <div className="flex flex-wrap gap-3 justify-center py-4">
                  {displayOverview.key_topics.map((topic, i) => (
                    <span
                      key={i}
                      className="px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-white/60 rounded-lg hover:text-white hover:bg-white/10 hover:border-white/20 transition-all cursor-default"
                    >
                      #{topic}
                    </span>
                  ))}
                </div>
              )}

              {/* Difficulty Hint */}
              {displayOverview.difficulty_hint && (
                <div className="flex flex-col md:flex-row items-center justify-center gap-3 text-xs font-mono text-accent-warning/80 bg-accent-warning/5 py-3 px-6 rounded-2xl border border-accent-warning/10 mx-auto w-full md:w-fit max-w-2xl text-center md:text-left">
                  <span className="text-xl shrink-0">💡</span>
                  <span className="leading-relaxed">
                    {displayOverview.difficulty_hint}
                  </span>
                </div>
              )}

              {/* Start Button */}
              {!isStreaming && (
                <div className="flex justify-center pt-4 md:pt-8 pb-12 sticky bottom-0 md:relative w-full bg-gradient-to-t from-[#0a0f0d] via-[#0a0f0d]/90 to-transparent md:bg-none p-4 md:p-0 z-20">
                  <button
                    onClick={onStartStudying}
                    className="group relative flex items-center justify-center gap-3 w-full md:w-auto px-8 py-4 md:px-12 md:py-5 bg-accent-primary text-black font-bold uppercase text-sm tracking-widest rounded-xl hover:bg-white transition-all shadow-[0_0_20px_rgba(var(--color-accent-primary-rgb),0.3)] hover:shadow-[0_0_40px_rgba(var(--color-accent-primary-rgb),0.5)] hover:-translate-y-1 active:scale-95 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                    <GraduationCap className="w-5 h-5 relative z-10" />
                    <span className="relative z-10">Start Deep Study</span>
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
