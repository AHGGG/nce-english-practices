import React from 'react';

/**
 * Card - Section wrapper with title and icon
 */
// eslint-disable-next-line no-unused-vars
const Card = ({ title, icon: CardIcon, children }) => (
    <div className="bg-bg-surface border border-border mb-6">
        <div className="p-4 border-b border-border flex items-center gap-2 bg-bg-elevated">
            <CardIcon size={16} className="text-accent-primary" />
            <h3 className="font-mono font-bold text-text-primary uppercase tracking-wider text-sm">{title}</h3>
        </div>
        <div className="p-4">{children}</div>
    </div>
);

export default Card;
