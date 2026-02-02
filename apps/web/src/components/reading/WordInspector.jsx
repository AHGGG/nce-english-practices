import React, { useState, useMemo } from "react";
import {
  Volume2,
  X,
  Bookmark,
  Loader2,
  Sparkles,
  AlertTriangle,
  Check,
} from "lucide-react";
import DictionaryResults from "../aui/DictionaryResults";
import ReactMarkdown from "react-markdown";

/**
 * Word Inspector Panel - Shows dictionary definition for selected word
 * Optionally shows streaming LLM context explanation
 */
const WordInspector = ({
  selectedWord,
  inspectorData,
  isInspecting,
  onClose,
  onPlayAudio,
  onMarkAsKnown,
  // New props for streaming context explanation
  contextExplanation = "",
  isExplaining = false,
  isPhrase = false, // True when showing a phrase instead of a single word
  onExplainStyle = () => {}, // Handle style change request
  currentStyle = "default", // default, simple, chinese_deep
  // Image generation props
  generatedImage = null,
  isGeneratingImage = false,
  canGenerateImage = false,
  onGenerateImage = () => {},
}) => {
  // Derive default tab from inspectorData (memoized to avoid recalculation)
  const defaultTab = useMemo(() => {
    if (inspectorData?.ldoce?.found) return "LDOCE";
    if (inspectorData?.collins?.found) return "Collins";
    return "LDOCE";
  }, [inspectorData]);

  const [activeTab, setActiveTab] = useState(defaultTab);

  // Update tab when data changes (but only if current tab is invalid)
  const effectiveTab = useMemo(() => {
    if (activeTab === "LDOCE" && inspectorData?.ldoce?.found) return "LDOCE";
    if (activeTab === "Collins" && inspectorData?.collins?.found)
      return "Collins";
    return defaultTab;
  }, [activeTab, inspectorData, defaultTab]);

  if (!selectedWord) return null;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none flex flex-col justify-end md:justify-center md:items-end md:pr-8">
      {/* Backdrop for mobile only - blurred */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm md:bg-transparent pointer-events-auto"
        onClick={onClose}
      ></div>

      {/* Card - Glassmorphism & Cyber-Noir Style */}
      <div className="pointer-events-auto relative w-full md:w-[420px] bg-bg-base/90 backdrop-blur-xl border-t md:border border-white/10 md:rounded-2xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-10 md:slide-in-from-right-10 duration-300">
        {/* Glow Effects */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent-primary to-transparent opacity-50" />
        <div className="absolute -top-[20%] -right-[20%] w-[60%] h-[40%] bg-accent-primary/10 blur-[80px] rounded-full pointer-events-none" />

        {/* Header */}
        <div className="relative p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02] shrink-0 z-10">
          <div className="flex items-center gap-4">
            <span className="text-2xl font-serif font-bold text-white tracking-tight drop-shadow-sm">
              {selectedWord}
            </span>
            <button
              onClick={() => onPlayAudio(selectedWord)}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-accent-primary hover:text-black text-accent-primary transition-all active:scale-95 border border-white/10 hover:border-transparent"
              title="Play pronunciation"
            >
              <Volume2 className="w-4 h-4 fill-current" />
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Using DictionaryResults */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 p-1">
          {/* Streaming Context Explanation Section */}
          {(contextExplanation || isExplaining) && (
            <div className="m-4 mb-2 p-4 border border-accent-primary/20 bg-accent-primary/5 rounded-xl backdrop-blur-md shadow-inner shadow-accent-primary/5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1 rounded bg-accent-primary/10">
                  <Sparkles className="w-3.5 h-3.5 text-accent-primary" />
                </div>
                <span className="text-[10px] font-bold text-accent-primary uppercase tracking-widest font-mono">
                  {isPhrase ? "Phrase Insight" : "Context AI"}
                </span>
                {isExplaining && (
                  <Loader2 className="w-3 h-3 animate-spin text-accent-primary ml-auto opacity-50" />
                )}
              </div>
              <div className="text-sm text-white/90 leading-relaxed font-sans">
                {contextExplanation ? (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => (
                        <p className="mb-2 last:mb-0">{children}</p>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-sm font-bold text-accent-primary uppercase tracking-wider mt-3 mb-1 first:mt-0">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-xs font-bold text-accent-warning uppercase tracking-wider mt-2 mb-1">
                          {children}
                        </h3>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-4 mb-2 space-y-1">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-4 mb-2 space-y-1">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="pl-1 marker:text-accent-primary">
                          {children}
                        </li>
                      ),
                      strong: ({ children }) => (
                        <strong className="text-accent-primary font-bold">
                          {children}
                        </strong>
                      ),
                      em: ({ children }) => (
                        <em className="text-accent-warning not-italic">
                          {children}
                        </em>
                      ),
                      code: ({ children }) => (
                        <code className="bg-bg-elevated px-1 rounded text-accent-primary font-mono text-xs">
                          {children}
                        </code>
                      ),
                    }}
                  >
                    {contextExplanation}
                  </ReactMarkdown>
                ) : (
                  "Analyzing..."
                )}
              </div>

              {/* Generated Image Section */}
              {(isGeneratingImage || generatedImage || canGenerateImage) && (
                <div className="mt-4 border-t border-accent-primary/20 pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3 h-3 text-accent-warning" />
                    <span className="text-xs text-accent-warning uppercase tracking-wider font-mono">
                      AI Visualization
                    </span>
                  </div>

                  {isGeneratingImage ? (
                    <div className="flex flex-col items-center justify-center py-4 bg-bg-base/20 rounded">
                      <Loader2 className="w-5 h-5 animate-spin text-accent-warning mb-2" />
                      <span className="text-[10px] text-text-muted uppercase font-mono tracking-widest">
                        Generating Image...
                      </span>
                    </div>
                  ) : generatedImage ? (
                    <div className="relative group overflow-hidden rounded border border-border">
                      <img
                        src={generatedImage}
                        alt={`AI visualization for ${selectedWord}`}
                        className="w-full h-auto object-cover max-h-[200px]"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={onGenerateImage}
                      className="w-full py-2 bg-accent-warning/10 border border-accent-warning/30 text-accent-warning hover:bg-accent-warning/20 transition-colors rounded text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-3 h-3" />
                      Generate Visualization
                    </button>
                  )}
                </div>
              )}

              {/* Progressive Actions */}
              {!isExplaining && contextExplanation && (
                <div className="mt-4 flex gap-2 border-t border-white/10 pt-3">
                  {currentStyle !== "simple" && (
                    <button
                      onClick={() => onExplainStyle("simple")}
                      className="flex-1 py-2 text-[10px] font-bold font-mono text-white/70 border border-white/10 rounded-lg hover:bg-white/5 hover:text-white transition-colors uppercase flex items-center justify-center gap-1"
                    >
                      <span>Simpler</span>
                    </button>
                  )}
                  {currentStyle !== "chinese_deep" && (
                    <button
                      onClick={() => onExplainStyle("chinese_deep")}
                      className="flex-1 py-2 text-[10px] font-bold font-mono text-accent-warning border border-accent-warning/20 rounded-lg hover:bg-accent-warning/10 transition-colors uppercase flex items-center justify-center gap-1"
                    >
                      <span>Deep Dive (CN)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dictionary section - show for both single words and phrases */}
          <>
            {isInspecting ? (
              <div className="flex flex-col items-center justify-center p-12 text-white/30 space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-accent-primary/20 blur-xl rounded-full animate-pulse" />
                  <Loader2 className="relative w-8 h-8 animate-spin text-accent-primary" />
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] font-mono">
                  Retrieving Data...
                </span>
              </div>
            ) : inspectorData?.found ? (
              <div className="flex flex-col h-full">
                {/* Dictionary Tabs */}
                <div className="flex px-4 pt-2 gap-2 shrink-0 z-10 sticky top-0">
                  {inspectorData.ldoce?.found && (
                    <button
                      onClick={() => setActiveTab("LDOCE")}
                      className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-lg border-b-2 ${
                        effectiveTab === "LDOCE"
                          ? "text-accent-primary border-accent-primary bg-accent-primary/5"
                          : "text-white/40 border-transparent hover:text-white hover:bg-white/5"
                      }`}
                    >
                      Longman
                    </button>
                  )}
                  {inspectorData.collins?.found && (
                    <button
                      onClick={() => setActiveTab("Collins")}
                      className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-lg border-b-2 ${
                        effectiveTab === "Collins"
                          ? "text-accent-secondary border-accent-secondary bg-accent-secondary/5"
                          : "text-white/40 border-transparent hover:text-white hover:bg-white/5"
                      }`}
                    >
                      Collins
                    </button>
                  )}
                </div>

                {/* Results */}
                <div className="flex-1 p-4 mt-2">
                  {effectiveTab === "LDOCE" && inspectorData.ldoce?.found && (
                    <DictionaryResults
                      word={selectedWord}
                      source="LDOCE"
                      entries={inspectorData.ldoce.entries}
                    />
                  )}
                  {effectiveTab === "Collins" &&
                    inspectorData.collins?.found && (
                      <DictionaryResults
                        word={selectedWord}
                        source="Collins"
                        entries={
                          inspectorData.collins.entry
                            ? [inspectorData.collins.entry]
                            : []
                        }
                      />
                    )}
                </div>
              </div>
            ) : inspectorData?.found === false ? (
              <div className="flex flex-col items-center justify-center p-12 text-white/40">
                <div className="p-4 rounded-full bg-white/5 mb-4">
                  <X className="w-8 h-8 opacity-50" />
                </div>
                <p className="text-lg font-serif text-white/60 mb-2">
                  Word not found
                </p>
                <p className="text-xs font-mono text-center max-w-[200px]">
                  "{selectedWord}" is not in our dictionaries.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-accent-danger/70">
                <AlertTriangle className="w-8 h-8 mb-4 opacity-50" />
                <span className="text-xs font-mono uppercase tracking-widest">
                  Connection Error
                </span>
              </div>
            )}
          </>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02] shrink-0 flex gap-3 backdrop-blur-xl">
          <button
            onClick={() => onMarkAsKnown(selectedWord)}
            className="flex-1 py-3.5 rounded-xl border border-white/10 text-white/60 font-mono text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/5 hover:text-white hover:border-white/20 transition-all active:scale-95 group"
          >
            <Check className="w-4 h-4 text-accent-primary opacity-50 group-hover:opacity-100" />
            Mark Known
          </button>
          <button className="flex-[1.5] py-3.5 rounded-xl bg-accent-primary text-black font-mono text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-accent-primary/90 shadow-[0_0_20px_rgba(var(--color-accent-primary-rgb),0.3)] hover:shadow-[0_0_30px_rgba(var(--color-accent-primary-rgb),0.5)] transition-all active:scale-95">
            <Bookmark className="w-4 h-4 fill-current" />
            Add to Review
          </button>
        </div>
      </div>
    </div>
  );
};

export default WordInspector;
