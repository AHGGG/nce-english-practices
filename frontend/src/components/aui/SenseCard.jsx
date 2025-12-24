/**
 * SenseCard - Grouping component for context resources sharing the same meaning
 */
import React from 'react';

const SenseCard = ({
    senseIndex,
    definition,
    definitionCn,
    partOfSpeech,
    synonyms = [],
    children
}) => {
    return (
        <div className="border border-ink/10 rounded-lg overflow-hidden bg-canvas/30 mb-4">
            {/* Sense Header */}
            <div className="p-3 bg-ink/5 border-b border-ink/5">
                <div className="flex items-start gap-3">
                    {/* Index Badge */}
                    <div className="flex-shrink-0 w-6 h-6 rounded bg-neon-purple/20 text-neon-purple flex items-center justify-center text-xs font-mono font-bold">
                        {senseIndex || '#'}
                    </div>

                    <div className="flex-1 min-w-0">
                        {/* Definition Row */}
                        <div className="flex items-baseline gap-2 flex-wrap">
                            {partOfSpeech && (
                                <span className="text-xs font-mono text-ink/40 uppercase tracking-wide">
                                    {partOfSpeech}
                                </span>
                            )}
                            <h4 className="text-ink font-medium leading-snug">
                                {definition}
                            </h4>
                        </div>

                        {/* Chinese Definition */}
                        {definitionCn && (
                            <p className="text-ink/80 text-sm mt-1">
                                {definitionCn}
                            </p>
                        )}

                        {/* Synonyms */}
                        {synonyms && synonyms.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-2">
                                <span className="text-[10px] text-ink/30 uppercase tracking-wider">Synonyms</span>
                                {synonyms.map((syn, i) => (
                                    <span
                                        key={i}
                                        className="text-xs px-1.5 py-0.5 rounded bg-ink/5 text-ink/50"
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
