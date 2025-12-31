import React from 'react';

/**
 * Card - Section wrapper with title and icon
 */
const Card = ({ title, icon: Icon, children }) => (
    <div className="bg-bg-paper border border-ink-faint shadow-hard">
        <div className="p-4 border-b border-ink-faint flex items-center gap-2 bg-bg-elevated">
            <Icon size={16} className="text-neon-cyan" />
            <h3 className="font-mono font-bold text-ink uppercase tracking-wider text-sm">{title}</h3>
        </div>
        <div className="p-4">{children}</div>
    </div>
);

export default Card;
