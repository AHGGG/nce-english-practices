import React, { memo } from 'react';

/**
 * Memoized Sentence Component - CRITICAL for performance
 * Only re-renders when text/highlights change, NOT when selectedWord changes.
 * This prevents expensive re-renders of all sentences on each word click.
 */
const MemoizedSentence = memo(function MemoizedSentence({ text, highlightSet, showHighlights }) {
    if (!text) return null;

    // Split by spaces but keep delimiters to preserve spacing
    const tokens = text.split(/(\s+|[.,!?;:"'()])/);

    return (
        <p className="mb-6">
            {tokens.map((token, i) => {
                const clean = token.replace(/[^a-zA-Z'-]/g, '').toLowerCase();
                const isWord = /^[a-zA-Z'-]+$/.test(clean);

                if (!isWord) return <span key={i}>{token}</span>;

                // Highlight based on vocabulary list
                const isHighlighted = showHighlights && highlightSet?.has(clean);

                // Use data-word for CSS-based selection highlighting (no React re-render)
                return (
                    <span
                        key={i}
                        data-word={clean}
                        data-sentence={text}
                        className={`reading-word cursor-pointer px-0.5 ${isHighlighted
                            ? 'text-[#00FF94] border-b border-[#00FF94]/50'
                            : 'hover:text-[#00FF94] hover:bg-[#00FF94]/10'
                            }`}
                    >
                        {token}
                    </span>
                );
            })}
        </p>
    );
});

export default MemoizedSentence;
