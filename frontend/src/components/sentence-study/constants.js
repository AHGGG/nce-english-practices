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

// Difficulty choice options when user clicks "Unclear"
export const DIFFICULTY_CHOICES = [
    { id: 'vocabulary', label: '📖 Words', desc: 'Difficult words' },
    { id: 'grammar', label: '🔧 Structure', desc: 'Sentence structure' },
    { id: 'meaning', label: '🧩 Context', desc: 'Overall meaning' },
    { id: 'both', label: '� Everything', desc: 'I have no clue' }
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
