import React from 'react';
import { showToast } from '../../utils/toast'; // Need to create this or use a library

const MatrixGrid = ({ data, onCellClick }) => {
    const aspects = ['simple', 'perfect', 'progressive', 'perfect_progressive'];
    const forms = ['affirmative', 'negative', 'question', 'when'];

    return (
        <div className="w-full">
            {/* Desktop Header */}
            <div className="hidden md:grid grid-cols-[120px_1fr_1fr_1fr_1fr] bg-bg-elevated border-b border-ink-faint text-xs text-ink-muted uppercase font-mono tracking-wider px-6 py-3 min-w-[800px]">
                <div>Form</div>
                <div>Simple</div>
                <div>Perfect</div>
                <div>Progressive</div>
                <div>Perfect Prog.</div>
            </div>

            <div className="flex flex-col md:block">
                {forms.map(form => {
                    let label = form.charAt(0).toUpperCase() + form.slice(1);
                    if (form === 'when') label = 'When?';

                    return (
                        <div key={form} className="flex flex-col md:grid md:grid-cols-[120px_1fr_1fr_1fr_1fr] p-4 md:p-6 border-b border-ink-faint transition-colors hover:bg-white/5 group bg-bg-paper md:bg-transparent mb-4 md:mb-0 shadow-sm md:shadow-none min-w-0 md:min-w-[800px]">
                            {/* Row Header / Card Title */}
                            <div className="text-sm md:text-xs text-neon-cyan md:text-ink-muted uppercase font-bold mb-3 md:mb-0 md:mt-1 font-mono group-hover:text-neon-pink transition-colors border-b md:border-none border-ink-faint pb-2 md:pb-0">
                                {label}
                            </div>

                            {aspects.map((aspect, idx) => {
                                const text = data[aspect] ? data[aspect][form] : '—';
                                const aspectLabel = ['Simple', 'Perfect', 'Progressive', 'Perfect Prog.'][idx];

                                return (
                                    <div key={aspect} className="mb-3 md:mb-0 last:mb-0">
                                        {/* Mobile Aspect Label */}
                                        <div className="block md:hidden text-[10px] text-ink-muted uppercase tracking-widest mb-1 font-bold">
                                            {aspectLabel}
                                        </div>

                                        <button
                                            className="pr-0 md:pr-4 text-base md:text-sm font-mono text-ink cursor-pointer transition-colors hover:text-neon-green text-left w-full focus:outline-none focus:text-neon-green active:opacity-70 bg-bg md:bg-transparent p-3 md:p-0 border md:border-none border-ink-faint md:rounded-none rounded-sm"
                                            title="Click to Practice, Shift+Click to Copy"
                                            aria-label={`Practice ${aspect.replace('_', ' ')} ${form}: ${text}`}
                                            onClick={(e) => onCellClick(e, aspect, text)}
                                        >
                                            {text}
                                        </button>
                                    </div>
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
