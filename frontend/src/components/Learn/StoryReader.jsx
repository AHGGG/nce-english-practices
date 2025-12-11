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
            .replace(/\*\*(.*?)\*\*/g, '<span class="bg-sky-400/20 text-sky-400 px-1 rounded font-medium border border-sky-400/20 shadow-[0_0_10px_rgba(56,189,248,0.2)]">$1</span>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Highlight phrases
        if (story.highlights && story.highlights.length > 0) {
            story.highlights.forEach(phrase => {
                const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`(${escaped})`, 'gi');
                content = content.replace(regex, '<span class="bg-sky-400/20 text-sky-400 px-1 rounded font-medium border border-sky-400/20 shadow-[0_0_10px_rgba(56,189,248,0.2)]" title="Target Tense">$1</span>');
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
        <div className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex justify-between items-end mb-4 ml-1">
                <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                    Context Story
                </h3>
                <span className="text-[10px] text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full border border-white/5 select-none" aria-hidden="true">
                    Tip: Click words to define
                </span>
            </div>
            <div className="bg-[#0f172a]/50 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-xl relative overflow-hidden group">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-sky-400/10 rounded-full blur-3xl group-hover:bg-sky-400/20 transition-all duration-700"></div>

                <h3 className="text-xl font-semibold mb-4 text-white relative z-10">
                    {story.title || `${story.target_tense} Story`}
                </h3>

                <div
                    role="region"
                    aria-label={`Story content: ${story.title || 'Practice text'}`}
                    className="prose prose-invert prose-p:text-slate-300 text-slate-300 font-normal prose-strong:text-sky-400 prose-em:text-indigo-300 leading-relaxed text-lg max-w-none relative z-10 cursor-pointer"
                    dangerouslySetInnerHTML={{ __html: processedContent }}
                    onClick={handleWordClick}
                />

                {story.grammar_notes && story.grammar_notes.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-white/10 text-slate-400">
                        <h4 className="text-sm font-bold mb-2">Grammar Notes</h4>
                        <ul className="list-disc list-inside text-sm space-y-1">
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
