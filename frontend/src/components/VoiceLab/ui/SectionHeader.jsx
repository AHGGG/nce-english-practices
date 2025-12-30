import React from 'react';

const SectionHeader = ({ title, icon: Icon }) => (
    <div className="flex items-center gap-2 mb-4 mt-8 border-b border-ink-faint pb-2">
        <Icon size={20} className="text-neon-pink" aria-hidden="true" />
        <h2 className="text-xl font-serif font-bold text-ink">{title}</h2>
    </div>
);

export default SectionHeader;
