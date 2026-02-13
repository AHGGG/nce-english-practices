import { useState } from "react";
import type { KeyboardEvent } from "react";

interface WordCard {
  word: string;
  definition?: string | null;
}

type RawWordCard = string | WordCard;

interface FlashCardStackProps {
  words?: RawWordCard[];
  show_translation?: boolean;
  current_index?: number;
  is_flipped?: boolean;
}

const FlashCardStack = ({
  words = [],
  show_translation = true,
  current_index, // Controlled prop from JSON Patch
  is_flipped, // Controlled prop from JSON Patch
}: FlashCardStackProps) => {
  // Use internal state only if props are not provided (uncontrolled mode)
  const [internalIndex, setInternalIndex] = useState(0);
  const [internalFlipped, setInternalFlipped] = useState(false);

  // Use controlled props if available, otherwise use internal state
  const currentIndex =
    current_index !== undefined ? current_index : internalIndex;
  const isFlipped = is_flipped !== undefined ? is_flipped : internalFlipped;

  if (!words || words.length === 0) return null;

  const handleNext = () => {
    // Only update internal state if in uncontrolled mode
    if (current_index === undefined && is_flipped === undefined) {
      setInternalFlipped(false);
      setInternalIndex((prev) => (prev + 1) % words.length);
    }
  };

  const handleFlip = () => {
    // Only update internal state if in uncontrolled mode
    if (is_flipped === undefined) {
      setInternalFlipped(!internalFlipped);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleFlip();
    }
  };

  const rawWord = words[currentIndex];
  const currentWordData =
    typeof rawWord === "object"
      ? rawWord
      : { word: rawWord || "", definition: null };

  return (
    <div className="w-full max-w-sm mx-auto perspective-1000">
      <div
        className="relative h-48 w-full cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-green rounded-xl"
        onClick={handleFlip}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <span className="sr-only">
          {isFlipped
            ? `Definition for ${currentWordData.word}. Press Enter to flip back.`
            : `Word: ${currentWordData.word}. Press Enter to reveal definition.`}
        </span>
        <div
          aria-hidden={isFlipped}
          className={`
             absolute inset-0 w-full h-full text-center flex flex-col items-center justify-center p-6
             bg-bg-base border border-border rounded-xl shadow-xl transition-all duration-500
             backface-hidden
             ${isFlipped ? "rotate-y-180 opacity-0 pointer-events-none" : "rotate-y-0 opacity-100"}
        `}
        >
          <span className="text-sm text-text-muted uppercase tracking-widest mb-4">
            Word {currentIndex + 1}/{words.length}
          </span>
          <h3 className="text-3xl font-serif text-text-primary">
            {currentWordData.word}
          </h3>
          <p className="mt-4 text-xs text-neon-green animate-pulse">
            Tap to reveal
          </p>
        </div>

        <div
          aria-hidden={!isFlipped}
          className={`
             absolute inset-0 w-full h-full text-center flex flex-col items-center justify-center p-6
             bg-bg-surface border border-border rounded-xl shadow-xl transition-all duration-500
             backface-hidden rotate-y-180
             ${isFlipped ? "opacity-100 rotate-y-0" : "opacity-0"}
        `}
        >
          <h3 className="text-2xl font-serif text-text-secondary">
            {currentWordData.word}
          </h3>
          {show_translation && (
            <p className="mt-4 text-lg text-neon-pink">
              {currentWordData.definition || "Translation Placeholder"}
            </p>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            disabled={!isFlipped}
            className="mt-6 px-4 py-2 bg-bg-elevated hover:bg-zinc-600 rounded text-sm text-text-primary transition disabled:opacity-0"
          >
            Next Word
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlashCardStack;
