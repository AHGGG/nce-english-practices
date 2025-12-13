import React from 'react';
import { showToast } from '../../utils/toast'; // Need to create this or use a library

const MatrixGrid = ({ data, onCellClick }) => {
    const aspects = ['simple', 'perfect', 'progressive', 'perfect_progressive'];
    const forms = ['affirmative', 'negative', 'question', 'when'];

    return (
        <div className="bg-bg-paper border border-ink-faint w-full overflow-x-auto shadow-hard">
            <div className="grid grid-cols-[120px_1fr_1fr_1fr_1fr] bg-bg-elevated border-b border-ink-faint text-xs text-ink-muted uppercase font-mono tracking-wider p-4 md:px-6 md:py-3 min-w-[800px]">
                <div>Form</div>
                <div>Simple</div>
                <div>Perfect</div>
                <div>Progressive</div>
                <div>Perfect Prog.</div>
            </div>

            <div className="min-w-[800px]">
                {forms.map(form => {
                    let label = form.charAt(0).toUpperCase() + form.slice(1);
                    if (form === 'when') label = 'When?';

                    return (
                        <div key={form} className="grid grid-cols-[120px_1fr_1fr_1fr_1fr] p-6 border-b border-ink-faint transition-colors hover:bg-white/5 group">
                            <div className="text-xs text-ink-muted uppercase font-bold mt-1 font-mono group-hover:text-neon-pink transition-colors">{label}</div>
                            {aspects.map(aspect => {
                                const text = data[aspect] ? data[aspect][form] : '—';
                                return (
                                    <button
                                        key={aspect}
                                        className="pr-4 text-sm font-mono text-ink cursor-pointer transition-colors hover:text-neon-green text-left w-full focus:outline-none focus:text-neon-green active:opacity-70"
                                        title="Click to Practice, Shift+Click to Copy"
                                        aria-label={`Practice ${aspect.replace('_', ' ')} ${form}: ${text}`}
                                        onClick={(e) => onCellClick(e, aspect, text)}
                                    >
                                        {text}
                                    </button>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MatrixGrid;
