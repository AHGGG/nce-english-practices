import React, { useState } from 'react';

const DrillSingle = ({ question, answer, hint, onComplete }) => {
    const [revealed, setRevealed] = useState(false);
    const [userDrillInput, setUserDrillInput] = useState('');
    const [feedback, setFeedback] = useState(null); // 'correct', 'incorrect'

    const checkAnswer = () => {
        if (!userDrillInput.trim()) return;

        // Simple normalization
        const normUser = userDrillInput.trim().toLowerCase().replace(/[.,!?;]/g, '');
        const normAns = answer.trim().toLowerCase().replace(/[.,!?;]/g, '');

        if (normUser === normAns) {
            setFeedback('correct');
            if (onComplete) onComplete(true);
        } else {
            setFeedback('incorrect');
            setRevealed(true);
            if (onComplete) onComplete(false);
        }
    };

    return (
        <div className="p-6 bg-surface-100 border border-ink/10 rounded-lg max-w-2xl mx-auto shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-neon-green font-mono text-sm tracking-widest uppercase">Drill Protocol</h3>
                {hint && <span className="text-xs text-ink/50 bg-ink/5 px-2 py-1 rounded">{hint}</span>}
            </div>

            {/* Question */}
            <div className="mb-6">
                <p className="text-lg md:text-xl font-serif text-ink mb-2">{question}</p>
            </div>

            {/* Input Area */}
            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={userDrillInput}
                    onChange={(e) => {
                        setUserDrillInput(e.target.value);
                        setFeedback(null);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
                    placeholder="Type the answer..."
                    className={`
                        flex-1 bg-surface-200 border-none rounded p-3 text-ink focus:ring-1 outline-none
                        ${feedback === 'correct' ? 'ring-1 ring-neon-green/50 bg-neon-green/5' : ''}
                        ${feedback === 'incorrect' ? 'ring-1 ring-red-400/50 bg-red-400/5' : 'focus:ring-neon-cyan'}
                    `}
                    disabled={feedback === 'correct'}
                />
                <button
                    onClick={checkAnswer}
                    disabled={feedback === 'correct' || !userDrillInput}
                    className="bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 px-4 rounded hover:bg-neon-cyan/20 disabled:opacity-50 disabled:cursor-not-allowed uppercase text-xs font-bold tracking-wider"
                >
                    Check
                </button>
            </div>

            {/* Feedback / Reveal */}
            {(revealed || feedback === 'correct') && (
                <div className={`
                    p-4 rounded border animate-fade-in-up
                    ${feedback === 'correct' ? 'bg-neon-green/5 border-neon-green/20' : 'bg-surface-200 border-ink/10'}
                `}>
                    <p className="text-xs font-mono mb-1 opacity-70">
                        {feedback === 'correct' ? 'MATCH CONFIRMED' : 'REFERENCE ANSWER:'}
                    </p>
                    <p className={`text-lg font-bold ${feedback === 'correct' ? 'text-neon-green' : 'text-ink'}`}>
                        {answer}
                    </p>
                </div>
            )}

            {/* Scramble/Hint Reveal (Optional, future) */}
            {!revealed && feedback !== 'correct' && (
                <button
                    onClick={() => setRevealed(true)}
                    className="text-xs text-ink/40 underline hover:text-ink/60 mt-2"
                >
                    Reveal Answer
                </button>
            )}
        </div>
    );
};

export default DrillSingle;
