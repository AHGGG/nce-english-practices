import React from 'react';

const TabButton = ({ id, icon: Icon, label, activeTab, onClick }) => (
    <button
        role="tab"
        aria-selected={activeTab === id}
        aria-controls={`${id}-panel`}
        id={`${id}-tab`}
        onClick={() => onClick(id)}
        className={`flex items-center gap-2 px-6 py-3 font-mono font-bold uppercase transition-all whitespace-nowrap ${activeTab === id
            ? 'text-neon-cyan border-b-2 border-neon-cyan bg-neon-cyan/5'
            : 'text-ink-muted hover:text-ink'
            }`}
    >
        <Icon size={18} aria-hidden="true" />
        <span>{label}</span>
    </button>
);

export default TabButton;
