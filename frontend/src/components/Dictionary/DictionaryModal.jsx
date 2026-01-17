import React, { useEffect, useState, useRef } from 'react';
import { Volume2, Brain, X, Loader2 } from 'lucide-react';
import { lookupDictionary, explainInContext } from '../../api/client';
import DangerousHtml from './DangerousHtml';

const DictionaryModal = ({ isOpen, onClose, word, contextSentence }) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [aiExplanation, setAiExplanation] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);

    useEffect(() => {
        if (isOpen && word) {
            setLoading(true);
            setError(null);
            setData(null);
            setAiExplanation(null);

            lookupDictionary(word)
                .then(res => {
                    setData(res);
                    setLoading(false);
                })
                .catch(err => {
                    setError(err.message || "Failed to load definition");
                    setLoading(false);
                });
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
        // Legacy used SpeechSynthesisUtterance if sound:// url found, 
        // or we can just use Web Speech API directly for the word.
        if (word) {
            const u = new SpeechSynthesisUtterance(word);
            u.lang = 'en-US';
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
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-bg-base/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dict-word"
        >
            <div
                ref={modalRef}
                tabIndex="-1"
                className="bg-light-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-slide-up focus:outline-none"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-3">
                        <h2 id="dict-word" className="text-2xl font-bold text-slate-800 capitalize">{word}</h2>
                        <button
                            onClick={playSound}
                            className="p-2 rounded-full bg-sky-100 text-sky-600 hover:bg-sky-200 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400"
                            title="Listen"
                            aria-label="Listen to pronunciation"
                        >
                            <Volume2 size={20} />
                        </button>
                        {contextSentence && (
                            <button
                                onClick={handleAskAi}
                                disabled={aiLoading}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 ${aiLoading ? 'bg-slate-100 text-slate-400' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}`}
                            >
                                {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
                                {aiLoading ? 'Thinking...' : 'AI Context'}
                            </button>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
                        aria-label="Close"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* AI Context Section */}
                {aiExplanation && (
                    <div className="flex-none p-4 bg-indigo-50 border-b border-indigo-100 text-slate-700 text-sm leading-relaxed border-l-4 border-indigo-500 animate-fade-in">
                        <strong className="block text-indigo-600 text-xs uppercase tracking-wider mb-1">In this context:</strong>
                        {aiExplanation}
                    </div>
                )}

                {/* Content Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-light-surface min-h-0">
                    {loading && (
                        <div className="flex items-center gap-3 text-slate-400">
                            <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
                            Searching dictionary...
                        </div>
                    )}

                    {error && <div className="p-4 bg-accent-danger/10 text-red-600 rounded-xl text-sm">{error}</div>}

                    {data && (
                        <div className="space-y-6">
                            {data.results && data.results.length > 0 ? (
                                data.results.map((entry, idx) => (
                                    <div key={idx} className="group">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                            {entry.dictionary}
                                        </div>
                                        <DangerousHtml
                                            html={entry.definition}
                                        />
                                        {idx < data.results.length - 1 && <hr className="my-6 border-slate-100" />}
                                    </div>
                                ))
                            ) : (
                                <div className="text-slate-400 italic">No definitions found.</div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-400">
                    Data provided by local dictionary & AI
                </div>
            </div>
        </div>
    );
};

export default DictionaryModal;
