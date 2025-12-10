import React, { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';

const TopicInput = ({ className }) => {
    const [inputTopic, setInputTopic] = useState('');
    const { loadTheme, loading } = useTheme();

    const handleLoad = async () => {
        if (!inputTopic.trim()) return;
        await loadTheme(inputTopic.trim());
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleLoad();
    };

    return (
        <div className={`relative ${className || ''}`}>
            <input
                type="text"
                value={inputTopic}
                onChange={(e) => setInputTopic(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter topic..."
                autoComplete="off"
                disabled={loading}
                className="w-full bg-[#0f172a] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all placeholder-slate-500 disabled:opacity-50"
            />
            <button
                onClick={handleLoad}
                disabled={loading}
                className="absolute right-2 top-1.5 p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-white/5 transition-colors disabled:opacity-50"
                title="Generate"
            >
                {loading ? <div className="w-4 h-4 border-2 border-slate-500 border-t-sky-400 rounded-full animate-spin"></div> : '✨'}
            </button>
        </div>
    );
};

export default TopicInput;
