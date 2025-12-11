import React from 'react';

const TenseTabs = ({ currentLayer, onChange }) => {
    const layers = [
        { id: 'present', label: 'Present' },
        { id: 'past', label: 'Past' },
        { id: 'future', label: 'Future' },
        { id: 'past_future', label: 'Past Future' }
    ];

    return (
        <div
            className="flex p-1 bg-[#0f172a] rounded-xl border border-white/10"
            role="tablist"
            aria-label="Tense selection"
        >
            {layers.map(layer => (
                <button
                    key={layer.id}
                    role="tab"
                    aria-selected={currentLayer === layer.id}
                    aria-controls={`panel-${layer.id}`}
                    id={`tab-${layer.id}`}
                    onClick={() => onChange(layer.id)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-sky-400 ${currentLayer === layer.id
                            ? 'bg-sky-400/10 text-sky-400'
                            : 'text-slate-400 hover:text-white'
                        }`}
                >
                    {layer.label}
                </button>
            ))}
        </div>
    );
};

export default TenseTabs;
