import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import { fetchQuiz } from '../../api/client';
import { logAttempt } from '../../api/client';
import { Button } from '../ui'; // Expanding usage of our UI lib

const QuizModal = ({ isOpen, onClose, topic, layer, aspect, sentence }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [quizData, setQuizData] = useState(null);
    const [answered, setAnswered] = useState(false);
    const [feedback, setFeedback] = useState(null);

    useEffect(() => {
        if (isOpen && sentence) {
            setLoading(true);
            setError(null);
            setQuizData(null);
            setAnswered(false);
            setFeedback(null);

            fetchQuiz(topic, layer, aspect, sentence)
                .then(data => {
                    setQuizData(data);
                    setLoading(false);
                })
                .catch(err => {
                    setError(err.message || 'Failed to load quiz');
                    setLoading(false);
                });
        }
    }, [isOpen, sentence, topic, layer, aspect]);

    const handleOptionClick = (option) => {
        if (answered) return;
        setAnswered(true);

        const isCorrect = option.isCorrect || option.is_correct;

        if (isCorrect) {
            setFeedback({ type: 'success', message: option.explanation, title: "CORRECT" });
            logAttempt('quiz', topic, layer, true, { question: quizData.question_context, answer: option.text });
        } else {
            setFeedback({ type: 'error', message: option.explanation, title: "INCORRECT" });
            logAttempt('quiz', topic, layer, false, { question: quizData.question_context, answer: option.text });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-grayscale p-4 animate-fade-in">
            <div className="w-full max-w-lg bg-bg border border-ink shadow-hard overflow-hidden relative">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-ink bg-bg-paper">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-neon-pink animate-pulse"></div>
                        <h3 className="font-mono font-bold text-ink uppercase tracking-wider">{layer} // {aspect}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-ink-muted hover:text-neon-pink transition-colors p-1"
                        aria-label="Close quiz"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-8 gap-4">
                            <div className="w-12 h-12 border-4 border-ink-faint border-t-neon-green rounded-none animate-spin"></div>
                            <div className="text-neon-green font-mono text-sm tracking-widest animate-pulse">INITIALIZING DRILL...</div>
                        </div>
                    )}

                    {error && (
                        <div className="text-neon-pink font-mono text-center py-4 border border-neon-pink p-4 bg-neon-pink/5">
                            [ERROR]: {error}
                        </div>
                    )}

                    {quizData && (
                        <>
                            <div className="mb-8 font-serif text-xl text-white leading-relaxed border-l-2 border-neon-green pl-4">
                                {quizData.question_context}
                            </div>

                            <div className="space-y-3 font-mono">
                                {quizData.options.map((opt, idx) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleOptionClick(opt)}
                                        disabled={answered}
                                        className={`w-full text-left p-4 border flex items-center gap-4 transition-all group relative overflow-hidden
                                    ${answered
                                                ? opt.is_correct
                                                    ? 'bg-neon-green/10 border-neon-green text-neon-green'
                                                    : 'bg-bg-elevated border-ink-faint text-ink-muted opacity-50'
                                                : 'bg-bg hover:bg-white/5 border-ink-faint hover:border-ink text-ink'
                                            }
                                    ${answered && !opt.is_correct && feedback?.type === 'error' && opt.text === feedback.selected ? 'bg-neon-pink/10 border-neon-pink text-neon-pink !opacity-100' : ''}
                                `}
                                    >
                                        <span className={`flex-none flex items-center justify-center w-6 h-6 text-xs font-bold border transition-colors
                                     ${answered && opt.is_correct ? 'bg-neon-green text-black border-neon-green' : 'bg-transparent border-ink-muted text-ink-muted group-hover:border-ink group-hover:text-ink'}
                                `}>
                                            {String.fromCharCode(65 + idx)}
                                        </span>
                                        <span className="leading-snug">{opt.text}</span>

                                        {/* Corner Decorations */}
                                        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-current opacity-50"></div>
                                        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-current opacity-50"></div>
                                    </button>
                                ))}
                            </div>

                            {feedback && (
                                <div className={`mt-6 p-4 border flex items-start gap-4 animate-fade-in
                            ${feedback.type === 'success' ? 'bg-neon-green/5 border-neon-green text-neon-green' : 'bg-neon-pink/5 border-neon-pink text-neon-pink'}
                        `}>
                                    {feedback.type === 'success' ?
                                        <CheckCircle className="w-5 h-5 flex-none mt-0.5" /> :
                                        <AlertTriangle className="w-5 h-5 flex-none mt-0.5" />
                                    }
                                    <div>
                                        <strong className="block mb-1 font-mono uppercase tracking-widest text-xs">
                                            {feedback.title}
                                        </strong>
                                        <span className="font-sans text-sm text-ink">{feedback.message}</span>
                                    </div>

                                    {/* Next Button Hint */}
                                    {feedback.type === 'success' && (
                                        <button onClick={onClose} className="ml-auto text-xs underline font-mono hover:text-white">
                                            CONTINUE_
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuizModal;
