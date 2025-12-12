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
        <div className="w-full max-w-4xl mx-auto bg-[#0f172a]/50 backdrop-blur-md rounded-2xl border border-white/10 p-4 md:p-8 shadow-xl mb-20 md:mb-0">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Wait for it...</h3>
                <span className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full text-xs font-bold uppercase tracking-wide">
                    <Trophy size={14} /> Challenge
                </span>
            </div>

            <div className="space-y-6">
                <p className="text-lg text-slate-300 leading-relaxed italic break-words">
                    {scenario.situation}
                </p>

                <div className="bg-indigo-500/10 border-l-4 border-indigo-500 p-4 rounded-r-lg">
                    <strong className="text-indigo-400 block text-xs uppercase tracking-wider mb-1">Goal</strong>
                    <span className="text-slate-200 break-words">{scenario.goal}</span>
                </div>

                <div className="flex flex-col md:flex-row gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={loading}
                        placeholder="Type your response here..."
                        autoComplete="off"
                        aria-label="Your response"
                        className="flex-1 bg-[#0f172a] border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all placeholder-slate-600 disabled:opacity-50"
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !input.trim()}
                        aria-label="Submit response"
                        className="px-6 py-3 bg-sky-400 text-slate-900 font-semibold rounded-xl hover:bg-sky-500 transition-colors shadow-[0_0_20px_rgba(56,189,248,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                        <span className="hidden md:inline">{loading ? 'Checking...' : 'Submit'}</span>
                    </button>
                </div>

                {feedback && (
                    <div
                        className={`mt-4 p-4 rounded-xl border text-sm animate-fade-in ${feedback.is_pass ? 'bg-slate-800 border-emerald-500/20 text-emerald-300' : 'bg-slate-800 border-red-500/20 text-red-300'}`}
                        aria-live="polite"
                    >
                        <strong className="block mb-1 text-base">{feedback.is_pass ? 'Passed!' : 'Needs Improvement'}</strong>
                        <span className="text-slate-300 block mb-2">{feedback.feedback}</span>
                        {feedback.improved_version && (
                            <>
                                <h4 className="mt-2 pt-2 border-t border-white/5 text-slate-400 text-xs uppercase tracking-wider font-bold">Better way:</h4>
                                <div className="text-sky-400 italic">{feedback.improved_version}</div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScenarioCard;
