import React, { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';

const TopicInput = ({ className }) => {
    const [inputTopic, setInputTopic] = useState('');
    const [isShake, setIsShake] = useState(false);
    const { loadTheme, loading } = useTheme();

    const handleLoad = async () => {
        if (!inputTopic.trim()) {
            setIsShake(true);
            setTimeout(() => setIsShake(false), 500);
            return;
        }
        await loadTheme(inputTopic.trim());
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleLoad();
    };

    return (
        <motion.div
            className={`relative ${className || ''}`}
            animate={isShake ? { x: [0, -5, 5, -5, 5, 0] } : {}}
            transition={{ duration: 0.4 }}
        >
            <input
                type="text"
                value={inputTopic}
                onChange={(e) => setInputTopic(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter topic..."
                autoComplete="off"
                disabled={loading}
                aria-label="Enter topic to generate theme"
                aria-invalid={isShake}
                className={`w-full bg-[#0f172a] border text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-all placeholder-slate-500 disabled:opacity-50 ${
                    isShake
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                        : 'border-white/10 focus:border-sky-400 focus:ring-sky-400'
                }`}
            />
            <button
                onClick={handleLoad}
                disabled={loading}
                aria-label="Generate theme"
                className="absolute right-2 top-1.5 p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-white/5 transition-colors disabled:opacity-50"
                title="Generate"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </button>
        </motion.div>
    );
};

export default TopicInput;
