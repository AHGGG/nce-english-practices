import React from 'react';

const VocabCard = ({ label, value }) => (
    <div className="bg-bg-paper rounded-none border border-ink-faint p-2 md:p-4 flex flex-col gap-1 md:gap-2 transition-all hover:border-neon-cyan hover:shadow-[4px_4px_0px_0px_rgba(6,182,212,0.2)] group h-full">
        <span className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-ink-muted font-mono border-b border-ink-faint pb-1 mb-1 group-hover:text-neon-cyan transition-colors">
            {label}
        </span>
        <span className="text-xs md:text-sm text-ink font-mono leading-tight break-words">
            {value || <span className="text-ink-muted opacity-50">N/A</span>}
        </span>
    </div>
);

const SimpleWordCard = ({ word, definition }) => (
    <div className="bg-surface-100 border border-ink/10 p-6 flex flex-col items-center justify-center gap-2 hover:border-neon-purple transition-all">
        <h3 className="text-xl font-serif text-ink">{word}</h3>
        {definition && <p className="text-sm text-ink/60 text-center">{definition}</p>}
    </div>
);

const VocabGrid = ({ vocab, isCollapsed, mode = 'slots', words = [] }) => {

    // --- COACH MODE ---
    if (mode === 'coach-list') {
        const list = words || [];
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4">
                {list.map((w, idx) => (
                    // Handle if w is string or object
                    <SimpleWordCard
                        key={idx}
                        word={typeof w === 'string' ? w : w.word}
                        definition={typeof w === 'object' ? w.definition : null}
                    />
                ))}
            </div>
        );
    }

    // --- ORIGINAL MODE (Slots) ---
    if (!vocab) return null;

    const { slots, verbs } = vocab;
    const verbDisplay = verbs && verbs.length > 0 ? `${verbs[0].base} → ${verbs[0].past}` : null;

    const items = [
        { label: 'Subject', value: (slots.subject || []).join(', ') },
        { label: 'Verb Action', value: verbDisplay },
        { label: 'Object / Target', value: (slots.object || []).join(', ') },
        { label: 'Manner', value: (slots.manner || []).join(', ') },
        { label: 'Place / Loc', value: (slots.place || []).join(', ') },
        { label: 'Time / Freq', value: (slots.time || []).join(', ') }
    ];

    return (
        <div className="mb-4 transition-all duration-500 ease-in-out">
            {/* Collapsed Summary View */}
            <div
                className={`
                    transition-all duration-500 ease-in-out transform origin-top overflow-hidden
                    ${isCollapsed ? 'opacity-100 max-h-20 translate-y-0 mb-4' : 'opacity-0 max-h-0 -translate-y-4 mb-0'}
                `}
            >
                <div className="flex items-center gap-2 text-xs md:text-sm font-mono text-ink-muted border-b border-ink-faint pb-2 overflow-x-auto no-scrollbar whitespace-nowrap">
                    <span className="w-2 h-2 bg-neon-cyan rounded-full flex-shrink-0"></span>
                    <span className="text-neon-cyan font-bold">CORE SLOTS:</span>
                    {items.map((item, idx) => (
                        <React.Fragment key={item.label}>
                            <span className="text-ink">{item.value}</span>
                            {idx < items.length - 1 && <span className="text-ink-faint">•</span>}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Expanded Grid View */}
            <div
                className={`
                    transition-all duration-500 ease-in-out transform origin-top overflow-hidden
                    ${!isCollapsed ? 'opacity-100 max-h-[1000px] translate-y-0' : 'opacity-0 max-h-0 translate-y-4'}
                `}
            >
                <h3 className="text-xs uppercase tracking-wider text-ink-muted font-bold mb-4 ml-1 font-mono flex items-center gap-2">
                    <span className="w-2 h-2 bg-neon-cyan rounded-full"></span>
                    Core Data Slots
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
                    {items.map((item) => (
                        <VocabCard key={item.label} label={item.label} value={item.value} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default VocabGrid;
