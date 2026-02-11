import React, { useEffect, useState, useRef } from "react";
import { Volume2, Brain, X, Loader2 } from "lucide-react";
import {
  lookupDictionary,
  explainInContext,
  getWordContexts,
} from "../../api/client";
import DangerousHtml from "./DangerousHtml";

const DictionaryModal = ({ isOpen, onClose, word, contextSentence }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (isOpen && word) {
      setLoading(true);
      setError(null);
      setData(null);
      setAiExplanation(null);
      setHistory([]);

      // Load Dictionary
      lookupDictionary(word)
        .then((res) => {
          setData(res);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message || "Failed to load definition");
          setLoading(false);
        });

      // Load History
      setHistoryLoading(true);
      getWordContexts(word)
        .then((res) => {
          setHistory(res || []);
        })
        .catch(console.error)
        .finally(() => setHistoryLoading(false));
    }
  }, [isOpen, word]);

  const handleAskAi = async () => {
    if (!word || !contextSentence || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await explainInContext(word, contextSentence);
      setAiExplanation(res.explanation);
    } catch {
      setAiExplanation("Failed to get AI explanation.");
    } finally {
      setAiLoading(false);
    }
  };

  const playSound = () => {
    if (word) {
      const u = new SpeechSynthesisUtterance(word);
      u.lang = "en-US";
      window.speechSynthesis.speak(u);
    }
  };

  const modalRef = useRef(null);
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dict-word"
    >
      <div
        ref={modalRef}
        tabIndex="-1"
        className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-2xl shadow-2xl shadow-black/50 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-slide-up focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-glass-border bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <h2
              id="dict-word"
              className="text-2xl font-bold text-text-primary capitalize tracking-tight font-serif"
            >
              {word}
            </h2>
            <button
              onClick={playSound}
              className="p-2 rounded-full text-accent-primary hover:bg-accent-primary/10 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary"
              title="Listen"
              aria-label="Listen to pronunciation"
            >
              <Volume2 size={20} />
            </button>
            {contextSentence && (
              <button
                onClick={handleAskAi}
                disabled={aiLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-accent-primary border ${aiLoading ? "bg-white/5 text-text-muted border-transparent" : "bg-accent-primary/10 text-accent-primary border-accent-primary/20 hover:bg-accent-primary/20"}`}
              >
                {aiLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Brain size={14} />
                )}
                {aiLoading ? "Thinking..." : "AI Context"}
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* AI Context Section */}
        {aiExplanation && (
          <div className="flex-none p-4 bg-accent-primary/5 border-b border-accent-primary/10 text-text-secondary text-sm leading-relaxed border-l-4 border-accent-primary animate-fade-in">
            <strong className="block text-accent-primary text-xs uppercase tracking-wider mb-1">
              In this context:
            </strong>
            {aiExplanation}
          </div>
        )}

        {/* Word History Section */}
        {history && history.length > 0 && (
          <div className="flex-none p-4 bg-white/5 border-b border-white/10 max-h-40 overflow-y-auto custom-scrollbar">
            <strong className="block text-text-muted text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
              <Brain size={12} />
              Your History ({history.length})
            </strong>
            <div className="space-y-3">
              {history.map((item, idx) => (
                <div key={idx} className="text-xs text-text-secondary">
                  <div className="mb-1 text-[10px] text-text-muted flex justify-between">
                    <span>{item.source_type}</span>
                    <span>
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="pl-2 border-l-2 border-accent-primary/30 italic">
                    <DangerousHtml
                      html={item.context_sentence.replace(
                        new RegExp(`\\b${word}\\b`, "gi"),
                        (match) =>
                          `<strong class="text-accent-primary">${match}</strong>`,
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar min-h-0">
          {loading && (
            <div className="flex items-center gap-3 text-text-muted">
              <Loader2 className="w-5 h-5 animate-spin text-accent-primary" />
              Searching dictionary...
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
              {error}
            </div>
          )}

          {data && (
            <div className="space-y-6">
              {data.results && data.results.length > 0 ? (
                data.results.map((entry, idx) => (
                  <div key={idx} className="group">
                    <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 font-mono">
                      {entry.dictionary}
                    </div>
                    {/* DangerousHtml will need dark mode styles injected */}
                    <DangerousHtml
                      html={entry.definition}
                      className="text-text-secondary"
                    />
                    {idx < data.results.length - 1 && (
                      <hr className="my-6 border-white/10" />
                    )}
                  </div>
                ))
              ) : (
                <div className="text-text-muted italic">
                  No definitions found.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-glass-border text-center text-xs text-text-muted font-mono bg-white/[0.02]">
          Data provided by local dictionary & AI
        </div>
      </div>
    </div>
  );
};

export default DictionaryModal;
