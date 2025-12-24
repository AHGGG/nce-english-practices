/**
 * ContextCard - AUI-compatible pure presentation component for context resources
 * 
 * This component receives all data via props and emits actions via callbacks.
 * It should be registered in the AUI registry and rendered by AUIStreamHydrator.
 */
import React, { useState, useRef, useMemo } from 'react';
import { Volume2, VolumeX, Check, Loader2, BookOpen } from 'lucide-react';

// Status badge styles
const STATUS_STYLES = {
    unseen: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    learning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    mastered: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const STATUS_LABELS = {
    unseen: 'Unseen',
    learning: 'Learning',
    mastered: 'Mastered',
};

/**
 * Highlight the target word in text content
 */
const HighlightedText = ({ text, word }) => {
    if (!word || !text) return <span>{text}</span>;

    // Create regex to match word and common forms
    const wordLower = word.toLowerCase();
    const patterns = [
        word,
        wordLower,
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        // Common morphological forms
        wordLower + 's',
        wordLower + 'ed',
        wordLower + 'ing',
        wordLower + 'd',
        wordLower + 'es',
        wordLower + 'er',
        wordLower + 'est',
    ].filter((v, i, a) => a.indexOf(v) === i); // dedupe

    const regex = new RegExp(`\\b(${patterns.join('|')})\\b`, 'gi');
    const parts = text.split(regex);

    return (
        <span>
            {parts.map((part, i) => {
                const isMatch = patterns.some(p =>
                    part.toLowerCase() === p.toLowerCase()
                );
                return isMatch ? (
                    <mark key={i} className="bg-neon-purple/30 text-neon-purple px-0.5 rounded font-semibold">
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                );
            })}
        </span>
    );
};

/**
 * ContextCard - Display a single context resource
 */
const ContextCard = ({
    id,
    word,
    text_content,
    translation,        // New: Chinese translation
    source = 'Unknown',
    context_type = 'dictionary_example',
    status = 'unseen',
    grammar_pattern,     // New: e.g., "VERB noun"
    definition,          // New: sense definition
    definition_cn,       // New: Chinese definition
    sense_index,         // New: which sense (1, 2, 3...)
    synonyms = [],       // New: synonyms list
    audio_endpoint,
    show_actions = true,
    compact = false,
    onStatusChange,
    onAction,
    onViewDictionary,  // callback to open dictionary modal
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const audioRef = useRef(null);

    // Play TTS audio
    const handlePlayAudio = async () => {
        if (isPlaying) {
            audioRef.current?.pause();
            setIsPlaying(false);
            return;
        }

        setIsLoadingAudio(true);
        try {
            // Use TTS API with text content directly
            const audioUrl = `/api/tts?text=${encodeURIComponent(text_content)}`;

            if (audioRef.current) {
                audioRef.current.src = audioUrl;
            } else {
                audioRef.current = new Audio(audioUrl);
            }

            audioRef.current.onplay = () => {
                setIsPlaying(true);
                setIsLoadingAudio(false);
            };
            audioRef.current.onended = () => setIsPlaying(false);
            audioRef.current.onerror = () => {
                setIsPlaying(false);
                setIsLoadingAudio(false);
                console.error('Failed to play audio');
            };

            await audioRef.current.play();

            // Emit AUI action
            onAction?.('audio_played', { context_id: id, word });
        } catch (error) {
            console.error('Audio playback error:', error);
            setIsLoadingAudio(false);
        }
    };

    // Handle status change
    const handleStatusChange = (newStatus) => {
        onStatusChange?.(id, newStatus);
        onAction?.('status_changed', { context_id: id, old_status: status, new_status: newStatus });
    };

    // Handle view dictionary
    const handleViewDictionary = () => {
        onViewDictionary?.(word);
        onAction?.('view_dictionary', { word, source });
    };

    // Get next status in cycle
    const getNextStatus = () => {
        const cycle = ['unseen', 'learning', 'mastered'];
        const currentIndex = cycle.indexOf(status);
        return cycle[(currentIndex + 1) % cycle.length];
    };

    return (
        <div className={`
      relative border rounded-lg
      bg-canvas/50 border-ink/10
      hover:border-ink/20 transition-colors
      ${compact ? 'p-3' : 'p-4'}
    `}>
            {/* Header Row: Source/Grammar + Status */}
            <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-ink/50 uppercase tracking-wider">
                        {source.replace('.mdx', '')}
                    </span>
                    {grammar_pattern && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-neon-cyan/10 text-neon-cyan/70 font-mono">
                            {grammar_pattern}
                        </span>
                    )}
                </div>

                <button
                    onClick={() => handleStatusChange(getNextStatus())}
                    className={`
            text-xs px-2 py-0.5 rounded-full border
            transition-all cursor-pointer
            hover:scale-105 active:scale-95
            ${STATUS_STYLES[status]}
          `}
                    title={`Click to change (currently: ${STATUS_LABELS[status]})`}
                >
                    {STATUS_LABELS[status]}
                </button>
            </div>

            {/* Text content with highlighted word */}
            <p className={`
        text-ink leading-relaxed
        ${compact ? 'text-sm' : 'text-base'}
      `}>
                <HighlightedText text={text_content} word={word} />
            </p>

            {/* Translation (Chinese) */}
            {
                translation && (
                    <p className="mt-1.5 text-sm text-ink/60 italic">
                        {translation}
                    </p>
                )
            }

            {/* Actions */}
            {
                show_actions && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-ink/5 flex-wrap">
                        {/* Play audio button */}
                        <button
                            onClick={handlePlayAudio}
                            disabled={isLoadingAudio}
                            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded
              text-sm font-mono transition-all
              ${isPlaying
                                    ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                                    : 'bg-ink/5 text-ink/70 hover:bg-ink/10 hover:text-ink'
                                }
              disabled:opacity-50
            `}
                        >
                            {isLoadingAudio ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isPlaying ? (
                                <VolumeX className="w-4 h-4" />
                            ) : (
                                <Volume2 className="w-4 h-4" />
                            )}
                            <span>{isPlaying ? 'Stop' : 'Listen'}</span>
                        </button>

                        {/* View in Dictionary button */}
                        <button
                            onClick={handleViewDictionary}
                            className="
              flex items-center gap-1.5 px-3 py-1.5 rounded
              text-sm font-mono transition-all
              bg-ink/5 text-ink/70 hover:bg-ink/10 hover:text-ink
            "
                        >
                            <BookOpen className="w-4 h-4" />
                            <span>Dictionary</span>
                        </button>

                        {/* Quick "mastered" button */}
                        {status !== 'mastered' && (
                            <button
                                onClick={() => handleStatusChange('mastered')}
                                className="
                flex items-center gap-1.5 px-3 py-1.5 rounded
                text-sm font-mono transition-all
                bg-emerald-500/10 text-emerald-400 
                hover:bg-emerald-500/20 border border-emerald-500/20
              "
                            >
                                <Check className="w-4 h-4" />
                                <span>Got it</span>
                            </button>
                        )}
                    </div>
                )
            }
        </div >
    );
};

export default ContextCard;

