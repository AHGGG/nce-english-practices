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
            className="flex p-1 bg-bg-elevated border-b border-ink-faint overflow-x-auto no-scrollbar"
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
                    className={`px-4 py-2 text-sm font-mono uppercase tracking-wider transition-all focus:outline-none border-b-2 mx-1 whitespace-nowrap flex-none ${currentLayer === layer.id
                        ? 'border-neon-green text-neon-green font-bold bg-neon-green/5'
                        : 'border-transparent text-ink-muted hover:text-ink hover:bg-white/5'
                        }`}
                >
                    {layer.label}
                </button>
            ))}
        </div>
    );
};

export default TenseTabs;
