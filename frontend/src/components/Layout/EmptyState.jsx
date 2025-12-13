import React from 'react';
import { Terminal, Zap } from 'lucide-react';
import TopicInput from './TopicInput';

const EmptyState = () => {
    return (
        <div className="flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700 h-full w-full">
            <div className="max-w-md w-full flex flex-col items-center gap-6">
                {/* Icon decoration */}
                <div className="relative">
                    <div className="absolute -inset-4 bg-neon-green/5 blur-xl rounded-full"></div>
                    <div className="w-16 h-16 border-2 border-neon-green/30 bg-bg-elevated flex items-center justify-center relative">
                        <Terminal size={32} className="text-neon-green" />
                        <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-neon-green"></div>
                        <div className="absolute bottom-0 left-0 w-1.5 h-1.5 bg-neon-green"></div>
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-xl font-serif font-bold text-ink tracking-tight">System Standby</h3>
                    <p className="text-sm font-mono text-ink-muted">
                        Initialize a subject to begin neural training sequence.
                    </p>
                </div>

                <div className="w-full max-w-sm mt-4">
                    <TopicInput className="w-full shadow-lg shadow-neon-green/5" />
                </div>

                <div className="flex items-center gap-2 mt-8 text-[10px] font-mono text-ink-muted/50 uppercase tracking-widest">
                    <Zap size={10} />
                    <span>Awaiting Input</span>
                </div>
            </div>
        </div>
    );
};

export default EmptyState;
