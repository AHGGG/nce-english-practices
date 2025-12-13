import React, { useState } from 'react';
import { Trophy, Send, Loader2 } from 'lucide-react';
import { gradeScenario } from '../../api/client';
import { logAttempt } from '../../api/client';

const ScenarioCard = ({ scenario, layer }) => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const handleSubmit = async () => {
        if (!input.trim() || loading) return;

        setLoading(true);
        setFeedback(null);

        try {
            const result = await gradeScenario(scenario.situation, scenario.goal, input, layer);
            setFeedback(result);
            logAttempt('scenario', scenario.topic, layer, result.is_pass, { input, feedback: result.feedback });
        } catch (err) {
            console.error(err);
            setFeedback({ is_pass: false, feedback: "Error submitting response." });
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSubmit();
    };

    if (!scenario) return <div className="text-slate-500">Loading scenario...</div>;

    return (
        <div className="w-full max-w-4xl mx-auto bg-bg-paper border border-ink-faint shadow-hard p-6 md:p-8 mb-20 md:mb-0 relative overflow-hidden group">
            {/* Decorative Corner */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-neon-cyan/20 to-transparent pointer-events-none"></div>

            <div className="flex items-center justify-between mb-8 border-b border-ink-faint pb-4">
                <h3 className="text-2xl font-serif font-bold text-ink">Mission Challenge</h3>
                <span className="flex items-center gap-2 px-3 py-1 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan rounded-none text-xs font-mono font-bold uppercase tracking-widest">
                    <Trophy size={14} /> Active
                </span>
            </div>

            <div className="space-y-8">
                <div className="relative pl-6 border-l-2 border-neon-purple">
                    <p className="text-xl text-ink leading-relaxed font-serif italic">
                        "{scenario.situation}"
                    </p>
                </div>

                <div className="bg-bg-elevated border border-ink-faint p-6 relative">
                    <div className="absolute -top-3 left-4 bg-bg px-2 text-xs font-mono font-bold text-neon-cyan uppercase tracking-widest border border-ink-faint">
                        Objective
                    </div>
                    <span className="text-ink font-mono tracking-tight leading-relaxed block mt-2">{scenario.goal}</span>
                </div>

                <div className="flex flex-col md:flex-row gap-0 border border-ink-faint shadow-hard focus-within:border-neon-cyan transition-colors">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={loading}
                        placeholder=">> TYPE RESPONSE HERE..."
                        autoComplete="off"
                        aria-label="Your response"
                        className="flex-1 bg-bg text-ink placeholder-ink-muted px-4 py-4 focus:outline-none font-mono text-lg disabled:opacity-50"
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !input.trim()}
                        aria-label="Submit response"
                        className="px-8 py-4 bg-neon-cyan text-black font-bold uppercase tracking-wider hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center border-l border-ink-faint"
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                        <span className="hidden md:inline font-mono">{loading ? 'PROCESSING...' : 'TRANSMIT'}</span>
                    </button>
                </div>

                {feedback && (
                    <div
                        className={`mt-4 p-6 border text-sm animate-fade-in font-mono ${feedback.is_pass ? 'bg-neon-green/5 border-neon-green text-neon-green' : 'bg-neon-pink/5 border-neon-pink text-neon-pink'}`}
                        aria-live="polite"
                    >
                        <div className="flex items-center gap-2 mb-2 border-b border-current pb-2 opacity-80">
                            {feedback.is_pass ? <Trophy size={18} /> : <div className="w-4 h-4 bg-current" />}
                            <strong className="text-base uppercase tracking-widest">{feedback.is_pass ? 'PASSED' : 'FAILED'}</strong>
                        </div>

                        <span className="block mb-4 text-ink leading-relaxed font-sans">{feedback.feedback}</span>
                        {feedback.improved_version && (
                            <>
                                <h4 className="mt-2 text-xs uppercase tracking-widest font-bold opacity-70 mb-1">// OPTIMIZED OUTPUT:</h4>
                                <div className="text-ink font-serif italic border-l-2 border-current pl-3 py-1 bg-white/5">{feedback.improved_version}</div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScenarioCard;
