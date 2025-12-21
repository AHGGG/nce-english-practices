import React from 'react';

const VocabGrid = ({ words = [], show_translation = false, challenge_mode = false, monolingual = false }) => {
    if (!words || words.length === 0) return null;

    const getHoverText = (word) => {
        if (monolingual) return `Define: ${word}`;
        return show_translation ? "Translation" : "Tap to Verify";
    };

    return (
        <div className="w-full max-w-2xl bg-[#0A0A0A] border border-[#333] rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-serif text-xl text-white">Vocabulary Review</h3>
                <div className="flex gap-2">
                    {challenge_mode && (
                        <span className="text-[10px] bg-neon-pink/10 text-neon-pink border border-neon-pink/30 px-2 py-1 rounded font-mono uppercase tracking-widest animate-pulse">
                            Recall Challenge
                        </span>
                    )}
                    {monolingual && (
                        <span className="text-[10px] bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 px-2 py-1 rounded font-mono uppercase tracking-widest">
                            English Only
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {words.map((word, idx) => (
                    <div
                        key={idx}
                        className="group relative aspect-square bg-[#111] border border-[#222] rounded-lg hover:border-[#00FF94] transition-all cursor-pointer flex flex-col items-center justify-center p-4 text-center"
                    >
                        {/* Word */}
                        <span className="font-serif text-lg text-white group-hover:scale-110 transition-transform">
                            {word}
                        </span>

                        {/* Translation / Definition Overlay */}
                        <div className="absolute inset-0 bg-[#00FF94]/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg backdrop-blur-sm">
                            <span className="text-black font-bold text-sm">
                                {getHoverText(word)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <p className="mt-4 text-center text-xs text-[#666] font-mono">
                Hover cards to verify meaning
            </p>
        </div>
    );
};

export default VocabGrid;
