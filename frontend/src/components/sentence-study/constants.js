/**
 * Sentence Study Constants
 * Shared constants for the SentenceStudy module
 */

// View state machine
export const VIEW_STATES = {
    BOOK_SHELF: 'book_shelf',
    ARTICLE_LIST: 'article_list',
    OVERVIEW: 'overview',      // Show article overview before studying
    STUDYING: 'studying',
    COMPLETED: 'completed'     // Show full article with highlights after completion
};

/**
 * Gap Type Definitions - SINGLE SOURCE OF TRUTH
 * All gap type related metadata centralized here for easy maintenance.
 * Used by: StudyingView, CompletedView, SentenceInspector, ReviewQueue, PerformanceReport
 */
export const GAP_TYPES = {
    vocabulary: {
        id: 'vocabulary',
        label: '📖 Words',
        shortLabel: 'Words',
        desc: 'Difficult words',
        color: 'orange',        // For border/text color
        cssClasses: {
            border: 'border-orange-400',
            bg: 'bg-orange-500/10',
            text: 'text-orange-400'
        }
    },
    grammar: {
        id: 'grammar',
        label: '🔧 Structure',
        shortLabel: 'Structure',
        desc: 'Sentence structure',
        color: 'blue',
        cssClasses: {
            border: 'border-blue-400',
            bg: 'bg-blue-500/10',
            text: 'text-blue-400'
        }
    },
    meaning: {
        id: 'meaning',
        label: '🧩 Context',
        shortLabel: 'Context',
        desc: 'Overall meaning',
        color: 'amber',
        cssClasses: {
            border: 'border-amber-400',
            bg: 'bg-amber-500/10',
            text: 'text-amber-400'
        }
    },
    both: {
        id: 'both',
        label: '🤯 Everything',
        shortLabel: 'Everything',
        desc: 'I have no clue',
        color: 'red',
        cssClasses: {
            border: 'border-red-400',
            bg: 'bg-red-500/10',
            text: 'text-red-400'
        }
    },
    // Backend-only types (mapped from user choices or other logic)
    structure: { 
        id: 'structure',
        label: '🔧 Structure',
        shortLabel: 'Structure', 
        color: 'blue', 
        cssClasses: { border: 'border-blue-400', bg: 'bg-blue-500/10', text: 'text-blue-400' } 
    },
    fundamental: { 
        id: 'fundamental',
        label: '🤯 Everything',
        shortLabel: 'Everything', 
        color: 'red', 
        cssClasses: { border: 'border-red-400', bg: 'bg-red-500/10', text: 'text-red-400' } 
    },
    collocation: { 
        id: 'collocation',
        label: '🔗 Collocation',
        shortLabel: 'Collocation', 
        color: 'cyan', 
        cssClasses: { border: 'border-cyan-400', bg: 'bg-cyan-500/10', text: 'text-cyan-400' } 
    }
};

// Helper: Get gap type info (with fallback)
export const getGapTypeInfo = (type) => {
    // Handle mapped types (grammar -> structure in DB)
    if (type === 'grammar') return GAP_TYPES.grammar;
    
    // Direct lookup
    return GAP_TYPES[type] || { 
        id: type,
        label: type,
        shortLabel: type, 
        color: 'yellow', 
        cssClasses: { border: 'border-yellow-400', bg: 'bg-yellow-500/10', text: 'text-yellow-400' } 
    };
};

// Difficulty choices for UI (preserve order)
export const DIFFICULTY_CHOICES = [
    GAP_TYPES.vocabulary,
    GAP_TYPES.grammar,
    GAP_TYPES.meaning,
    GAP_TYPES.both
];

// Helper: Extract flat list of sentences from blocks
export const extractSentencesFromBlocks = (blocks) => {
    if (!blocks || blocks.length === 0) return [];
    const sentences = [];
    blocks.forEach((block, blockIdx) => {
        if (block.type === 'paragraph' && block.sentences) {
            block.sentences.forEach((sentence, sentIdx) => {
                sentences.push({
                    text: sentence,
                    blockIndex: blockIdx,
                    sentenceIndex: sentIdx
                });
            });
        }
    });
    return sentences;
};
