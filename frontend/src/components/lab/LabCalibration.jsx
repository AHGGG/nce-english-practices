import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, ArrowRight, Brain, Zap, HelpCircle, BookOpen } from 'lucide-react';
import WordInspector from '../reading/WordInspector';
import MemoizedSentence from '../reading/MemoizedSentence';

/**
 * Proficiency Lab - Calibration Mission
 * "The Placement Test" tailored as a mission.
 */
const LabCalibration = () => {
    // --- State ---
    const [step, setStep] = useState('intro'); // intro, reading, complete
    const [sentences, setSentences] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [results, setResults] = useState([]); // { text, status, words }
    const [isLoading, setIsLoading] = useState(false);
    const [diagnosis, setDiagnosis] = useState(null);

    // Dictionary Inspection State
    const [selectedWord, setSelectedWord] = useState(null);
    const [inspectorData, setInspectorData] = useState(null);
    const [isInspecting, setIsInspecting] = useState(false);

    const [currentLevel, setCurrentLevel] = useState(0);
    const [inspectedWords, setInspectedWords] = useState(new Set()); // V3: Track words clicked per sentence

    // Initial Load
    useEffect(() => {
        fetchSession(0);
    }, []);

    const fetchSession = async (level) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/proficiency/calibration/session?level=${level}&count=5`);
            if (res.ok) {
                const data = await res.json();
                setSentences(data.sentences);
                setCurrentIndex(0);
                setCurrentLevel(level);
                setStep('reading');
            }
        } catch (e) {
            console.error("Failed to load session", e);
            setStep('error');
        }
        setIsLoading(false);
    };

    // --- Handlers ---
    // ... (dictionary handlers unchanged)



    // ... (rest unchanged)

    // --- Dictionary Effect ---
    useEffect(() => {
        if (!selectedWord) return;

        let cancelled = false;
        setIsInspecting(true);

        const fetchData = async () => {
            try {
                // Fetch full dictionary data from LDOCE
                const res = await fetch(`/api/dictionary/ldoce/${encodeURIComponent(selectedWord)}`);
                if (!cancelled && res.ok) {
                    const data = await res.json();
                    setInspectorData(data);
                }
            } catch (e) {
                console.error('Dictionary fetch error:', e);
            } finally {
                if (!cancelled) setIsInspecting(false);
            }
        };

        fetchData();
        return () => { cancelled = true; };
    }, [selectedWord]);

    // --- Handlers ---
    const handleArticleClick = useCallback((e) => {
        const target = e.target;
        const word = target.dataset?.word;

        if (!word) return;

        const cleanWord = word.toLowerCase();
        if (cleanWord.length < 2) return;

        setSelectedWord(cleanWord);
        setInspectorData(null);
        // V3: Track this word inspection
        setInspectedWords(prev => new Set(prev).add(cleanWord));
    }, []);

    const handleMarkAsKnown = async (word) => {
        // Just API call, Lab doesn't need to update highlights visually right now (or could?)
        try {
            await fetch('/api/proficiency/word', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word: word, status: 'mastered' })
            });
            // Optimization: Maybe show a "Saved" toast? For now just close.
        } catch (e) {
            console.error(e);
        }
        setSelectedWord(null);
    };

    const recordAndAdvance = (status) => {
        // Record result with inspected words
        const newEntry = {
            sentence_text: sentences[currentIndex],
            status: status,
            confused_words: Array.from(inspectedWords) // V3: Include all inspected words
        };
        setInspectedWords(new Set()); // Reset for next sentence
        const newResults = [...results, newEntry];
        setResults(newResults);

        // Check if batch is done
        if (currentIndex < sentences.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // Batch Finished. Analyze for Adaptive Loop.
            // V4: Weighted scoring: clear=1, partial=0.5, confused=0
            const batchStartIndex = newResults.length - sentences.length;
            const batchResults = newResults.slice(batchStartIndex);
            let score = 0;
            batchResults.forEach(r => {
                if (r.status === 'clear') score += 1;
                else if (r.status === 'partial') score += 0.5;
                // confused = 0
            });

            // Thresholds: 3.5+ to level-up, <1.5 to level-down
            if (score >= 3.5 && currentLevel < 11) {
                // Level Up!
                setStep('leveling');
                setTimeout(() => {
                    fetchSession(currentLevel + 1);
                }, 1500);
            } else if (score < 1.5 && currentLevel > 0) {
                // Level Down
                setStep('leveling');
                setTimeout(() => {
                    fetchSession(currentLevel - 1);
                }, 1500);
            } else {
                // Calibration complete - this is the user's natural level
                submitCalibration(newResults);
            }
        }
    };

    const submitCalibration = async (finalData) => {
        setStep('processing');
        setIsLoading(true);
        try {
            // 1. Analyze calibration data
            const res = await fetch('/api/proficiency/calibrate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_data: finalData })
            });
            const data = await res.json();
            setDiagnosis(data);

            // 2. Save calibration level
            await fetch('/api/proficiency/calibration/level', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ level: currentLevel })
            });

            setStep('complete');
        } catch (e) {
            console.error(e);
            setStep('error');
        }
        setIsLoading(false);
    };

    // --- Views ---

    if (step === 'intro') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white p-6">
                <div className="max-w-md text-center space-y-6">
                    <div className="w-16 h-16 bg-[#00FF94]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Brain className="w-8 h-8 text-[#00FF94]" />
                    </div>
                    <h1 className="text-3xl font-serif font-bold">Calibration Mission</h1>
                    <p className="text-[#888] font-mono text-sm leading-relaxed">
                        We need to calibrate your neural interface.
                        Read 5 sentences. Tell us if they are <span className="text-[#00FF94]">Clear</span> or <span className="text-[#FF0055]">Confusing</span>.
                    </p>
                    <button
                        onClick={() => setStep('reading')}
                        className="w-full bg-[#E0E0E0] text-black py-4 font-mono font-bold uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2"
                    >
                        START SEQUENCE <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'reading') {
        return (
            <div className="flex flex-col min-h-screen bg-[#050505] text-white">
                {/* Progress */}
                <div className="h-1 bg-[#222]">
                    <div
                        className="h-full bg-[#00FF94] transition-all duration-300"
                        style={{ width: `${((currentIndex + 1) / sentences.length) * 100}%` }}
                    ></div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
                    <span className="font-mono text-xs text-[#666] mb-8 uppercase tracking-widest">
                        Sentence {currentIndex + 1} / {sentences.length}
                    </span>

                    {/* Interactive Sentence */}
                    <div
                        className="font-serif text-2xl md:text-3xl leading-relaxed text-center mb-16 px-4 cursor-pointer"
                        onClick={handleArticleClick}
                    >
                        <MemoizedSentence
                            text={sentences[currentIndex]}
                            showHighlights={false} // No pre-highlights in Lab for now
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3 w-full max-w-lg">
                        <button
                            onClick={() => recordAndAdvance('confused')}
                            className="py-6 border border-[#333] hover:border-[#FF0055] hover:bg-[#FF0055]/10 hover:text-[#FF0055] transition-all flex flex-col items-center gap-2 group"
                        >
                            <X className="w-6 h-6 text-[#666] group-hover:text-[#FF0055]" />
                            <span className="font-mono text-xs font-bold uppercase tracking-wider">Confusing</span>
                        </button>
                        <button
                            onClick={() => recordAndAdvance('partial')}
                            className="py-6 border border-[#333] hover:border-[#FFB800] hover:bg-[#FFB800]/10 hover:text-[#FFB800] transition-all flex flex-col items-center gap-2 group"
                        >
                            <HelpCircle className="w-6 h-6 text-[#666] group-hover:text-[#FFB800]" />
                            <span className="font-mono text-xs font-bold uppercase tracking-wider">Somewhat</span>
                        </button>
                        <button
                            onClick={() => recordAndAdvance('clear')}
                            className="py-6 border border-[#333] hover:border-[#00FF94] hover:bg-[#00FF94]/10 hover:text-[#00FF94] transition-all flex flex-col items-center gap-2 group"
                        >
                            <Check className="w-6 h-6 text-[#666] group-hover:text-[#00FF94]" />
                            <span className="font-mono text-xs font-bold uppercase tracking-wider">Clear</span>
                        </button>
                    </div>
                </div>

                {/* Word Inspector Overlay */}
                <WordInspector
                    selectedWord={selectedWord}
                    inspectorData={inspectorData}
                    isInspecting={isInspecting}
                    onClose={() => setSelectedWord(null)}
                    onPlayAudio={(word) => {
                        const url = `/api/tts?text=${encodeURIComponent(word)}`;
                        new Audio(url).play();
                    }}
                    onMarkAsKnown={handleMarkAsKnown}
                />
            </div>
        );
    }

    if (step === 'leveling') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white">
                <div className="relative mb-8">
                    <div className="w-20 h-20 border-4 border-[#00FF94]/30 rounded-full animate-ping absolute" />
                    <Zap className="w-12 h-12 text-[#00FF94] relative z-10 m-4" />
                </div>
                <h2 className="text-2xl font-serif font-bold mb-2">Adjusting Difficulty</h2>
                <p className="font-mono text-sm text-[#888]">Level {currentLevel + 1}</p>
            </div>
        );
    }

    if (step === 'processing') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white">
                <Brain className="w-12 h-12 text-[#00FF94] animate-pulse mb-4" />
                <p className="font-mono text-xs uppercase tracking-widest text-[#666]">Analyzing Neural Patterns...</p>
            </div>
        );
    }

    if (step === 'complete' && diagnosis) {
        // Calculate band floor based on level (same logic as backend)
        const bandRanges = [
            [0, 1000], [1000, 2000], [2000, 3000], [3000, 4000],
            [4000, 5000], [5000, 6000], [6000, 8000], [8000, 10000],
            [10000, 12500], [12500, 15000], [15000, 17500], [17500, 20000]
        ];
        const suggestedBand = bandRanges[Math.min(currentLevel, bandRanges.length - 1)][0];

        return (
            <div className="min-h-screen bg-[#050505] text-white p-6 overflow-y-auto">
                <div className="max-w-lg mx-auto space-y-8 py-12">
                    <div className="text-center">
                        <h1 className="text-2xl font-serif font-bold text-[#00FF94] mb-2">Calibration Complete</h1>
                        <p className="text-[#888] font-mono text-xs">Your Level: {currentLevel} / 11</p>
                    </div>

                    {/* Calibration Result */}
                    <div className="bg-[#00FF94]/5 border border-[#00FF94]/30 p-4 text-center">
                        <p className="text-sm text-[#888] mb-2">Suggested focus for Reading Mode:</p>
                        <p className="text-2xl font-mono text-[#00FF94]">COCA {suggestedBand}+</p>
                    </div>

                    <div className="bg-[#111] border border-[#333] p-6 space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Vocabulary</h3>
                                <span className="text-[#00FF94] font-mono text-xl">{diagnosis.words_mastered}</span>
                            </div>
                            <div className="h-2 bg-[#222] rounded-full overflow-hidden">
                                <div className="h-full bg-[#00FF94]" style={{ width: `${(currentLevel / 11) * 100}%` }}></div>
                            </div>
                            <p className="text-[#666] text-xs mt-2">Words marked as Mastered from this session.</p>
                        </div>

                        <div className="h-[1px] bg-[#333]"></div>

                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4">Syntax Diagnosis</h3>
                            {diagnosis.syntax_diagnosis?.weaknesses ? (
                                <div className="space-y-4">
                                    <div className="flex gap-2 flex-wrap">
                                        {diagnosis.syntax_diagnosis.weaknesses.map((w, i) => (
                                            <span key={i} className="px-2 py-1 bg-[#FF0055]/10 border border-[#FF0055]/30 text-[#FF0055] text-xs font-mono uppercase">
                                                {w}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-[#CCC] text-sm italic border-l-2 border-[#FF0055] pl-4">
                                        "{diagnosis.syntax_diagnosis.advice}"
                                    </p>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-[#888]">
                                    <Check className="w-4 h-4 text-[#00FF94]" />
                                    <span className="text-sm">No significant syntax gaps detected.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => window.location.href = '/reading'}
                        className="w-full bg-[#00FF94] text-black py-4 font-mono font-bold uppercase tracking-widest hover:bg-[#00FF94]/90 transition-all flex items-center justify-center gap-2"
                    >
                        <BookOpen className="w-4 h-4" />
                        Apply to Reading Mode
                    </button>

                    <button
                        onClick={() => window.location.href = '/'}
                        className="w-full border border-[#333] text-[#E0E0E0] py-4 font-mono font-bold uppercase tracking-widest hover:border-white transition-all"
                    >
                        Return to Library
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

export default LabCalibration;
