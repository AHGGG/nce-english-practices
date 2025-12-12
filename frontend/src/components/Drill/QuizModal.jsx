import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { fetchQuiz } from '../../api/client';
import { logAttempt } from '../../api/client';

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

        const isCorrect = option.isCorrect || option.is_correct; // adjust based on API response
        // Actually API returns `is_correct` in options usually. 
        // Wait, typical Python Pydantic models use snake_case, JS usually converts if configured but here we use raw.

        if (isCorrect) {
            setFeedback({ type: 'success', message: option.explanation, title: "Correct!" });
            logAttempt('quiz', topic, layer, true, { question: quizData.question_context, answer: option.text });
        } else {
            setFeedback({ type: 'error', message: option.explanation, title: "Incorrect." });
            logAttempt('quiz', topic, layer, false, { question: quizData.question_context, answer: option.text });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                    <h3 className="font-bold text-white capitalize">{layer} · {aspect}</h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
                        aria-label="Close quiz"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <div className="w-8 h-8 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin mb-3"></div>
                            <div className="text-slate-400 font-medium">Generating Drill...</div>
                        </div>
                    )}

                    {error && (
                        <div className="text-red-400 text-center py-4">{error}</div>
                    )}

                    {quizData && (
                        <>
                            <p className="text-lg text-white mb-6 leading-relaxed">
                                {quizData.question_context}
                            </p>
                            <div className="space-y-3">
                                {quizData.options.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleOptionClick(opt)}
                                        disabled={answered}
                                        className={`w-full text-left p-4 rounded-xl border flex items-center gap-3 transition-colors group
                                    ${answered
                                                ? opt.is_correct
                                                    ? 'bg-emerald-500/20 border-emerald-500/50'
                                                    : 'bg-slate-700/50 border-white/5 opacity-60 cursor-not-allowed'
                                                : 'bg-slate-700/50 border-white/5 hover:bg-white/5'
                                            }
                                    ${answered && !opt.is_correct && feedback?.type === 'error' && opt.text === feedback.selected ? 'bg-red-500/20 border-red-500/50 !opacity-100' : ''}
                                `}
                                    >
                                        <span className={`flex-none flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors
                                     ${answered && opt.is_correct ? 'bg-emerald-500 text-white' : 'bg-white/10 group-hover:bg-white/20 text-slate-300'}
                                `}>
                                            {opt.id}
                                        </span>
                                        <span className="text-slate-200 leading-snug">{opt.text}</span>
                                    </button>
                                ))}
                            </div>

                            {feedback && (
                                <div className={`mt-4 p-4 rounded-xl border flex items-start gap-3 text-sm animate-fade-in
                            ${feedback.type === 'success' ? 'bg-slate-800 border-emerald-500/20' : 'bg-slate-800 border-red-500/20'}
                        `}>
                                    {feedback.type === 'success' ?
                                        <CheckCircle className="w-5 h-5 text-emerald-400 flex-none mt-0.5" /> :
                                        <AlertCircle className="w-5 h-5 text-red-400 flex-none mt-0.5" />
                                    }
                                    <div>
                                        <strong className={`block mb-1 ${feedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {feedback.title}
                                        </strong>
                                        <span className="text-slate-300">{feedback.message}</span>
                                    </div>
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
