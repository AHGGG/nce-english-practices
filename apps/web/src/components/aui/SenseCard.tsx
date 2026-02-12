// @ts-nocheck
/**
 * SenseCard - Grouping component for context resources sharing the same meaning
 */
import React, { useState } from 'react';
import { Languages } from 'lucide-react';

const SenseCard = ({
    senseIndex,
    definition,
    definitionCn,
    partOfSpeech,
    synonyms = [],
    children
}) => {
    const [showCN, setShowCN] = useState(false);

    return (
        <div className="border border-border-subtle rounded-lg overflow-hidden bg-bg-elevated/30 mb-4">
            {/* Sense Header */}
            <div className="p-3 bg-text-primary/5 border-b border-border-subtle">
                <div className="flex items-start gap-3">
                    {/* Index Badge */}
                    <div className="flex-shrink-0 w-6 h-6 rounded bg-neon-purple/20 text-neon-purple flex items-center justify-center text-xs font-mono font-bold">
                        {senseIndex || '#'}
                    </div>

                    <div className="flex-1 min-w-0">
                        {/* Definition Row */}
                        <div className="flex items-baseline gap-2 flex-wrap">
                            {partOfSpeech && (
                                <span className="text-xs font-mono text-text-muted uppercase tracking-wide">
                                    {partOfSpeech}
                                </span>
                            )}
                            <h4 className="text-text-primary font-medium leading-snug">
                                {definition}
                            </h4>
                        </div>

                        {/* Chinese Definition - Hidden by default */}
                        {definitionCn && (
                            <div className="mt-1">
                                {showCN ? (
                                    <p
                                        className="text-text-secondary text-sm cursor-pointer hover:text-text-primary transition-colors"
                                        onClick={() => setShowCN(false)}
                                        title="Click to hide"
                                    >
                                        {definitionCn}
                                    </p>
                                ) : (
                                    <button
                                        onClick={() => setShowCN(true)}
                                        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
                                    >
                                        <Languages className="w-3 h-3" />
                                        <span>Show Meaning</span>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Synonyms */}
                        {synonyms && synonyms.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-2">
                                <span className="text-[10px] text-text-muted uppercase tracking-wider">Synonyms</span>
                                {synonyms.map((syn, i) => (
                                    <span
                                        key={i}
                                        className="text-xs px-1.5 py-0.5 rounded bg-text-primary/5 text-text-secondary"
                                    >
                                        {syn}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Context Cards (Examples) Container */}
            <div className="p-3 space-y-3 bg-dots-pattern">
                {children}
            </div>
        </div>
    );
};

export default SenseCard;
