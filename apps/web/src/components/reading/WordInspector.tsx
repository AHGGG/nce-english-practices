import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import type { ReactElement, ReactNode } from "react";
import {
  Volume2,
  X,
  Bookmark,
  Loader2,
  Sparkles,
  AlertTriangle,
  Check,
  Brain,
  BookOpen,
  Mic,
  Calendar,
} from "lucide-react";
import DictionaryResults from "../aui/DictionaryResults";
import ReactMarkdown from "react-markdown";
import DangerousHtml from "../Dictionary/DangerousHtml";
import { getWordContexts, getWordUsages } from "../../api/client";

type ActiveTab = "LDOCE" | "Collins" | "USAGES" | "HISTORY";

interface DictionarySourcePayload {
  found?: boolean;
  entries?: unknown[];
  entry?: unknown;
}

interface InspectorData {
  found?: boolean;
  ldoce?: DictionarySourcePayload;
  collins?: DictionarySourcePayload;
}

interface HistoryItem {
  source_type: string;
  source_id?: string | null;
  source_title?: string | null;
  source_label?: string | null;
  created_at: string;
  context_sentence: string;
}

interface WordInspectorProps {
  selectedWord: string | null;
  inspectorData: InspectorData | unknown;
  isInspecting: boolean;
  onClose: () => void;
  onPlayAudio: (word: string) => void;
  onMarkAsKnown: (word: string) => void | Promise<void>;
  currentSentenceContext: string | null;
  contextExplanation?: string;
  isExplaining?: boolean;
  isPhrase?: boolean;
  onExplainStyle?: (style: string) => void;
  currentStyle?: string;
  generatedImage?: string | null;
  isGeneratingImage?: boolean;
  canGenerateImage?: boolean;
  onGenerateImage?: () => void;
}

const markdownComponents: Record<
  string,
  ({ children }: { children?: ReactNode }) => ReactElement
> = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
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
    <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="pl-1 marker:text-accent-primary">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="text-accent-primary font-bold">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="text-accent-warning not-italic">{children}</em>
  ),
  code: ({ children }) => (
    <code className="bg-bg-elevated px-1 rounded text-accent-primary font-mono text-xs">
      {children}
    </code>
  ),
};

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
  // Context for history updates
  currentSentenceContext,
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
}: WordInspectorProps) => {
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const typedInspectorData = (inspectorData || null) as InspectorData | null;
  // Derive default tab from inspectorData (memoized to avoid recalculation)
  const defaultTab = useMemo(() => {
    if (typedInspectorData?.ldoce?.found) return "LDOCE";
    if (typedInspectorData?.collins?.found) return "Collins";
    return "LDOCE";
  }, [typedInspectorData]);

  const [activeTab, setActiveTab] = useState<ActiveTab>(
    defaultTab as ActiveTab,
  );
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [usages, setUsages] = useState<HistoryItem[]>([]);
  const [now] = useState(() => Date.now());

  const scrollContentToTop = useCallback(() => {
    contentScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const sourceBuckets = useMemo(() => {
    const buckets = new Map<string, { label: string; count: number }>();

    for (const item of usages) {
      const label =
        item.source_label ||
        item.source_title ||
        item.source_id ||
        item.source_type.replace(/_/g, " ");
      const key = `${item.source_type}::${item.source_id || label}`;
      const current = buckets.get(key);
      if (current) {
        current.count += 1;
      } else {
        buckets.set(key, { label, count: 1 });
      }
    }

    return Array.from(buckets.values()).sort((a, b) => b.count - a.count);
  }, [usages]);

  const groupedUsages = useMemo(() => {
    const groups = new Map<
      string,
      {
        sourceLabel: string;
        sourceType: string;
        createdAt: string;
        items: HistoryItem[];
      }
    >();

    for (const item of usages) {
      const sourceLabel =
        item.source_title ||
        item.source_label ||
        item.source_id ||
        item.source_type.replace(/_/g, " ");
      const groupKey = `${item.source_type}::${item.source_id || sourceLabel}`;
      const existing = groups.get(groupKey);
      if (existing) {
        existing.items.push(item);
        if (new Date(item.created_at) > new Date(existing.createdAt)) {
          existing.createdAt = item.created_at;
        }
      } else {
        groups.set(groupKey, {
          sourceLabel,
          sourceType: item.source_type,
          createdAt: item.created_at,
          items: [item],
        });
      }
    }

    return Array.from(groups.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [usages]);

  useEffect(() => {
    if (selectedWord) {
      getWordContexts(selectedWord, { limit: 30 })
        .then((res) => {
          if (Array.isArray(res)) {
            setHistory(res as HistoryItem[]);
          }
        })
        .catch(console.error);

      getWordUsages(selectedWord, {
        limit: 10,
        excludeSentence: currentSentenceContext || undefined,
      })
        .then((res) => {
          if (Array.isArray(res)) {
            setUsages(res as HistoryItem[]);
          }
        })
        .catch(console.error);
    }
  }, [selectedWord, currentSentenceContext]);

  // Update tab when data changes (but only if current tab is invalid)
  const effectiveTab = useMemo(() => {
    if (activeTab === "HISTORY") return "HISTORY";
    if (activeTab === "USAGES") return "USAGES";
    if (activeTab === "LDOCE" && typedInspectorData?.ldoce?.found)
      return "LDOCE";
    if (activeTab === "Collins" && typedInspectorData?.collins?.found)
      return "Collins";
    return defaultTab;
  }, [activeTab, typedInspectorData, defaultTab, history]);

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
        <div
          ref={contentScrollRef}
          className="flex-1 overflow-y-auto custom-scrollbar relative z-10 p-1"
        >
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
                  <ReactMarkdown components={markdownComponents}>
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
                      onClick={() => {
                        onExplainStyle("simple");
                        scrollContentToTop();
                      }}
                      className="flex-1 py-2 text-[10px] font-bold font-mono text-white/70 border border-white/10 rounded-lg hover:bg-white/5 hover:text-white transition-colors uppercase flex items-center justify-center gap-1"
                    >
                      <span>Simpler</span>
                    </button>
                  )}
                  {currentStyle !== "chinese_deep" && (
                    <button
                      onClick={() => {
                        onExplainStyle("chinese_deep");
                        scrollContentToTop();
                      }}
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
            ) : typedInspectorData?.found ||
              history.length > 0 ||
              usages.length > 0 ? (
              <div className="flex flex-col h-full">
                {/* Dictionary Tabs */}
                <div className="flex px-4 pt-2 gap-2 shrink-0 z-10 sticky top-0 bg-bg-base/95 backdrop-blur-xl">
                  {typedInspectorData?.ldoce?.found && (
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
                  {typedInspectorData?.collins?.found && (
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
                  <button
                    onClick={() => setActiveTab("USAGES")}
                    className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-all rounded-t-lg border-b-2 ${
                      effectiveTab === "USAGES"
                        ? "text-accent-info border-accent-info bg-accent-info/5"
                        : "text-white/40 border-transparent hover:text-white hover:bg-white/5"
                    }`}
                  >
                    Usages ({usages.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("HISTORY")}
                    className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-all rounded-t-lg border-b-2 ${
                      effectiveTab === "HISTORY"
                        ? "text-accent-info border-accent-info bg-accent-info/5"
                        : "text-white/40 border-transparent hover:text-white hover:bg-white/5"
                    }`}
                  >
                    History ({history.length})
                  </button>
                </div>

                {/* Results */}
                <div className="flex-1 p-4 mt-2">
                  {(effectiveTab === "USAGES" ||
                    effectiveTab === "HISTORY") && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300 px-2">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-[10px] font-mono text-accent-info uppercase tracking-widest flex items-center gap-2">
                          <Brain className="w-3 h-3" />
                          <span>
                            {effectiveTab === "USAGES"
                              ? "Other Usages"
                              : "Lookup History"}
                          </span>
                        </div>
                        <span className="text-[9px] text-white/20 font-mono">
                          {effectiveTab === "USAGES"
                            ? `${usages.length} / 10 CONTEXTS`
                            : `${history.length} ENCOUNTERS`}
                        </span>
                      </div>

                      {effectiveTab === "USAGES" &&
                        sourceBuckets.length > 0 && (
                          <div className="mb-4 rounded-xl border border-white/10 bg-bg-elevated/30 p-3">
                            <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-2">
                              Sources ({sourceBuckets.length})
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {sourceBuckets.map((bucket, idx) => (
                                <span
                                  key={`${bucket.label}-${idx}`}
                                  className="inline-flex items-center gap-1 rounded-full border border-accent-info/30 bg-accent-info/10 px-2 py-1 text-[10px] text-accent-info"
                                  title={bucket.label}
                                >
                                  <span className="max-w-[220px] truncate">
                                    {bucket.label}
                                  </span>
                                  <span className="opacity-70">
                                    x{bucket.count}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                      {effectiveTab === "USAGES" && usages.length === 0 && (
                        <div className="rounded-xl border border-white/10 bg-bg-elevated/20 p-4 text-xs text-white/60">
                          No other usages found yet. Keep reading more articles
                          to build context coverage.
                        </div>
                      )}

                      {effectiveTab === "HISTORY" && history.length === 0 && (
                        <div className="rounded-xl border border-white/10 bg-bg-elevated/20 p-4 text-xs text-white/60">
                          No history yet. Click words/collocations while
                          reading, then reopen this tab.
                        </div>
                      )}

                      <div className="space-y-3">
                        {(effectiveTab === "USAGES"
                          ? groupedUsages.map((group, groupIdx) => ({
                              source_type: group.sourceType,
                              source_title: group.sourceLabel,
                              source_label: group.sourceLabel,
                              source_id: null,
                              created_at: group.createdAt,
                              context_sentence: "",
                              __group: group,
                              __idx: groupIdx,
                            }))
                          : history
                        ).map((item, idx) => {
                          const usageGroup =
                            effectiveTab === "USAGES"
                              ? (
                                  item as HistoryItem & {
                                    __group: {
                                      sourceLabel: string;
                                      sourceType: string;
                                      createdAt: string;
                                      items: HistoryItem[];
                                    };
                                    __idx: number;
                                  }
                                ).__group
                              : null;
                          const date = new Date(item.created_at);
                          const isRecent = now - date.getTime() < 86400000; // 24h

                          return (
                            <div
                              key={idx}
                              className="group relative bg-bg-elevated/50 backdrop-blur-sm rounded-xl border border-white/5 hover:border-accent-info/30 hover:bg-bg-elevated transition-all duration-300 overflow-hidden"
                            >
                              {/* Left Accent Bar */}
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-accent-info/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

                              <div className="p-4 pl-5">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1 rounded bg-white/5 text-accent-info group-hover:bg-accent-info/10 transition-colors">
                                      {item.source_type.includes("epub") ? (
                                        <BookOpen className="w-3 h-3" />
                                      ) : item.source_type.includes(
                                          "podcast",
                                        ) ? (
                                        <Mic className="w-3 h-3" />
                                      ) : (
                                        <Sparkles className="w-3 h-3" />
                                      )}
                                    </div>
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider font-mono">
                                      {item.source_type.replace(/_/g, " ")}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-mono">
                                    <Calendar className="w-2.5 h-2.5 opacity-50" />
                                    <span>
                                      {date.toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </span>
                                    {isRecent && (
                                      <span className="px-1.5 py-0.5 rounded bg-accent-info/10 text-accent-info ml-1 text-[9px]">
                                        NEW
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="mb-3 text-xs text-white/70 font-medium truncate">
                                  {item.source_title ||
                                    item.source_label ||
                                    item.source_id ||
                                    "Unknown Source"}
                                  {usageGroup ? (
                                    <span className="ml-2 text-[10px] text-white/40">
                                      ({usageGroup.items.length} contexts)
                                    </span>
                                  ) : null}
                                </div>

                                {/* Content */}
                                <div className="relative space-y-2">
                                  {(usageGroup ? usageGroup.items : [item]).map(
                                    (usageItem, usageIdx) => (
                                      <div
                                        key={`${idx}-${usageIdx}`}
                                        className="text-sm text-text-secondary leading-relaxed font-serif pl-2 border-l border-white/10 group-hover:border-accent-info/20 transition-colors"
                                      >
                                        <DangerousHtml
                                          html={usageItem.context_sentence.replace(
                                            new RegExp(
                                              `\\b${selectedWord}\\b`,
                                              "gi",
                                            ),
                                            (match) =>
                                              `<strong class="text-accent-info font-bold drop-shadow-[0_0_8px_rgba(var(--color-accent-info-rgb),0.3)]">${match}</strong>`,
                                          )}
                                        />
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {effectiveTab === "LDOCE" &&
                    typedInspectorData?.ldoce?.found && (
                      <DictionaryResults
                        word={selectedWord}
                        source="LDOCE"
                        entries={
                          (typedInspectorData?.ldoce?.entries || []) as never[]
                        }
                      />
                    )}
                  {effectiveTab === "Collins" &&
                    typedInspectorData?.collins?.found && (
                      <DictionaryResults
                        word={selectedWord}
                        source="Collins"
                        entries={
                          typedInspectorData?.collins?.entry
                            ? ([typedInspectorData?.collins?.entry] as never[])
                            : ([] as never[])
                        }
                      />
                    )}
                </div>
              </div>
            ) : typedInspectorData?.found === false ? (
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
            ) : typedInspectorData == null ? (
              <div className="flex flex-col items-center justify-center p-12 text-white/30 space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-accent-primary/20 blur-xl rounded-full animate-pulse" />
                  <Loader2 className="relative w-8 h-8 animate-spin text-accent-primary" />
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] font-mono">
                  Preparing Lookup...
                </span>
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
