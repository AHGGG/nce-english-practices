import React from 'react';

const TenseTabs = ({ currentLayer, onChange }) => {
    const layers = [
        { id: 'present', label: 'Present' },
        { id: 'past', label: 'Past' },
        { id: 'future', label: 'Future' },
        { id: 'past_future', label: 'Past Future' }
    ];

    return (
        <div className="flex p-1 bg-[#0f172a] rounded-xl border border-white/10">
            {layers.map(layer => (
                <button
                    key={layer.id}
                    onClick={() => onChange(layer.id)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${currentLayer === layer.id
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
