import React, { useMemo } from 'react';
import { useDictionary } from '../../context/DictionaryContext';

const StoryReader = ({ story }) => {
    const { openDictionary } = useDictionary();

    if (!story) return null;

    const processedContent = useMemo(() => {
        let content = story.content || "";

        // Replace markdown bold/italic
        content = content
            .replace(/\n/g, '<br />')
            .replace(/\*\*(.*?)\*\*/g, '<span class="bg-neon-green/10 text-neon-green px-1 border-b border-neon-green font-bold">$1</span>')
            .replace(/\*(.*?)\*/g, '<em class="text-ink-muted">$1</em>');

        // Highlight phrases
        if (story.highlights && story.highlights.length > 0) {
            story.highlights.forEach(phrase => {
                const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`(${escaped})`, 'gi');
                content = content.replace(regex, '<span class="bg-neon-green/10 text-neon-green px-1 border-b border-neon-green font-bold" title="Target Tense">$1</span>');
            });
        }
        return content;
    }, [story]);

    const handleWordClick = (e) => {
        // 1. Get the range/caret position
        let range;
        let textNode;
        let offset;

        if (document.caretRangeFromPoint) {
            range = document.caretRangeFromPoint(e.clientX, e.clientY);
            if (range) {
                textNode = range.startContainer;
                offset = range.startOffset;
            }
        } else if (document.caretPositionFromPoint) {
            const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
            if (pos) {
                textNode = pos.offsetNode;
                offset = pos.offset;
            }
        }

        // 2. Verify we hit a text node
        if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;

        // 3. Expand from offset to get word
        const text = textNode.textContent;
        let start = offset;
        while (start > 0 && /[\w']/.test(text[start - 1])) start--;
        let end = offset;
        while (end < text.length && /[\w']/.test(text[end])) end++;

        const word = text.substring(start, end).trim();
        const cleanWord = word.replace(/^[^\w]+|[^\w]+$/g, '');

        if (cleanWord.length > 0) {
            console.log(`Word clicked: "${cleanWord}"`);
            // Try to get sentence context (parent element text)
            let sentence = "Context unavailable";
            try { sentence = textNode.parentElement.innerText; } catch (err) { }

            openDictionary(cleanWord, sentence);
        }
    };

    return (
        <div className="mb-12 animate-fade-in-up">
            <div className="flex justify-between items-end mb-4 ml-1">
                <h3 className="text-xs uppercase tracking-wider text-ink-muted font-bold font-mono">
                    Context Story
                </h3>
                <span className="text-[10px] text-neon-green/80 bg-neon-green/10 px-2 py-0.5 border border-neon-green/20 font-mono select-none">
                    CLICK TO DEFINE
                </span>
            </div>

            <div className="bg-bg-paper border border-ink-faint p-8 shadow-hard relative overflow-hidden group">
                <h3 className="text-2xl font-serif font-bold mb-6 text-ink border-b border-ink-faint pb-4">
                    {story.title || `${story.target_tense} Story`}
                </h3>

                <div
                    role="region"
                    aria-label={`Story content: ${story.title || 'Practice text'}`}
                    className="prose prose-invert max-w-none 
                        font-serif text-lg leading-loose text-ink/90
                        prose-p:mb-6 prose-strong:text-neon-green prose-em:text-ink-muted"
                    dangerouslySetInnerHTML={{ __html: processedContent }}
                    onClick={handleWordClick}
                />

                {story.grammar_notes && story.grammar_notes.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-ink-faint text-ink-muted font-mono text-sm">
                        <h4 className="font-bold text-neon-pink uppercase tracking-widest mb-3 text-xs">Grammar Notes</h4>
                        <ul className="list-disc list-inside space-y-2 marker:text-neon-pink">
                            {story.grammar_notes.map((note, idx) => (
                                <li key={idx}>{note}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StoryReader;
