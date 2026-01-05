import React, { memo } from 'react';

/**
 * Memoized Sentence Component - CRITICAL for performance
 * Only re-renders when text/highlights/collocations change, NOT when selectedWord changes.
 * This prevents expensive re-renders of all sentences on each word click.
 * 
 * Collocations are rendered as grouped units with special styling.
 * Study highlights (from Sentence Study) shown in amber.
 */
const MemoizedSentence = memo(function MemoizedSentence({
    text,
    highlightSet,
    studyHighlightSet,  // NEW: Words looked up during Sentence Study (shown in amber)
    showHighlights,
    collocations = []  // Array of {text, start_word_idx, end_word_idx}
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

            rendered.push(
                <span
                    key={`coll-${collocInfo.start_word_idx}`}
                    data-word={collocInfo.text.toLowerCase()}
                    data-sentence={text}
                    data-collocation="true"
                    className="reading-word cursor-pointer px-0.5 border-b-2 border-dashed border-[#FFD700] hover:bg-[#FFD700]/10 hover:text-[#FFD700]"
                    title={`Phrase: ${collocInfo.text}`}
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
                className += 'text-amber-400 border-b border-amber-400/50 bg-amber-400/10';
            } else if (isVocabHighlighted) {
                // Green for vocabulary highlights
                className += 'text-[#00FF94] border-b border-[#00FF94]/50';
            } else {
                className += 'hover:text-[#00FF94] hover:bg-[#00FF94]/10';
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

    return <p className="mb-6">{rendered}</p>;
});

export default MemoizedSentence;
