import React from 'react';

const VocabCard = ({ label, value }) => (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5 flex flex-col gap-1 transition-all hover:bg-slate-800/80 group">
        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 group-hover:text-sky-400 transition-colors">
            {label}
        </span>
        <span className="text-lg text-slate-200 font-medium leading-tight">
            {value || '—'}
        </span>
    </div>
);

const VocabGrid = ({ vocab }) => {
    if (!vocab) return null;

    const { slots, verbs } = vocab;
    const verbDisplay = verbs && verbs.length > 0 ? `${verbs[0].base} / ${verbs[0].past}` : '—';

    const items = [
        { label: 'Subject', value: (slots.subject || []).join(', ') },
        { label: 'Verb', value: verbDisplay },
        { label: 'Object', value: (slots.object || []).join(', ') },
        { label: 'Manner', value: (slots.manner || []).join(', ') },
        { label: 'Place', value: (slots.place || []).join(', ') },
        { label: 'Time', value: (slots.time || []).join(', ') }
    ];

    return (
        <div className="mb-8 animate-fade-in-up">
            <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-4 ml-1">
                Core Vocabulary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                    <VocabCard key={item.label} label={item.label} value={item.value} />
                ))}
            </div>
        </div>
    );
};

export default VocabGrid;
