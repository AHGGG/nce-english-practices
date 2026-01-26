import React from 'react';

const DiffCard = ({ original, corrected, label = "Correction" }) => {
    // Simple diff logic visualization (for now just side by side/stacked)
    // Real implementation would use diff-match-patch

    return (
        <div className="w-full max-w-lg bg-bg-surface border border-border rounded-lg overflow-hidden group hover:border-text-muted transition-colors">
            <div className="px-4 py-2 bg-bg-elevated border-b border-border flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-widest text-text-muted font-mono">{label}</span>
            </div>

            <div className="p-4 space-y-4">
                {/* Original (Incorrect) */}
                <div className="relative pl-3 border-l-2 border-accent-danger/50">
                    <p className="font-mono text-xs text-accent-danger/70 mb-1 uppercase tracking-wider">You said</p>
                    <p className="text-text-primary opacity-60 line-through decoration-accent-danger/50 decoration-2">
                        {original}
                    </p>
                </div>

                {/* Corrected */}
                <div className="relative pl-3 border-l-2 border-accent-primary">
                    <p className="font-mono text-xs text-accent-primary mb-1 uppercase tracking-wider">Better</p>
                    <p className="text-text-primary font-medium text-lg">
                        {corrected}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DiffCard;
