import React from 'react';

const TabButton = ({ id, icon: Icon, label, isActive, onClick }) => (
    <button
        role="tab"
        aria-selected={isActive}
        aria-controls={`panel-${id}`}
        id={`tab-${id}`}
        onClick={() => onClick(id)}
        className={`flex items-center gap-2 px-6 py-3 font-mono font-bold uppercase transition-all whitespace-nowrap ${isActive
            ? 'text-neon-cyan border-b-2 border-neon-cyan bg-neon-cyan/5'
            : 'text-ink-muted hover:text-ink'
            }`}
    >
        <Icon size={18} aria-hidden="true" />
        {label}
    </button>
);

export default TabButton;
