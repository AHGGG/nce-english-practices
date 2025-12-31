import React from 'react';

/**
 * KPI Card - Main metric display card
 */
export const KPICard = ({ icon: Icon, value, label, sublabel, color }) => (
    <div className="bg-bg-paper border border-ink-faint p-4 md:p-6 shadow-hard relative group hover:border-ink transition-colors">
        <div className={`absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-${color}/30`}></div>
        <div className="flex items-start justify-between mb-2">
            <Icon className={`text-${color} opacity-70`} size={20} />
        </div>
        <div className={`text-2xl md:text-3xl font-mono font-bold text-${color} mb-1`}>{value}</div>
        <div className="text-sm font-serif text-ink">{label}</div>
        <div className="text-xs font-mono text-ink-muted mt-1">{sublabel}</div>
    </div>
);

export default KPICard;
