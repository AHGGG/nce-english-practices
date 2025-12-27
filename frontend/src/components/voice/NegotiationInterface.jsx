import React, { useState, useEffect, useRef } from 'react';
import { Volume2, HelpCircle, ArrowRight, Eye, EyeOff, Play, BookOpen, Languages, SkipForward, ChevronLeft, ChevronRight, Gauge, Layers } from 'lucide-react';

const NegotiationInterface = () => {
    const [sessionId, setSessionId] = useState(`session-${Date.now()}`);
    const [currentText, setCurrentText] = useState("The ubiquity of smartphones has changed how we communicate.");
    const [isTextVisible, setIsTextVisible] = useState(false);
    const [step, setStep] = useState('original');
    const [isLoading, setIsLoading] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);

    // Scaffolding tracking
    const [scaffoldUsed, setScaffoldUsed] = useState(false);
    const [needsContext, setNeedsContext] = useState(false);
    const [sourceWord, setSourceWord] = useState('');
    const [definition, setDefinition] = useState('');
    const [translation, setTranslation] = useState('');
    const [contextScenario, setContextScenario] = useState('');
    const [isContextLoading, setIsContextLoading] = useState(false);

    // Scaffold visibility
    const [showDefinition, setShowDefinition] = useState(false);
    const [showTranslation, setShowTranslation] = useState(false);

    // Step history for back navigation
    const [stepHistory, setStepHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Playback speed (1.0 = normal, 0.75 = slow, 0.5 = very slow)
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

    // Multi-example navigation
    const [wordExamples, setWordExamples] = useState(null);  // WordExampleSet from API
    const [currentSenseIndex, setCurrentSenseIndex] = useState(0);
    const [currentExampleIndex, setCurrentExampleIndex] = useState(0);

    // Book selection
    const [books, setBooks] = useState([]);
    const [selectedBook, setSelectedBook] = useState('');

    // Voices ref to store loaded voices
    const voicesRef = useRef([]);

    // Load voices and books on mount
    useEffect(() => {
        const loadVoices = () => {
            voicesRef.current = window.speechSynthesis.getVoices();
            console.log('Voices loaded:', voicesRef.current.length);
        };

        const fetchBooks = async () => {
            try {
                const res = await fetch('/api/books/');
                if (res.ok) {
                    const data = await res.json();
                    setBooks(data);
                    // Default to first book if available (e.g. CET4), or keep empty for mixed
                    // If we want "Random Mix" as default, leave it empty.
                    // If we want to nudge user to a book, select first.
                    // Let's leave it empty (Random Mix) by default, or better: select nothing
                }
            } catch (e) {
                console.error("Failed to fetch books", e);
            }
        };

        loadVoices();
        fetchBooks();

        // Chrome requires this event listener
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    const getContentUrl = () => {
        return selectedBook
            ? `/api/negotiation/next-content?book=${selectedBook}`
            : '/api/negotiation/next-content';
    };

    // Speak function using server-side TTS with caching
    const audioRef = useRef(null);
    const audioCacheRef = useRef({}); // Cache: { textHash -> audioUrl }

    // Simple hash for cache key
    const hashText = (text) => text.slice(0, 50) + '_' + text.length;

    const speak = async (text, langHint = 'en') => {
        if (!text) return;

        // Stop any previous audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        setIsSpeaking(true);

        const cacheKey = hashText(text);

        try {
            let audioUrl;

            // Check cache first
            if (audioCacheRef.current[cacheKey]) {
                audioUrl = audioCacheRef.current[cacheKey];
            } else {
                // Fetch from TTS API
                const response = await fetch(`/api/tts?text=${encodeURIComponent(text)}`);

                if (!response.ok) {
                    throw new Error('TTS request failed');
                }

                const audioBlob = await response.blob();
                audioUrl = URL.createObjectURL(audioBlob);

                // Cache the audio URL
                audioCacheRef.current[cacheKey] = audioUrl;
            }

            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            // Apply playback speed
            audio.playbackRate = playbackSpeed;

            audio.onended = () => {
                setIsSpeaking(false);
                // Don't revoke URL since it's cached
            };

            audio.onerror = (e) => {
                console.error('Audio playback error:', e);
                setIsSpeaking(false);
            };

            await audio.play();

        } catch (e) {
            console.error('TTS error:', e);
            setIsSpeaking(false);
            // Fallback to browser TTS
            fallbackSpeak(text, langHint);
        }
    };

    // Fallback to browser TTS if server fails
    const fallbackSpeak = (text, langHint = 'en') => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);

        const voices = voicesRef.current.length > 0
            ? voicesRef.current
            : window.speechSynthesis.getVoices();

        if (langHint === 'cn') {
            const cnVoice = voices.find(v => v.lang.startsWith('zh'));
            if (cnVoice) utterance.voice = cnVoice;
        } else {
            const enVoice = voices.find(v => v.lang.startsWith('en-US')) || voices.find(v => v.lang.startsWith('en'));
            if (enVoice) utterance.voice = enVoice;
        }

        utterance.rate = 0.9;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    // Start button handler - this is the USER GESTURE that unlocks audio
    const handleStart = async () => {
        setHasStarted(true);
        setIsLoading(true);

        try {
            // Fetch real content from dictionary
            const contentRes = await fetch(getContentUrl());
            let content = { text: "The ubiquity of smartphones has changed how we communicate.", source_word: "ubiquity", definition: "", translation: "" };

            if (contentRes.ok) {
                content = await contentRes.json();
                setCurrentText(content.text);
                setSourceWord(content.source_word || '');
                setDefinition(content.definition || '');
                setTranslation(content.translation || '');

                // Also fetch all examples for this word
                if (content.source_word) {
                    fetchWordExamples(content.source_word);
                }
            }

            // Just speak the content - don't call /interact yet
            // The first /interact call will happen when user clicks HUH? or CONTINUE
            speak(content.text);
            setStep('original');
            setNeedsContext(true); // First interaction needs to pass context

            // Trigger initial context generation
            setContextScenario('');
            if (content.source_word && content.definition) {
                fetchContextScenario(content.source_word, content.definition, content.text);
            }

        } catch (e) {
            console.error(e);
            // Fallback: speak the initial text anyway
            speak(currentText);
        }
        setIsLoading(false);
    };

    const handleInteraction = async (intention) => {
        setIsLoading(true);
        try {
            // Build request body
            const requestBody = {
                session_id: sessionId,
                user_intention: intention
            };

            // If we need context (new session after finalize), include it
            if (needsContext) {
                // Get current sense and example data for rich context
                const senses = wordExamples?.entries?.flatMap(e => e.senses) || [];
                const currentSense = senses[currentSenseIndex];
                const currentExample = currentSense?.examples[currentExampleIndex];

                requestBody.context = {
                    target_content: currentText,
                    source_type: "dictionary",
                    // Rich context fields
                    definition: definition || currentSense?.definition || "",
                    part_of_speech: currentSense?.grammar_pattern || "unknown", // Using grammar_pattern as proxy for POS/Pattern
                    translation_hint: translation || currentExample?.translation || ""
                };
                setNeedsContext(false); // Reset flag
            }

            const res = await fetch('/api/negotiation/interact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            const data = await res.json();
            handleResponse(data);
        } catch (e) {
            console.error(e);
        }
        setIsLoading(false);
    };

    const handleResponse = (data) => {
        // Save current state to history before changing (for back navigation)
        // Include sense/example indices for complete state restoration
        const currentState = {
            text: currentText,
            step,
            sourceWord,
            definition,
            translation,
            senseIndex: currentSenseIndex,
            exampleIndex: currentExampleIndex
        };

        // Create new state from response (HUH generates simplified text, not from example set)
        const newState = {
            text: data.audio_text,
            step: data.next_step,
            sourceWord,
            definition,
            translation,
            senseIndex: currentSenseIndex,  // Keep same position
            exampleIndex: currentExampleIndex
        };

        // Add both old and new states to history (truncate any forward history first)
        setStepHistory(prev => [...prev.slice(0, historyIndex + 1), currentState, newState]);
        setHistoryIndex(prev => prev + 2); // Move to the new state position

        setCurrentText(data.audio_text);
        setStep(data.next_step);

        // Determine language hint for TTS
        const langHint = data.next_step === 'explain_cn' ? 'cn' : 'en';
        speak(data.audio_text, langHint);

        if (data.next_step === 'original') {
            setIsTextVisible(false);
            setScaffoldUsed(false);
            // Reset scaffolds for new word
            setShowDefinition(false);
            setShowTranslation(false);
            // Reset history for new sentence
            setStepHistory([]);
            setHistoryIndex(-1);
            // Session was finalized, generate a new session ID for next round
            setSessionId(`session-${Date.now()}`);
            // Fetch REAL content from dictionary
            fetchNextContent();
            setNeedsContext(true); // Flag that next request needs context
        }
    };

    // Go back to previous step in history
    const handleGoBack = () => {
        if (historyIndex > 0) {
            const prevState = stepHistory[historyIndex - 1];
            setHistoryIndex(prev => prev - 1);
            setCurrentText(prevState.text);
            setStep(prevState.step);
            setDefinition(prevState.definition || '');
            setTranslation(prevState.translation || '');
            // Restore sense/example position
            if (prevState.senseIndex !== undefined) setCurrentSenseIndex(prevState.senseIndex);
            if (prevState.exampleIndex !== undefined) setCurrentExampleIndex(prevState.exampleIndex);
            speak(prevState.text, prevState.step === 'explain_cn' ? 'cn' : 'en');
        } else if (historyIndex === 0) {
            // Go back to original
            const originalState = stepHistory[0];
            setCurrentText(originalState.text);
            setStep('original');
            setDefinition(originalState.definition || '');
            setTranslation(originalState.translation || '');
            if (originalState.senseIndex !== undefined) setCurrentSenseIndex(originalState.senseIndex);
            if (originalState.exampleIndex !== undefined) setCurrentExampleIndex(originalState.exampleIndex);
            speak(originalState.text);
        }
    };

    // Go forward in history (after going back)
    const handleGoForward = () => {
        if (historyIndex < stepHistory.length - 1) {
            const nextState = stepHistory[historyIndex + 1];
            setHistoryIndex(prev => prev + 1);
            setCurrentText(nextState.text);
            setStep(nextState.step);
            setDefinition(nextState.definition || '');
            setTranslation(nextState.translation || '');
            // Restore sense/example position
            if (nextState.senseIndex !== undefined) setCurrentSenseIndex(nextState.senseIndex);
            if (nextState.exampleIndex !== undefined) setCurrentExampleIndex(nextState.exampleIndex);
            speak(nextState.text, nextState.step === 'explain_cn' ? 'cn' : 'en');
        }
    };

    // Check if can go forward
    const canGoForward = historyIndex >= 0 && historyIndex < stepHistory.length - 1;

    // Skip current sentence, get a new one
    const handleSkip = async () => {
        setIsLoading(true);
        // Reset history
        setStepHistory([]);
        setHistoryIndex(-1);
        setStep('original');
        setIsTextVisible(false);
        setScaffoldUsed(false);
        setShowDefinition(false);
        setShowTranslation(false);
        // Generate new session ID
        setSessionId(`session-${Date.now()}`);
        // Fetch new content
        await fetchNextContent();
        setNeedsContext(true);
        setIsLoading(false);
    };

    // Toggle playback speed
    const toggleSpeed = () => {
        setPlaybackSpeed(prev => {
            if (prev === 1.0) return 0.75;
            if (prev === 0.75) return 0.5;
            return 1.0;
        });
    };

    // Fetch real content from the ContentFeeder API
    const fetchNextContent = async () => {
        try {
            const res = await fetch(getContentUrl());
            if (res.ok) {
                const data = await res.json();
                setCurrentText(data.text);
                setSourceWord(data.source_word || '');
                setDefinition(data.definition || '');
                setTranslation(data.translation || '');
                // Reset scaffold visibility
                setShowDefinition(false);
                setShowTranslation(false);

                // Also fetch all examples for this word
                if (data.source_word) {
                    fetchWordExamples(data.source_word);
                }

                // Speak the new content
                speak(data.text);

                // Trigger context generation
                setContextScenario(''); // Clear previous
                if (data.source_word && data.definition) {
                    fetchContextScenario(data.source_word, data.definition, data.text);
                }
            }
        } catch (e) {
            console.error('Failed to fetch next content:', e);
            // Fallback
            setCurrentText("She has been studying all day.");
        }
    };

    // Fetch context scenario from backend
    const fetchContextScenario = async (word, def, sentence) => {
        if (!word || !def || !sentence) return;

        setIsContextLoading(true);
        try {
            const res = await fetch('/api/negotiation/context', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    word: word,
                    definition: def,
                    target_sentence: sentence
                })
            });

            if (res.ok) {
                const data = await res.json();
                setContextScenario(data.scenario);
            }
        } catch (e) {
            console.error("Context fetch failed:", e);
        }
        setIsContextLoading(false);
    };

    // Fetch all examples for a word
    const fetchWordExamples = async (word) => {
        try {
            const res = await fetch(`/api/negotiation/word-examples?word=${encodeURIComponent(word)}`);
            if (res.ok) {
                const data = await res.json();
                setWordExamples(data);
                setCurrentSenseIndex(0);
                setCurrentExampleIndex(0);
            }
        } catch (e) {
            console.error('Failed to fetch word examples:', e);
            setWordExamples(null);
        }
    };

    // Navigate to next example within current sense
    const nextExample = () => {
        if (!wordExamples) return;
        // Reset step history when navigating (new context)
        setStepHistory([]); setHistoryIndex(-1);
        // Reset session for new context
        setSessionId(`session-${Date.now()}`);
        setNeedsContext(true);
        setStep('original');

        const senses = wordExamples.entries.flatMap(e => e.senses);
        const currentSense = senses[currentSenseIndex];
        if (currentSense && currentExampleIndex < currentSense.examples.length - 1) {
            const newIndex = currentExampleIndex + 1;
            setCurrentExampleIndex(newIndex);
            const example = currentSense.examples[newIndex];
            setCurrentText(example.text);
            setTranslation(example.translation || '');
            setTranslation(example.translation || '');
            speak(example.text);

            // Trigger context generation
            setContextScenario('');
            fetchContextScenario(wordExamples.word, currentSense.definition, example.text);
        } else {
            // Move to next sense if available
            nextSense();
        }
    };

    // Navigate to previous example
    const prevExample = () => {
        if (!wordExamples) return;
        // Reset step history when navigating (new context)
        setStepHistory([]); setHistoryIndex(-1);
        // Reset session for new context
        setSessionId(`session-${Date.now()}`);
        setNeedsContext(true);
        setStep('original');

        if (currentExampleIndex > 0) {
            const newIndex = currentExampleIndex - 1;
            setCurrentExampleIndex(newIndex);
            const senses = wordExamples.entries.flatMap(e => e.senses);
            const example = senses[currentSenseIndex]?.examples[newIndex];
            if (example) {
                setCurrentText(example.text);
                setTranslation(example.translation || '');
                setTranslation(example.translation || '');
                speak(example.text);

                // Trigger context generation
                setContextScenario('');
                fetchContextScenario(wordExamples.word, senses[currentSenseIndex].definition, example.text);
            }
        } else if (currentSenseIndex > 0) {
            // Move to previous sense
            prevSense();
        }
    };

    // Navigate to next sense
    const nextSense = () => {
        if (!wordExamples) return;
        // Reset step history when switching sense (new context)
        setStepHistory([]); setHistoryIndex(-1);
        // Reset session for new context
        setSessionId(`session-${Date.now()}`);
        setNeedsContext(true);
        setStep('original');

        const senses = wordExamples.entries.flatMap(e => e.senses);
        if (currentSenseIndex < senses.length - 1) {
            const newIndex = currentSenseIndex + 1;
            setCurrentSenseIndex(newIndex);
            setCurrentExampleIndex(0);
            const sense = senses[newIndex];
            setDefinition(sense.definition);
            if (sense.examples.length > 0) {
                const example = sense.examples[0];
                setCurrentText(example.text);
                setTranslation(example.translation || '');
                speak(example.text);

                // Trigger context generation
                setContextScenario('');
                fetchContextScenario(wordExamples.word, sense.definition, example.text);
            }
        }
    };

    // Navigate to previous sense
    const prevSense = () => {
        if (!wordExamples || currentSenseIndex <= 0) return;
        // Reset step history when switching sense (new context)
        setStepHistory([]); setHistoryIndex(-1);
        // Reset session for new context
        setSessionId(`session-${Date.now()}`);
        setNeedsContext(true);
        setStep('original');

        const newIndex = currentSenseIndex - 1;
        setCurrentSenseIndex(newIndex);
        const senses = wordExamples.entries.flatMap(e => e.senses);
        const sense = senses[newIndex];
        setCurrentExampleIndex(sense.examples.length - 1);
        setDefinition(sense.definition);
        if (sense.examples.length > 0) {
            const example = sense.examples[sense.examples.length - 1];
            setCurrentText(example.text);
            setTranslation(example.translation || '');
            speak(example.text);

            // Trigger context generation
            setContextScenario('');
            fetchContextScenario(wordExamples.word, sense.definition, example.text);
        }
    };

    // Jump to specific sense
    const goToSense = (senseIdx) => {
        if (!wordExamples) return;
        // Reset step history when switching sense (new context)
        setStepHistory([]); setHistoryIndex(-1);
        // Reset session for new context
        setSessionId(`session-${Date.now()}`);
        setNeedsContext(true);
        setStep('original');

        const senses = wordExamples.entries.flatMap(e => e.senses);
        if (senseIdx >= 0 && senseIdx < senses.length) {
            setCurrentSenseIndex(senseIdx);
            setCurrentExampleIndex(0);
            const sense = senses[senseIdx];
            setDefinition(sense.definition);
            if (sense.examples.length > 0) {
                const example = sense.examples[0];
                setCurrentText(example.text);
                setTranslation(example.translation || '');
                speak(example.text);

                // Trigger context generation
                setContextScenario('');
                fetchContextScenario(wordExamples.word, sense.definition, example.text);
            }
        }
    };

    const toggleText = () => {
        setIsTextVisible(!isTextVisible);
        if (!isTextVisible) setScaffoldUsed(true);
    };

    // Replay button
    const handleReplay = () => {
        const langHint = step === 'explain_cn' ? 'cn' : 'en';
        speak(currentText, langHint);
    };

    // If not started, show start screen
    if (!hasStarted) {
        return (
            <div className="flex flex-col h-full bg-canvas text-ink p-4 sm:p-6 max-w-md md:max-w-lg lg:max-w-xl mx-auto items-center justify-center">
                <Volume2 className="w-24 h-24 mb-6 text-neon-green" />
                <h2 className="text-2xl font-serif mb-2">Voice Learning Mode</h2>

                {/* Book Selector */}
                {books.length > 0 && (
                    <div className="mb-6 w-full max-w-xs">
                        <label className="block text-xs uppercase text-zinc-500 mb-2 text-center">Vocabulary Source</label>
                        <select
                            value={selectedBook}
                            onChange={(e) => setSelectedBook(e.target.value)}
                            className="w-full bg-zinc-800 border-zinc-700 text-zinc-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-neon-green/50 outline-none transition-all cursor-pointer appearance-none text-center font-mono"
                        >
                            <option value="">🔀 Random Mix</option>
                            {books.map(book => (
                                <option key={book.code} value={book.code}>
                                    📖 {book.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <p className="text-zinc-500 text-center mb-8">
                    Press START to begin listening. <br />
                    Try to understand without looking at the text.
                </p>
                <button
                    onClick={handleStart}
                    className="flex items-center gap-3 px-8 py-4 rounded-full bg-neon-green text-black font-bold text-lg hover:bg-neon-green/80 transition-colors"
                >
                    <Play className="w-6 h-6" />
                    START
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-full bg-canvas text-ink p-4 sm:p-6 lg:p-8 max-w-md md:max-w-lg lg:max-w-xl mx-auto lg:justify-center">
            {/* Source Word Badge - Top */}
            {sourceWord && (
                <div className="mb-3 flex justify-center">
                    <span className="px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green font-mono text-xs">
                        📖 {sourceWord.toUpperCase()}
                    </span>
                </div>
            )}

            {/* === HERO CARD: Sentence + Audio === */}
            <div className="mb-4">
                <div
                    className={`relative p-6 rounded-2xl border-2 transition-all ${isSpeaking
                        ? 'border-neon-yellow bg-neon-yellow/5'
                        : 'border-zinc-700 bg-zinc-900/80'
                        }`}
                >
                    {/* Sentence Text */}
                    <div
                        onClick={toggleText}
                        className={`text-xl font-serif leading-relaxed mb-6 cursor-pointer transition-all duration-500 ${isTextVisible ? 'blur-0 opacity-100' : 'blur-md opacity-60'
                            }`}
                    >
                        {currentText}
                    </div>

                    {/* Context Scenario (if available) */}
                    {(contextScenario || isContextLoading) && isTextVisible && step === 'original' && (
                        <div className="mt-4 pt-4 border-t border-zinc-700/50 text-base text-zinc-300 font-serif leading-relaxed animate-in fade-in slide-in-from-bottom-2">
                            {isContextLoading ? (
                                <span className="flex items-center gap-2 text-zinc-500 italic text-sm">
                                    <span className="w-2 h-2 bg-neon-cyan rounded-full animate-ping" />
                                    Thinking of a scenario...
                                </span>
                            ) : (
                                <span dangerouslySetInnerHTML={{
                                    __html: contextScenario.replace(
                                        currentText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), // Escape regex chars
                                        `<strong class="text-neon-cyan">${currentText}</strong>`
                                    )
                                }} />
                            )}
                        </div>
                    )}

                    {/* Text Reveal Hint */}
                    {!isTextVisible && (
                        <div className="absolute top-4 right-4 text-xs text-zinc-500 font-mono flex items-center gap-1">
                            <Eye size={12} /> TAP
                        </div>
                    )}

                    {/* Audio Control - Embedded */}
                    <div className="flex items-center justify-center gap-3 pt-4 border-t border-zinc-700/50">
                        {/* Back Button - only show if there's history */}
                        {stepHistory.length > 0 && (
                            <button
                                onClick={handleGoBack}
                                disabled={historyIndex <= 0}
                                className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-all disabled:opacity-30"
                                title="回看上一步"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}

                        {/* Forward Button - only show if can go forward */}
                        {canGoForward && (
                            <button
                                onClick={handleGoForward}
                                className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-all"
                                title="前进到下一步"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        )}

                        {/* Play Button */}
                        <button
                            onClick={handleReplay}
                            disabled={isLoading}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-mono text-sm transition-all ${isSpeaking
                                ? 'bg-neon-yellow text-black'
                                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                }`}
                        >
                            <Volume2 className={`w-5 h-5 ${isSpeaking ? 'animate-pulse' : ''}`} />
                            {isSpeaking ? 'Playing...' : isLoading ? 'Loading...' : '▶ Play'}
                        </button>

                        {/* Speed Toggle */}
                        <button
                            onClick={toggleSpeed}
                            className={`p-2 rounded-full transition-all ${playbackSpeed < 1
                                ? 'bg-neon-cyan/20 text-neon-cyan'
                                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                                }`}
                            title={`Speed: ${playbackSpeed}x`}
                        >
                            <Gauge className="w-5 h-5" />
                        </button>

                        {/* Speed Label */}
                        {playbackSpeed < 1 && (
                            <span className="text-xs text-neon-cyan font-mono">{playbackSpeed}x</span>
                        )}

                        {/* Step Indicator */}
                        <span className="text-xs text-zinc-500 font-mono">
                            {step === 'original' ? '' :
                                step === 'explain_en' ? '💡 EN' :
                                    step === 'explain_cn' ? '🀄 CN' : '✓'}
                        </span>
                    </div>
                </div>

                {/* === SCAFFOLDS SECTION === */}
                <div className="mt-4 space-y-3">
                    {/* Scaffold Toggle Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setShowDefinition(!showDefinition); if (!showDefinition) setScaffoldUsed(true); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-mono transition-all ${showDefinition
                                ? 'bg-neon-cyan/15 border border-neon-cyan/50 text-neon-cyan'
                                : 'bg-zinc-800/50 border border-zinc-700 text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            <BookOpen size={14} />
                            Definition
                        </button>
                        <button
                            onClick={() => { setShowTranslation(!showTranslation); if (!showTranslation) setScaffoldUsed(true); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-mono transition-all ${showTranslation
                                ? 'bg-neon-pink/15 border border-neon-pink/50 text-neon-pink'
                                : 'bg-zinc-800/50 border border-zinc-700 text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            <Languages size={14} />
                            翻译
                        </button>
                    </div>

                    {/* Expanded Scaffolds */}
                    {showDefinition && definition && (
                        <div className="p-3 rounded-lg bg-neon-cyan/5 border border-neon-cyan/20 text-sm text-zinc-300">
                            <span className="text-neon-cyan text-xs font-mono">📖 </span>
                            {definition}
                        </div>
                    )}
                    {showTranslation && translation && (
                        <div className="p-3 rounded-lg bg-neon-pink/5 border border-neon-pink/20 text-sm text-zinc-300">
                            <span className="text-neon-pink text-xs font-mono">🀄 </span>
                            {translation}
                        </div>
                    )}
                </div>
            </div>

            {/* === EXAMPLE NAVIGATION === */}
            {wordExamples && wordExamples.total_examples > 1 && (
                <div className="mb-4 space-y-2">
                    {/* Sense Tabs */}
                    {wordExamples.total_senses > 1 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            <Layers size={14} className="text-zinc-500 flex-shrink-0" />
                            <div className="flex gap-1">
                                {wordExamples.entries.flatMap((e, ei) =>
                                    e.senses.map((s, si) => {
                                        const flatIndex = wordExamples.entries.slice(0, ei).reduce((acc, entry) => acc + entry.senses.length, 0) + si;
                                        return (
                                            <button
                                                key={`${ei}-${si}`}
                                                onClick={() => goToSense(flatIndex)}
                                                className={`px-2 py-1 rounded text-xs font-mono transition-all ${flatIndex === currentSenseIndex
                                                    ? 'bg-neon-green/20 text-neon-green border border-neon-green/50'
                                                    : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                                                    }`}
                                            >
                                                {s.index}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                            <span className="text-xs text-zinc-600 font-mono ml-auto">
                                {wordExamples.total_senses} senses
                            </span>
                        </div>
                    )}

                    {/* Example Navigator */}
                    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-zinc-800/50 border border-zinc-700">
                        <button
                            onClick={prevExample}
                            disabled={currentSenseIndex === 0 && currentExampleIndex === 0}
                            className="p-2 rounded-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <div className="text-center flex-1">
                            <span className="text-xs text-zinc-400 font-mono">
                                Example {currentExampleIndex + 1} / {
                                    wordExamples.entries.flatMap(e => e.senses)[currentSenseIndex]?.examples.length || 0
                                }
                            </span>
                        </div>

                        <button
                            onClick={nextExample}
                            disabled={
                                currentSenseIndex >= wordExamples.total_senses - 1 &&
                                currentExampleIndex >= (wordExamples.entries.flatMap(e => e.senses)[currentSenseIndex]?.examples.length || 0) - 1
                            }
                            className="p-2 rounded-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}            {/* === ACTION BUTTONS === */}
            <div className="pt-4">
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => handleInteraction('huh')}
                        disabled={isLoading}
                        className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all border border-transparent hover:border-neon-pink/50 disabled:opacity-50"
                    >
                        <HelpCircle className="w-5 h-5 text-neon-pink" />
                        <span className="font-mono font-bold text-xs">HUH?</span>
                    </button>

                    <button
                        onClick={handleSkip}
                        disabled={isLoading}
                        className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all border border-transparent hover:border-neon-yellow/50 disabled:opacity-50"
                    >
                        <SkipForward className="w-5 h-5 text-neon-yellow" />
                        <span className="font-mono font-bold text-xs">SKIP</span>
                    </button>

                    <button
                        onClick={() => handleInteraction('continue')}
                        disabled={isLoading}
                        className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all border border-transparent hover:border-neon-green/50 disabled:opacity-50"
                    >
                        <ArrowRight className="w-5 h-5 text-neon-green" />
                        <span className="font-mono font-bold text-xs">GOT IT</span>
                    </button>
                </div>

                {/* Minimal Status */}
                <div className="mt-2 text-center text-xs text-zinc-600 font-mono">
                    {scaffoldUsed ? '📚 Used scaffolds' : '🎧 Audio only'} • {step.toUpperCase()}
                    {stepHistory.length > 0 && ` • ${stepHistory.length} steps`}
                </div>
            </div>
        </div>
    );
};

export default NegotiationInterface;

