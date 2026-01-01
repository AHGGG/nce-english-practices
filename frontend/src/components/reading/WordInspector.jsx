import React from 'react';
import { Volume2, X, Bookmark, Loader2 } from 'lucide-react';
import DictionaryResults from '../aui/DictionaryResults';

/**
 * Word Inspector Panel - Shows dictionary definition for selected word
 */
const WordInspector = ({
    selectedWord,
    inspectorData,
    isInspecting,
    onClose,
    onPlayAudio,
    onMarkAsKnown
}) => {
    if (!selectedWord) return null;

    return (
        <div className="fixed inset-0 z-[60] pointer-events-none flex flex-col justify-end md:justify-center md:items-end md:pr-8">
            {/* Backdrop for mobile only */}
            <div
                className="absolute inset-0 bg-black/80 md:bg-black/50 pointer-events-auto"
                onClick={onClose}
            ></div>

            {/* Card - Sharp Industrial Style */}
            <div className="pointer-events-auto relative w-full md:w-[420px] bg-[#0A0A0A] border-t md:border border-[#333] md:shadow-[4px_4px_0px_0px_rgba(0,255,148,0.2)] overflow-hidden flex flex-col max-h-[80vh] md:max-h-[85vh]">
                {/* Header */}
                <div className="p-4 border-b border-[#333] flex items-center justify-between bg-[#111] shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-xl font-serif font-bold text-white">{selectedWord}</span>
                        <button
                            onClick={() => onPlayAudio(selectedWord)}
                            className="w-8 h-8 flex items-center justify-center border border-[#333] text-[#00FF94] hover:bg-[#00FF94] hover:text-black transition-colors"
                        >
                            <Volume2 className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center border border-[#333] text-[#666] hover:border-[#FF0055] hover:text-[#FF0055] transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content - Using DictionaryResults */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {isInspecting ? (
                        <div className="flex flex-col items-center justify-center py-8 text-[#666] space-y-3">
                            <Loader2 className="w-6 h-6 animate-spin text-[#00FF94]" />
                            <span className="text-xs uppercase tracking-widest font-mono">Consulting Dictionary...</span>
                        </div>
                    ) : inspectorData?.found && inspectorData?.entries?.length > 0 ? (
                        <DictionaryResults
                            word={selectedWord}
                            source="LDOCE"
                            entries={inspectorData.entries}
                        />
                    ) : inspectorData?.found === false ? (
                        <div className="text-[#888] text-center py-8">
                            <p className="text-lg mb-2 font-serif">Word not found</p>
                            <p className="text-sm font-mono">"{selectedWord}" is not in LDOCE dictionary.</p>
                        </div>
                    ) : (
                        <div className="text-[#FF0055] text-center text-sm py-8 font-mono">Failed to load definition</div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-[#333] bg-[#111] shrink-0 flex gap-2">
                    <button
                        onClick={() => onMarkAsKnown(selectedWord)}
                        className="flex-1 bg-[#1A1A1A] border border-[#333] text-[#888] py-3 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#222] hover:text-white transition-all active:translate-y-[1px]"
                    >
                        Mark Known
                    </button>
                    <button className="flex-[2] bg-[#E0E0E0] text-black py-3 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] transition-all active:translate-y-[1px]">
                        <Bookmark className="w-4 h-4" />
                        Add to Review
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WordInspector;
