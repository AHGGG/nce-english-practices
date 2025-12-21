import React, { useState } from 'react';

const FlashCardStack = ({ words = [], show_translation = true }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    if (!words || words.length === 0) return null;

    const handleNext = () => {
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev + 1) % words.length);
    };

    const currentWord = words[currentIndex];

    return (
        <div className="w-full max-w-sm mx-auto perspective-1000">
            <div
                className="relative h-48 w-full cursor-pointer group"
                onClick={() => setIsFlipped(!isFlipped)}
            >
                <div className={`
             absolute inset-0 w-full h-full text-center flex flex-col items-center justify-center p-6
             bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl transition-all duration-500
             backface-hidden
             ${isFlipped ? 'rotate-y-180 opacity-0 pointer-events-none' : 'rotate-y-0 opacity-100'}
        `}>
                    <span className="text-sm text-zinc-500 uppercase tracking-widest mb-4">Word {currentIndex + 1}/{words.length}</span>
                    <h3 className="text-3xl font-serif text-zinc-100">{currentWord}</h3>
                    <p className="mt-4 text-xs text-neon-green animate-pulse">Tap to reveal</p>
                </div>

                <div className={`
             absolute inset-0 w-full h-full text-center flex flex-col items-center justify-center p-6
             bg-zinc-800 border border-zinc-600 rounded-xl shadow-xl transition-all duration-500
             backface-hidden rotate-y-180
             ${isFlipped ? 'opacity-100 rotate-y-0' : 'opacity-0'}
        `}>
                    <h3 className="text-2xl font-serif text-zinc-300">{currentWord}</h3>
                    {show_translation && (
                        <p className="mt-4 text-lg text-neon-pink">Translation Placeholder</p>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        className="mt-6 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm text-white transition"
                    >
                        Next Word
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FlashCardStack;
