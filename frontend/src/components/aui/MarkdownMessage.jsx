import React from 'react';

const MarkdownMessage = ({ content }) => {
    if (!content) return null;

    // Simple replacement for bold/italic/code basics without a heavy lib
    // In production, use react-markdown
    const processText = (text) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-neon-green">$1</strong>')
            .replace(/`([^`]+)`/g, '<code class="bg-[#111] border border-[#333] px-1 rounded text-neon-pink font-mono text-xs">$1</code>')
            .replace(/\n/g, '<br/>');
    };

    return (
        <div
            className="p-4 bg-[#111] border border-[#333] rounded-lg font-serif text-ink leading-relaxed shadow-sm max-w-xl"
            dangerouslySetInnerHTML={{ __html: processText(content) }}
        />
    );
};

export default MarkdownMessage;
