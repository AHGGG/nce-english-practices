import React, { memo } from 'react';

/**
 * Memoized Sentence Component - CRITICAL for performance
 * Only re-renders when text/highlights/collocations change, NOT when selectedWord changes.
 * This prevents expensive re-renders of all sentences on each word click.
 * 
 * Collocations are rendered as grouped units with special styling.
 * Study highlights (from Sentence Study) shown in amber.
 * Unclear sentences (from Sentence Study) shown with colored left borders.
 */

// Get sentence container class based on unclear type
const getUnclearSentenceClass = (unclearInfo) => {
    if (!unclearInfo) return '';
    switch (unclearInfo.unclear_choice) {
        case 'vocabulary':
            return 'border-l-4 border-category-orange bg-category-orange/5 pl-2 -ml-2';
        case 'grammar':
            return 'border-l-4 border-category-blue bg-category-blue/5 pl-2 -ml-2';
        case 'both':
            return 'border-l-4 border-category-red bg-category-red/5 pl-2 -ml-2';
        default:
            return 'border-l-4 border-category-yellow bg-category-yellow/5 pl-2 -ml-2';
    }
};

const MemoizedSentence = memo(function MemoizedSentence({
    text,
    highlightSet,
    studyHighlightSet,  // Words looked up during Sentence Study (shown in amber)
    showHighlights,
    collocations = [],  // Array of {text, start_word_idx, end_word_idx}
    unclearInfo = null  // {sentence_index, unclear_choice, max_simplify_stage} if sentence was unclear
}) {
    if (!text) return null;

    // Split into words while preserving original tokens for rendering
    const tokens = text.split(/(\s+)/);
    const words = [];
    const wordIndexMap = {};  // Map word index to token index

    // Build word list and index mapping
    tokens.forEach((token, tokenIdx) => {
        if (/\S/.test(token)) {  // Non-whitespace token
            wordIndexMap[words.length] = tokenIdx;
            words.push(token);
        }
    });

    // Filter out overlapping collocations - keep first one encountered, skip later overlaps
    // This prevents bugs where overlapping collocations cause words to be skipped
    const usedWordIndices = new Set();
    const filteredCollocations = [];

    for (const coll of collocations) {
        // Check if any word in this collocation is already used
        let hasOverlap = false;
        for (let i = coll.start_word_idx; i <= coll.end_word_idx; i++) {
            if (usedWordIndices.has(i)) {
                hasOverlap = true;
                break;
            }
        }

        if (!hasOverlap) {
            filteredCollocations.push(coll);
            // Mark all words as used
            for (let i = coll.start_word_idx; i <= coll.end_word_idx; i++) {
                usedWordIndices.add(i);
            }
        }
    }

    // Build a map of which word indices are part of which collocation
    const wordToCollocation = {};
    filteredCollocations.forEach(coll => {
        for (let i = coll.start_word_idx; i <= coll.end_word_idx; i++) {
            wordToCollocation[i] = coll;
        }
    });

    // Render tokens with collocation grouping
    let wordIdx = 0;
    const rendered = [];
    let i = 0;

    while (i < tokens.length) {
        const token = tokens[i];

        // Whitespace - render as-is
        if (!/\S/.test(token)) {
            rendered.push(<span key={`ws-${i}`}>{token}</span>);
            i++;
            continue;
        }

        // Check if this word is part of a collocation
        const collocInfo = wordToCollocation[wordIdx];

        if (collocInfo && wordIdx === collocInfo.start_word_idx) {
            // Start of a collocation - render the entire collocation as a unit
            const collocationTokens = [];
            let endTokenIdx = i;

            // Collect all tokens (including spaces) until end of collocation
            for (let wIdx = collocInfo.start_word_idx; wIdx <= collocInfo.end_word_idx; wIdx++) {
                const tokenIdx = wordIndexMap[wIdx];
                // Include this word token
                collocationTokens.push(tokens[tokenIdx]);
                // Include following space if exists and not at end
                if (wIdx < collocInfo.end_word_idx && tokenIdx + 1 < tokens.length) {
                    collocationTokens.push(tokens[tokenIdx + 1]);
                }
                endTokenIdx = tokenIdx + 1;
            }

            const collocationText = collocationTokens.join('');

            // Check if this collocation/phrase was looked up during Sentence Study
            const phraseText = collocInfo.text.toLowerCase();
            const isStudiedPhrase = showHighlights && studyHighlightSet?.has(phraseText);

            // Amber for studied phrases, golden dashed border for detected but not studied
            const phraseClassName = isStudiedPhrase
                ? 'reading-word cursor-pointer px-0.5 text-category-amber border-b-2 border-category-amber bg-category-amber/10'
                : 'reading-word cursor-pointer px-0.5 border-b-2 border-dashed border-neon-gold hover:bg-neon-gold/10 hover:text-neon-gold';

            rendered.push(
                <span
                    key={`coll-${collocInfo.start_word_idx}`}
                    data-word={phraseText}
                    data-key-word={collocInfo.key_word}
                    data-sentence={text}
                    data-collocation="true"
                    className={phraseClassName}
                    title={isStudiedPhrase ? `📚 You looked this up: ${collocInfo.text}` : `Phrase: ${collocInfo.text}`}
                >
                    {collocationText}
                </span>
            );

            // Skip to after the collocation
            wordIdx = collocInfo.end_word_idx + 1;
            i = endTokenIdx;
            continue;
        }

        // Regular word (not part of collocation start)
        if (collocInfo) {
            // Part of collocation but not start - skip (already rendered)
            wordIdx++;
            i++;
            continue;
        }

        // Regular standalone word
        const clean = token.replace(/[^a-zA-Z'-]/g, '').toLowerCase();
        const isWord = /^[a-zA-Z'-]+$/.test(clean);

        if (!isWord) {
            rendered.push(<span key={`tok-${i}`}>{token}</span>);
        } else {
            const isVocabHighlighted = showHighlights && highlightSet?.has(clean);
            const isStudyHighlighted = showHighlights && studyHighlightSet?.has(clean);

            // Priority: Study highlight (amber) > Vocab highlight (green) > Normal
            let className = 'reading-word cursor-pointer px-0.5 ';
            if (isStudyHighlighted) {
                // Amber for words looked up during Sentence Study
                className += 'text-category-amber border-b border-category-amber/50 bg-category-amber/10';
            } else if (isVocabHighlighted) {
                // Green for vocabulary highlights
                className += 'text-accent-primary border-b border-accent-primary/50';
            } else {
                className += 'hover:text-accent-primary hover:bg-accent-primary/10';
            }

            rendered.push(
                <span
                    key={`word-${i}`}
                    data-word={clean}
                    data-sentence={text}
                    className={className}
                    title={isStudyHighlighted ? '📚 You looked this up during study' : undefined}
                >
                    {token}
                </span>
            );
        }

        wordIdx++;
        i++;
    }

    // Determine sentence container class based on unclear status
    const sentenceClass = unclearInfo
        ? `mb-6 cursor-pointer hover:bg-opacity-20 ${getUnclearSentenceClass(unclearInfo)}`
        : 'mb-6';

    return (
        <p
            className={sentenceClass}
            title={unclearInfo ? `❓ Click to see explanation (${unclearInfo.unclear_choice || 'unclear'})` : undefined}
            data-unclear-sentence={unclearInfo ? 'true' : undefined}
            data-sentence-text={unclearInfo ? text : undefined}
            data-unclear-choice={unclearInfo?.unclear_choice}
        >
            {rendered}
        </p>
    );
}, (prev, next) => {
    // Custom comparator to optimize performance
    // Returns true if props are equal (skip render)

    if (prev.text !== next.text) return false;
    if (prev.showHighlights !== next.showHighlights) return false;
    if (prev.studyHighlightSet !== next.studyHighlightSet) return false; // This changes rarely
    if (prev.unclearInfo !== next.unclearInfo) return false;
    if (prev.collocations !== next.collocations) return false;

    // Check highlightSet change
    if (prev.highlightSet !== next.highlightSet) {
        // If highlightSet changed, we check if we can skip this update.
        // If the change was caused by marking a specific word, and this sentence
        // doesn't contain that word, we can skip re-rendering.
        if (next.lastModifiedWord) {
            const lowerText = next.text.toLowerCase();
            // Use includes for fast check. Safe false positive (includes substring)
            // is better than false negative.
            if (!lowerText.includes(next.lastModifiedWord)) {
                return true; // Skip render
            }
        }
        return false; // Re-render
    }

    return true;
});

export default MemoizedSentence;
