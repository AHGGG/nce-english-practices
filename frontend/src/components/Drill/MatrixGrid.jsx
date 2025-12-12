import React from 'react';
import { showToast } from '../../utils/toast'; // Need to create this or use a library

const MatrixGrid = ({ data, onCellClick }) => {
    const aspects = ['simple', 'perfect', 'progressive', 'perfect_progressive'];
    const forms = ['affirmative', 'negative', 'question', 'when'];

    return (
        <div className="bg-[#0f172a]/50 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden w-full overflow-x-auto shadow-xl">
            <div className="grid grid-cols-[120px_1fr_1fr_1fr_1fr] bg-slate-900/80 border-b border-white/5 text-xs text-slate-400 uppercase font-semibold p-4 md:px-6 md:py-4 min-w-[800px]">
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
                        <div key={form} className="grid grid-cols-[120px_1fr_1fr_1fr_1fr] p-6 border-b border-white/5 transition-colors hover:bg-white/5">
                            <div className="text-sm text-slate-400 uppercase font-semibold mt-1">{label}</div>
                            {aspects.map(aspect => {
                                const text = data[aspect] ? data[aspect][form] : '—';
                                return (
                                    <button
                                        key={aspect}
                                        className="pr-4 text-[0.95rem] text-slate-200 cursor-pointer transition-colors hover:text-white text-left w-full focus:outline-none focus:underline decoration-sky-400 decoration-2 underline-offset-4"
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
