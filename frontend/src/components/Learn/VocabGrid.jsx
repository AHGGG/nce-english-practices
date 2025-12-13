import React from 'react';
import { Tag } from '../ui'; // Assuming Tag might be useful, or just manual styling 

const VocabCard = ({ label, value }) => (
    <div className="bg-bg-paper rounded-none border border-ink-faint p-4 flex flex-col gap-2 transition-all hover:border-neon-cyan hover:shadow-[4px_4px_0px_0px_rgba(6,182,212,0.2)] group">
        <span className="text-[10px] uppercase tracking-widest font-bold text-ink-muted font-mono border-b border-ink-faint pb-1 mb-1 group-hover:text-neon-cyan transition-colors">
            {label}
        </span>
        <span className="text-sm text-ink font-mono leading-tight break-words">
            {value || <span className="text-ink-muted opacity-50">N/A</span>}
        </span>
    </div>
);

const VocabGrid = ({ vocab }) => {
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
        <div className="mb-12 animate-fade-in-up">
            <h3 className="text-xs uppercase tracking-wider text-ink-muted font-bold mb-4 ml-1 font-mono flex items-center gap-2">
                <span className="w-2 h-2 bg-neon-cyan rounded-full"></span>
                Core Data Slots
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => (
                    <VocabCard key={item.label} label={item.label} value={item.value} />
                ))}
            </div>
        </div>
    );
};

export default VocabGrid;
