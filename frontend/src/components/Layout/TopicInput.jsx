import React, { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, Play } from 'lucide-react';

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
            className={`relative group ${className || ''}`}
            animate={isShake ? { x: [0, -5, 5, -5, 5, 0] } : {}}
            transition={{ duration: 0.4 }}
        >
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-neon-green font-bold text-sm tracking-tighter">{`>`}</span>
            </div>

            <input
                type="text"
                value={inputTopic}
                onChange={(e) => setInputTopic(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Initialize Topic..."
                autoComplete="off"
                disabled={loading}
                className={`w-full bg-bg-elevated border text-ink px-4 py-2.5 pl-8 text-sm font-mono focus:outline-none focus:ring-1 transition-all placeholder:text-ink-muted/50 disabled:opacity-50 ${isShake
                        ? 'border-neon-pink focus:border-neon-pink focus:ring-neon-pink'
                        : 'border-ink-faint focus:border-neon-green focus:ring-neon-green'
                    }`}
            />

            <button
                onClick={handleLoad}
                disabled={loading}
                className="absolute right-2 top-1.5 p-1.5 text-ink-muted hover:text-neon-green transition-colors disabled:opacity-50"
                title="Execute"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
            </button>
        </motion.div>
    );
};

export default TopicInput;
