import React, { useState, useEffect, useRef } from 'react';
import { Volume2, HelpCircle, ArrowRight, Eye, EyeOff, Play, BookOpen, Languages, SkipForward, ChevronLeft, ChevronRight, Gauge, Layers } from 'lucide-react';
import { escapeHtml } from '../../utils/security';
import VoiceSessionTracker from '../../utils/VoiceSessionTracker';

import { authFetch } from '../../api/auth';

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
    const [bookRange, setBookRange] = useState({ start: null, end: null });

    // RSS Feed
    const [rssUrl, setRssUrl] = useState('');
    const [isRssMode, setIsRssMode] = useState(false);
    // EPUB Mode
    const [isEpubMode, setIsEpubMode] = useState(false);
    const [epubFile] = useState('TheEconomist.2025.12.27.epub');
    const [highlightedWords, setHighlightedWords] = useState([]); // Array of words to highlight
    const [articleTitle, setArticleTitle] = useState('');
    const [articleLink, setArticleLink] = useState('');
    // Sequential reading state
    const [rssArticleIdx, setRssArticleIdx] = useState(0);
    const [rssSentenceIdx, setRssSentenceIdx] = useState(0);
    const [rssTotalSentences, setRssTotalSentences] = useState(0);
    const [rssHasNext, setRssHasNext] = useState(false);
    // Debug: raw article content
    const [rawContent, setRawContent] = useState('');

    // Voices ref to store loaded voices
    const voicesRef = useRef([]);

    // Session Tracker
    const trackerRef = useRef(null);

    // Load voices and books on mount
    useEffect(() => {
        // Initialize tracker with authFetch adapter to support token refresh
        const trackerApi = {
            post: async (url, data) => {
                const res = await authFetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (!res.ok) throw new Error(`Tracker POST failed: ${res.status}`);
                return res.json();
            },
            put: async (url, data) => {
                const res = await authFetch(url, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (!res.ok) throw new Error(`Tracker PUT failed: ${res.status}`);
                return res.json();
            }
        };
        trackerRef.current = new VoiceSessionTracker(trackerApi);

        const loadVoices = () => {
            voicesRef.current = window.speechSynthesis.getVoices();
            console.log('Voices loaded:', voicesRef.current.length);
        };

        const fetchBooks = async () => {
            try {
                const res = await authFetch('/api/books/');
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
            // End session on unmount
            if (trackerRef.current) {
                trackerRef.current.end();
            }
        };
    }, []);

    const getContentUrl = (excludeWord = null, customIndices = null) => {
        let url = selectedBook
            ? `/api/negotiation/next-content?book=${selectedBook}`
            : '/api/negotiation/next-content';

        if (selectedBook && bookRange.start !== null) {
            const separator = url.includes('?') ? '&' : '?';
            url += `${separator}book_start=${bookRange.start}&book_end=${bookRange.end}`;
        }

        // Add exclude parameter for SKIP functionality
        if (excludeWord) {
            const separator = url.includes('?') ? '&' : '?';
            url += `${separator}exclude=${encodeURIComponent(excludeWord)}`;
        }

        // Add EPUB file if in EPUB mode
        if (isEpubMode && epubFile) {
            const separator = url.includes('?') ? '&' : '?';
            url += `${separator}epub_file=${encodeURIComponent(epubFile)}`;

            // Add sequential reading indices
            const articleIdx = customIndices?.articleIdx ?? rssArticleIdx;
            const sentenceIdx = customIndices?.sentenceIdx ?? rssSentenceIdx;
            url += `&article_idx=${articleIdx}&sentence_idx=${sentenceIdx}`;
        }
        // Add RSS URL if in RSS mode
        else if (isRssMode && rssUrl) {
            const separator = url.includes('?') ? '&' : '?';
            url += `${separator}rss_url=${encodeURIComponent(rssUrl)}`;

            // Add sequential reading indices
            const articleIdx = customIndices?.articleIdx ?? rssArticleIdx;
            const sentenceIdx = customIndices?.sentenceIdx ?? rssSentenceIdx;
            url += `&article_idx=${articleIdx}&sentence_idx=${sentenceIdx}`;
        }

        return url;
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
                const response = await authFetch(`/api/tts?text=${encodeURIComponent(text)}`);

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

            // Track audio play
            if (trackerRef.current) {
                trackerRef.current.onAudioPlay();
            }

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

    const handleStart = async () => {
        setHasStarted(true);
        setIsLoading(true);

        try {
            // Start tracking session
            if (trackerRef.current) {
                let sourceType = 'dictionary';
                let sourceId = selectedBook || 'mixed';

                if (isEpubMode) {
                    sourceType = 'epub';
                    sourceId = epubFile;
                } else if (isRssMode) {
                    sourceType = 'rss';
                    sourceId = rssUrl;
                }

                trackerRef.current.start({ sourceType, sourceId });
            }

            // Fetch real content from dictionary
            const contentRes = await authFetch(getContentUrl());
            let content = { text: "The ubiquity of smartphones has changed how we communicate.", source_word: "ubiquity", definition: "", translation: "" };

            if (contentRes.ok) {
                content = await contentRes.json();
                setCurrentText(content.text);
                setSourceWord(content.source_word || '');
                setDefinition(content.definition || '');
                setTranslation(content.translation || '');
                setHighlightedWords(content.highlights || []);
                setArticleTitle(content.article_title || '');
                setArticleLink(content.article_link || '');

                // Store sequential reading metadata
                if (content.article_idx !== undefined) {
                    setRssArticleIdx(content.article_idx);
                    setRssSentenceIdx(content.sentence_idx || 0);
                    setRssTotalSentences(content.total_sentences || 0);
                    setRssHasNext(content.has_next || false);
                }

                // Store raw content for debugging
                setRawContent(content.raw_content || '');

                // Also fetch all examples for this word (only in Dictionary mode or when clicked)
                if (content.source_word && !isRssMode) {
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
            // Log word inspection when user clicks HUH? (Source-Aware Drill-down)
            if (intention === 'huh') {
                if (trackerRef.current) trackerRef.current.onWordLookup(sourceWord);
                if (sourceWord) logWordInspection(sourceWord, currentText);
            } else if (intention === 'got_it') {
                if (trackerRef.current) trackerRef.current.onGotIt();
            }

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

            const res = await authFetch('/api/negotiation/interact', {
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
        // Remember current word to exclude
        const currentWord = sourceWord;
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
        // Fetch new content, excluding current word
        await fetchNextContent(currentWord);
        setNeedsContext(true);
        setIsLoading(false);
    };

    // Next sentence in RSS sequential reading
    const handleNextSentence = async () => {
        if (!isRssMode) return;

        setIsLoading(true);
        // Reset for new sentence
        setStepHistory([]);
        setHistoryIndex(-1);
        setStep('original');
        setIsTextVisible(false);
        setShowDefinition(false);
        setShowTranslation(false);
        setSessionId(`session-${Date.now()}`);

        // Calculate next indices
        const nextSentenceIdx = rssSentenceIdx + 1;
        await fetchNextContent(null, {
            articleIdx: rssArticleIdx,
            sentenceIdx: nextSentenceIdx
        });

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
    const fetchNextContent = async (excludeWord = null, customIndices = null) => {
        try {
            const res = await authFetch(getContentUrl(excludeWord, customIndices));
            if (res.ok) {
                const data = await res.json();
                setCurrentText(data.text);
                setSourceWord(data.source_word || '');
                setDefinition(data.definition || '');
                setTranslation(data.translation || '');
                setHighlightedWords(data.highlights || []);
                setArticleTitle(data.article_title || '');
                setArticleLink(data.article_link || '');

                // Store sequential reading metadata
                if (data.article_idx !== undefined) {
                    setRssArticleIdx(data.article_idx);
                    setRssSentenceIdx(data.sentence_idx || 0);
                    setRssTotalSentences(data.total_sentences || 0);
                    setRssHasNext(data.has_next || false);
                }

                // Store raw content for debugging
                setRawContent(data.raw_content || '');

                // Reset scaffold visibility
                setShowDefinition(false);
                setShowTranslation(false);

                // Also fetch all examples for this word (only in Dictionary mode)
                if (data.source_word && !isRssMode) {
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
            const res = await authFetch('/api/negotiation/context', {
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
            const res = await authFetch(`/api/negotiation/word-examples?word=${encodeURIComponent(word)}`);
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

    // Log word inspection to backend (Source-Aware Drill-down)
    const logWordInspection = async (word, contextSentence) => {
        if (!word) return;

        // Determine source type and ID based on current mode
        let sourceType = 'dictionary';
        let sourceId = null;

        if (isEpubMode) {
            sourceType = 'epub';
            sourceId = `epub:${epubFile}:article_${rssArticleIdx}`;
        } else if (isRssMode) {
            sourceType = 'rss';
            sourceId = `rss:${btoa(rssUrl).slice(0, 20)}:article_${rssArticleIdx}`;
        } else if (selectedBook) {
            sourceType = 'dictionary';
            sourceId = `book:${selectedBook}`;
        }

        try {
            const params = new URLSearchParams({
                word: word.toLowerCase().trim(),
                source_type: sourceType,
                context: contextSentence || currentText || ''
            });
            if (sourceId) params.append('source_id', sourceId);

            // Non-blocking: fire and forget (don't await)
            authFetch(`/api/inspect?${params.toString()}`).catch(e => {
                console.warn('Failed to log word inspection:', e);
            });
        } catch (e) {
            console.warn('Word inspection logging error:', e);
        }
    };

    // Navigate to next example within current sense
    const nextExample = () => {
        if (trackerRef.current) trackerRef.current.onExampleNav();
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
                    <div className="mb-6 w-full max-w-xs space-y-4">
                        <div>
                            <label className="block text-xs uppercase text-text-muted mb-2 text-center font-bold">Content Source</label>

                            {/* Toggle between Dictionary, EPUB, and RSS */}
                            <div className="flex rounded-lg bg-bg-surface p-1 mb-4" role="group" aria-label="Content Source">
                                <button
                                    onClick={() => { setIsRssMode(false); setIsEpubMode(false); }}
                                    aria-pressed={!isRssMode && !isEpubMode}
                                    className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${!isRssMode && !isEpubMode ? 'bg-bg-elevated text-text-primary shadow' : 'text-text-muted hover:text-text-secondary'}`}
                                >
                                    📖 Dictionary
                                </button>
                                <button
                                    onClick={() => { setIsEpubMode(true); setIsRssMode(false); }}
                                    aria-pressed={isEpubMode}
                                    className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${isEpubMode ? 'bg-neon-cyan/20 text-neon-cyan shadow' : 'text-text-muted hover:text-text-secondary'}`}
                                >
                                    📰 EPUB
                                </button>
                                <button
                                    onClick={() => { setIsRssMode(true); setIsEpubMode(false); }}
                                    aria-pressed={isRssMode}
                                    className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${isRssMode ? 'bg-bg-elevated text-text-primary shadow' : 'text-text-muted hover:text-text-secondary'}`}
                                >
                                    🌐 RSS
                                </button>
                            </div>

                            {/* EPUB File Selection */}
                            {isEpubMode && (
                                <div className="animate-in fade-in slide-in-from-top-2 mb-4 p-3 rounded-lg bg-neon-cyan/5 border border-neon-cyan/20">
                                    <div className="text-xs text-neon-cyan mb-1 font-mono">📰 Economist EPUB</div>
                                    <div className="text-xs text-text-muted">TheEconomist.2025.12.27.epub</div>
                                    <div className="text-xs text-zinc-600 mt-1">73 articles • Full content</div>
                                </div>
                            )}

                            {/* RSS URL Input */}
                            {isRssMode && (
                                <div className="animate-in fade-in slide-in-from-top-2 mb-4">
                                    <label htmlFor="rss-url-input" className="block text-xs text-text-muted mb-1">RSS URL</label>
                                    <input
                                        id="rss-url-input"
                                        type="text"
                                        value={rssUrl}
                                        onChange={(e) => setRssUrl(e.target.value)}
                                        placeholder="https://example.com/feed.xml"
                                        className="w-full bg-bg-surface border-border text-text-secondary p-2 rounded text-sm focus:ring-2 focus:ring-neon-green/50 outline-none font-mono"
                                    />
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <button onClick={() => setRssUrl("https://rsshub.rssforever.com/economist/latest?mode=fulltext")} className="text-xs text-neon-cyan hover:underline">
                                            📰 Economist (全文)
                                        </button>
                                        <button onClick={() => setRssUrl("https://rsshub.rssforever.com/nytimes/en?mode=fulltext")} className="text-xs text-neon-cyan hover:underline">
                                            🗽 NYT (全文)
                                        </button>
                                        <button onClick={() => setRssUrl("https://rsshub.pseudoyu.com/economist/latest?mode=fulltext")} className="text-xs text-text-muted hover:underline">
                                            备用: Economist
                                        </button>
                                        <button onClick={() => setRssUrl("https://plink.anyfeeder.com/weixin/Economist_fans")} className="text-xs text-text-muted hover:underline">
                                            旧: Economist
                                        </button>
                                    </div>
                                </div>
                            )}

                            <label className="block text-xs uppercase text-text-muted mb-2 text-center mt-4">
                                {isRssMode ? "Identify Vocabulary From" : "Vocabulary Source"}
                            </label>
                            <select
                                value={selectedBook}
                                onChange={(e) => {
                                    setSelectedBook(e.target.value);
                                    setBookRange({ start: null, end: null });
                                }}
                                className="w-full bg-bg-surface border-border text-text-secondary p-3 rounded-lg text-sm focus:ring-2 focus:ring-neon-green/50 outline-none transition-all cursor-pointer appearance-none text-center font-mono"
                            >
                                <option value="">🔀 Random Mix</option>
                                {books.map(book => (
                                    <option key={book.code} value={book.code}>
                                        📖 {book.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* COCA Range Filter */}
                        {selectedBook === 'coca20000' && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-xs uppercase text-text-muted mb-2 text-center">Frequency Range</label>
                                <select
                                    value={bookRange.start !== null ? `${bookRange.start}-${bookRange.end}` : ""}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value) {
                                            const [start, end] = value.split('-').map(Number);
                                            setBookRange({ start, end });
                                        } else {
                                            setBookRange({ start: null, end: null });
                                        }
                                    }}
                                    className="w-full bg-bg-surface border-border text-text-secondary p-3 rounded-lg text-sm focus:ring-2 focus:ring-neon-cyan/50 outline-none transition-all cursor-pointer appearance-none text-center font-mono"
                                >
                                    <option value="">All Levels (1-20000)</option>
                                    <option value="1-1000">Top 1000 (Beginner)</option>
                                    <option value="1001-2000">1001-2000 (Elementary)</option>
                                    <option value="2001-3000">2001-3000 (Intermediate)</option>
                                    <option value="3001-4000">3001-4000 (Intermediate+)</option>
                                    <option value="4001-5000">4001-5000 (Upper Intermediate)</option>
                                    <option value="5001-10000">5001-10000 (Advanced)</option>
                                    <option value="10001-15000">10001-15000 (Proficient)</option>
                                    <option value="15001-20000">15001-20000 (Expert)</option>
                                </select>
                            </div>
                        )}
                    </div>
                )}

                <p className="text-text-muted text-center mb-8">
                    Press START to begin listening. <br />
                    Try to understand without looking at the text.
                </p>
                <button
                    onClick={handleStart}
                    className="flex items-center gap-3 px-8 py-4 rounded-full bg-neon-green text-text-inverse font-bold text-lg hover:bg-neon-green/80 transition-colors"
                >
                    <Play className="w-6 h-6" />
                    START
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-full bg-canvas text-ink p-4 sm:p-6 lg:p-8 max-w-md md:max-w-lg lg:max-w-xl mx-auto lg:justify-center">
            {/* Source Context Badge - Show Article for RSS, Word for Dictionary */}
            {isRssMode && articleTitle ? (
                <div className="mb-3 flex flex-col items-center gap-1">
                    <a
                        href={articleLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan font-mono text-xs hover:bg-neon-cyan/20 transition-colors truncate max-w-[280px]"
                        title={articleTitle}
                    >
                        📰 {articleTitle}
                    </a>
                    {rssTotalSentences > 0 && (
                        <span className="text-xs text-text-muted font-mono">
                            Sentence {rssSentenceIdx + 1} / {rssTotalSentences}
                        </span>
                    )}
                </div>
            ) : sourceWord && (
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
                        : 'border-border bg-bg-base/80'
                        }`}
                >
                    {/* Sentence Text */}
                    <div
                        onClick={toggleText}
                        className={`text-xl font-serif leading-relaxed mb-6 cursor-pointer transition-all duration-500 ${isTextVisible ? 'blur-0 opacity-100' : 'blur-md opacity-60'
                            }`}
                    >
                        {isRssMode && highlightedWords.length > 0 ? (
                            // Render with clickable highlights
                            <span>
                                {currentText.split(/\b/).map((part, i) => {
                                    const lowerPart = part.toLowerCase();
                                    const isHighlighted = highlightedWords.some(w => w.toLowerCase() === lowerPart);

                                    if (isHighlighted) {
                                        return (
                                            <span
                                                key={i}
                                                className="text-neon-yellow font-bold border-b border-neon-yellow/30 hover:bg-neon-yellow/20 cursor-pointer px-0.5 rounded transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent toggling text blur
                                                    speak(part);
                                                    // Trigger deep study for this word
                                                    setSourceWord(part);
                                                    fetchWordExamples(part);
                                                    // Could also trigger context generation here specifically for this word
                                                }}
                                            >
                                                {part}
                                            </span>
                                        );
                                    }
                                    return part;
                                })}
                            </span>
                        ) : (
                            currentText
                        )}
                    </div>

                    {/* Context Scenario (if available) */}
                    {(contextScenario || isContextLoading) && isTextVisible && step === 'original' && (
                        <div className="mt-4 pt-4 border-t border-border/50 text-base text-text-secondary font-serif leading-relaxed animate-in fade-in slide-in-from-bottom-2">
                            {isContextLoading ? (
                                <span className="flex items-center gap-2 text-text-muted italic text-sm">
                                    <span className="w-2 h-2 bg-neon-cyan rounded-full animate-ping" />
                                    Thinking of a scenario...
                                </span>
                            ) : (
                                <span dangerouslySetInnerHTML={{
                                    __html: escapeHtml(contextScenario).replace(
                                        escapeHtml(currentText).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), // Escape regex chars
                                        `<strong class="text-neon-cyan">${escapeHtml(currentText)}</strong>`
                                    )
                                }} />
                            )}
                        </div>
                    )}

                    {/* Text Reveal Hint */}
                    {!isTextVisible && (
                        <div className="absolute top-4 right-4 text-xs text-text-muted font-mono flex items-center gap-1">
                            <Eye size={12} /> TAP
                        </div>
                    )}

                    {/* Audio Control - Embedded */}
                    <div className="flex items-center justify-center gap-3 pt-4 border-t border-border/50">
                        {/* Back Button - only show if there's history */}
                        {stepHistory.length > 0 && (
                            <button
                                onClick={handleGoBack}
                                disabled={historyIndex <= 0}
                                className="p-2 rounded-full bg-bg-surface text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-all disabled:opacity-30"
                                title="回看上一步"
                                aria-label="Previous step"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}

                        {/* Forward Button - only show if can go forward */}
                        {canGoForward && (
                            <button
                                onClick={handleGoForward}
                                className="p-2 rounded-full bg-bg-surface text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-all"
                                title="前进到下一步"
                                aria-label="Next step"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        )}

                        {/* Play Button */}
                        <button
                            onClick={handleReplay}
                            disabled={isLoading}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-mono text-sm transition-all ${isSpeaking
                                ? 'bg-neon-yellow text-text-inverse'
                                : 'bg-bg-surface text-text-secondary hover:bg-bg-elevated'
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
                                : 'bg-bg-surface text-text-muted hover:text-text-primary'
                                }`}
                            title={`Speed: ${playbackSpeed}x`}
                            aria-label={`Playback speed: ${playbackSpeed}x`}
                        >
                            <Gauge className="w-5 h-5" />
                        </button>

                        {/* Speed Label */}
                        {playbackSpeed < 1 && (
                            <span className="text-xs text-neon-cyan font-mono">{playbackSpeed}x</span>
                        )}

                        {/* Step Indicator */}
                        <span className="text-xs text-text-muted font-mono">
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
                            onClick={async () => {
                                const newShow = !showDefinition;
                                setShowDefinition(newShow);
                                if (newShow) {
                                    setScaffoldUsed(true);
                                    // In EPUB/RSS mode, fetch definition for first highlighted word if not already loaded
                                    if ((isEpubMode || isRssMode) && !definition && highlightedWords.length > 0) {
                                        try {
                                            const wordToLookup = highlightedWords[0];
                                            const res = await authFetch(`/api/negotiation/word-examples?word=${encodeURIComponent(wordToLookup)}`);
                                            if (res.ok) {
                                                const data = await res.json();
                                                if (data.entries && data.entries.length > 0) {
                                                    const firstDef = data.entries[0].senses[0]?.definition || '';
                                                    setDefinition(`${wordToLookup.toUpperCase()}: ${firstDef}`);
                                                    // Also store examples for navigation
                                                    setWordExamples(data);
                                                }
                                            }
                                        } catch (e) {
                                            console.error('Failed to fetch definition:', e);
                                        }
                                    }
                                }
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-mono transition-all ${showDefinition
                                ? 'bg-neon-cyan/15 border border-neon-cyan/50 text-neon-cyan'
                                : 'bg-bg-surface/50 border border-border text-text-muted hover:text-text-secondary'
                                }`}
                        >
                            <BookOpen size={14} />
                            Definition
                        </button>
                        <button
                            onClick={() => { setShowTranslation(!showTranslation); if (!showTranslation) setScaffoldUsed(true); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-mono transition-all ${showTranslation
                                ? 'bg-neon-pink/15 border border-neon-pink/50 text-neon-pink'
                                : 'bg-bg-surface/50 border border-border text-text-muted hover:text-text-secondary'
                                }`}
                        >
                            <Languages size={14} />
                            翻译
                        </button>
                    </div>

                    {/* Expanded Scaffolds */}
                    {showDefinition && definition && (
                        <div className="p-3 rounded-lg bg-neon-cyan/5 border border-neon-cyan/20 text-sm text-text-secondary">
                            <span className="text-neon-cyan text-xs font-mono">📖 </span>
                            {definition}
                        </div>
                    )}
                    {showTranslation && translation && (
                        <div className="p-3 rounded-lg bg-neon-pink/5 border border-neon-pink/20 text-sm text-text-secondary">
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
                            <Layers size={14} className="text-text-muted flex-shrink-0" />
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
                                                    : 'bg-bg-surface text-text-muted hover:text-text-secondary'
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
                    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-bg-surface/50 border border-border">
                        <button
                            onClick={prevExample}
                            disabled={currentSenseIndex === 0 && currentExampleIndex === 0}
                            className="p-2 rounded-full bg-bg-elevated hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            aria-label="Previous example"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <div className="text-center flex-1">
                            <span className="text-xs text-text-muted font-mono">
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
                            className="p-2 rounded-full bg-bg-elevated hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            aria-label="Next example"
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
                        className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-bg-surface hover:bg-bg-elevated active:scale-95 transition-all border border-transparent hover:border-neon-pink/50 disabled:opacity-50"
                    >
                        <HelpCircle className="w-5 h-5 text-neon-pink" />
                        <span className="font-mono font-bold text-xs">HUH?</span>
                    </button>

                    {isRssMode ? (
                        <button
                            onClick={handleNextSentence}
                            disabled={isLoading || !rssHasNext}
                            className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-bg-surface hover:bg-bg-elevated active:scale-95 transition-all border border-transparent hover:border-neon-yellow/50 disabled:opacity-50"
                        >
                            <ArrowRight className="w-5 h-5 text-neon-yellow" />
                            <span className="font-mono font-bold text-xs">NEXT</span>
                        </button>
                    ) : (
                        <button
                            onClick={handleSkip}
                            disabled={isLoading}
                            className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-bg-surface hover:bg-bg-elevated active:scale-95 transition-all border border-transparent hover:border-neon-yellow/50 disabled:opacity-50"
                        >
                            <SkipForward className="w-5 h-5 text-neon-yellow" />
                            <span className="font-mono font-bold text-xs">SKIP</span>
                        </button>
                    )}

                    <button
                        onClick={() => handleInteraction('continue')}
                        disabled={isLoading}
                        className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-bg-surface hover:bg-bg-elevated active:scale-95 transition-all border border-transparent hover:border-neon-green/50 disabled:opacity-50"
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

            {/* === DEBUG PANEL: Raw Article Content === */}
            {(isRssMode || isEpubMode) && (
                <div className="mt-6 p-4 rounded-xl bg-bg-surface/50 border border-neon-yellow">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-neon-yellow">🐛 DEBUG: Raw Article Content</span>
                        <span className="text-xs text-text-muted font-mono">
                            {rawContent ? `${rawContent.length} chars` : 'NO DATA'}
                        </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto text-xs text-text-muted font-mono whitespace-pre-wrap leading-relaxed">
                        {rawContent || '⚠️ rawContent is empty or undefined. Check backend response.'}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NegotiationInterface;

