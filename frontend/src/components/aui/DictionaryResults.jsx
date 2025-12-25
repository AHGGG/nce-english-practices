/**
 * DictionaryResults - AUI Component for displaying parsed dictionary data
 * 
 * Displays structured LDOCE/Collins dictionary entries with:
 * - Headword, pronunciation, part of speech
 * - Senses with definitions and examples
 * - Phrasal verbs
 * - Word Origin (Etymology)
 * - Verb Table (Conjugations)
 * - Thesaurus (Related words)
 * - Collocations
 * - Extra Examples (from corpus)
 */

import React, { useState } from 'react';

const DictionaryResults = ({ word, source, entries = [] }) => {
    const [expandedSections, setExpandedSections] = useState({});

    const toggleSection = (entryIdx, section) => {
        const key = `${entryIdx}-${section}`;
        setExpandedSections(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const isSectionExpanded = (entryIdx, section) => {
        return expandedSections[`${entryIdx}-${section}`];
    };

    if (!entries || entries.length === 0) {
        return (
            <div className="p-4 bg-[#111] border border-[#333] rounded">
                <p className="text-[#666]">Loading dictionary data for <span className="text-white font-bold">{word}</span>...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-[#333]">
                <span className="text-2xl font-serif font-bold text-white">{word}</span>
                <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded">
                    {source}
                </span>
            </div>

            {/* Entries */}
            {entries.map((entry, idx) => (
                <div key={idx} className="bg-[#0A0A0A] border border-[#333] rounded-lg overflow-hidden">
                    {/* Entry Header */}
                    <div className="px-4 py-3 bg-[#111] border-b border-[#333] flex items-center gap-3 flex-wrap">
                        <span className="font-bold text-white">{entry.headword}</span>
                        {entry.homnum && (
                            <span className="text-xs text-[#666]">#{entry.homnum}</span>
                        )}
                        {entry.pos && (
                            <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
                                {entry.pos}
                            </span>
                        )}
                        {entry.pronunciation && (
                            <span className="text-[#888] text-sm font-mono">/{entry.pronunciation}/</span>
                        )}
                    </div>

                    {/* Senses */}
                    <div className="p-4 space-y-4">
                        {entry.senses?.map((sense, sIdx) => (
                            <div key={sIdx} className="space-y-2">
                                {/* Sense Header */}
                                <div className="flex items-start gap-2">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#00FF94]/20 text-[#00FF94] text-xs flex items-center justify-center font-bold">
                                        {sense.index}
                                    </span>
                                    <div className="flex-1">
                                        {sense.grammar && (
                                            <span className="text-xs text-[#888] mr-2">{sense.grammar}</span>
                                        )}
                                        <span className="text-white">{sense.definition}</span>
                                        {sense.definition_cn && (
                                            <span className="block mt-1 text-[#888] text-sm">{sense.definition_cn}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Examples */}
                                {sense.examples?.length > 0 && (
                                    <div className="ml-8 space-y-2">
                                        {sense.examples.map((ex, exIdx) => (
                                            <div key={exIdx} className="pl-3 border-l-2 border-[#333]">
                                                <p className="text-[#E0E0E0] italic text-sm">{ex.text}</p>
                                                {ex.translation && (
                                                    <p className="text-[#666] text-xs mt-1">{ex.translation}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Phrasal Verbs */}
                        {entry.phrasal_verbs?.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-[#333]">
                                <span className="text-xs uppercase text-[#666] tracking-wider">Phrasal Verbs</span>
                                <div className="mt-2 space-y-2">
                                    {entry.phrasal_verbs.map((pv, pvIdx) => (
                                        <div key={pvIdx} className="p-2 bg-[#111] rounded">
                                            <span className="font-bold text-[#00FF94]">{pv.phrase}</span>
                                            <span className="ml-2 text-[#E0E0E0]">{pv.definition}</span>
                                            {pv.definition_cn && (
                                                <span className="block text-[#666] text-sm mt-1">{pv.definition_cn}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ========== EXTENDED DATA SECTIONS ========== */}

                        {/* Etymology (Word Origin) */}
                        {entry.etymology && (
                            <div className="mt-4 pt-4 border-t border-[#333]">
                                <button
                                    onClick={() => toggleSection(idx, 'etymology')}
                                    className="flex items-center gap-2 text-xs uppercase text-[#666] tracking-wider hover:text-white transition-colors"
                                >
                                    <span>{isSectionExpanded(idx, 'etymology') ? '▼' : '▶'}</span>
                                    <span>📜 Word Origin</span>
                                </button>
                                {isSectionExpanded(idx, 'etymology') && (
                                    <div className="mt-2 p-3 bg-[#111] rounded text-sm">
                                        <div className="flex flex-wrap gap-3">
                                            {entry.etymology.century && (
                                                <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs">
                                                    {entry.etymology.century}
                                                </span>
                                            )}
                                            {entry.etymology.origin && (
                                                <span className="text-[#E0E0E0]">
                                                    from <span className="font-italic text-cyan-400">{entry.etymology.origin}</span>
                                                </span>
                                            )}
                                            {entry.etymology.meaning && (
                                                <span className="text-[#888]">{entry.etymology.meaning}</span>
                                            )}
                                        </div>
                                        {entry.etymology.note && (
                                            <p className="mt-2 text-[#666] text-xs">{entry.etymology.note}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Verb Table */}
                        {entry.verb_table && (
                            <div className="mt-4 pt-4 border-t border-[#333]">
                                <button
                                    onClick={() => toggleSection(idx, 'verb_table')}
                                    className="flex items-center gap-2 text-xs uppercase text-[#666] tracking-wider hover:text-white transition-colors"
                                >
                                    <span>{isSectionExpanded(idx, 'verb_table') ? '▼' : '▶'}</span>
                                    <span>📝 Verb Table</span>
                                </button>
                                {isSectionExpanded(idx, 'verb_table') && (
                                    <div className="mt-2 p-3 bg-[#111] rounded">
                                        <div className="text-xs font-mono">
                                            {entry.verb_table.simple_forms?.length > 0 && (
                                                <div className="mb-3">
                                                    <span className="text-[#888] block mb-1">Simple Forms</span>
                                                    <div className="grid grid-cols-2 gap-1">
                                                        {entry.verb_table.simple_forms.slice(0, 6).map((f, fIdx) => (
                                                            <div key={fIdx} className="flex gap-2">
                                                                <span className="text-[#666] w-20 truncate">{f.tense}</span>
                                                                <span className="text-[#00FF94]">
                                                                    {f.auxiliary && <span className="text-[#888]">{f.auxiliary} </span>}
                                                                    {f.form}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {entry.verb_table.continuous_forms?.length > 0 && (
                                                <div>
                                                    <span className="text-[#888] block mb-1">Continuous Forms</span>
                                                    <div className="grid grid-cols-2 gap-1">
                                                        {entry.verb_table.continuous_forms.slice(0, 4).map((f, fIdx) => (
                                                            <div key={fIdx} className="flex gap-2">
                                                                <span className="text-[#666] w-20 truncate">{f.tense}</span>
                                                                <span className="text-[#00FF94]">
                                                                    {f.auxiliary && <span className="text-[#888]">{f.auxiliary} </span>}
                                                                    {f.form}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Thesaurus */}
                        {entry.thesaurus && (entry.thesaurus.entries?.length > 0 || entry.thesaurus.word_sets?.length > 0) && (
                            <div className="mt-4 pt-4 border-t border-[#333]">
                                <button
                                    onClick={() => toggleSection(idx, 'thesaurus')}
                                    className="flex items-center gap-2 text-xs uppercase text-[#666] tracking-wider hover:text-white transition-colors"
                                >
                                    <span>{isSectionExpanded(idx, 'thesaurus') ? '▼' : '▶'}</span>
                                    <span>📚 Thesaurus</span>
                                    {entry.thesaurus.topic && (
                                        <span className="text-[#888] normal-case">({entry.thesaurus.topic})</span>
                                    )}
                                </button>
                                {isSectionExpanded(idx, 'thesaurus') && (
                                    <div className="mt-2 p-3 bg-[#111] rounded space-y-3">
                                        {entry.thesaurus.entries?.length > 0 && (
                                            <div className="space-y-2">
                                                {entry.thesaurus.entries.slice(0, 8).map((te, teIdx) => (
                                                    <div key={teIdx} className="border-l-2 border-[#333] pl-3">
                                                        <button
                                                            onClick={() => toggleSection(idx, `thes_${teIdx}`)}
                                                            className="flex items-start gap-2 w-full text-left hover:bg-[#1a1a1a] p-1 -ml-1 rounded transition-colors"
                                                        >
                                                            <span className="text-[#666] text-xs mt-0.5">
                                                                {isSectionExpanded(idx, `thes_${teIdx}`) ? '▼' : '▶'}
                                                            </span>
                                                            <span className="text-cyan-400 font-medium">{te.word}</span>
                                                            {te.definition && (
                                                                <span className="text-[#888] text-sm">- {te.definition}</span>
                                                            )}
                                                        </button>
                                                        {isSectionExpanded(idx, `thes_${teIdx}`) && te.examples?.length > 0 && (
                                                            <div className="ml-6 mt-1 space-y-1">
                                                                {te.examples.map((ex, exIdx) => (
                                                                    <p key={exIdx} className="text-[#888] text-sm italic">
                                                                        • {ex}
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {entry.thesaurus.word_sets?.length > 0 && (
                                            <div>
                                                <span className="text-[#666] text-xs block mb-2">Word Sets:</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {entry.thesaurus.word_sets.slice(0, 20).map((ws, wsIdx) => (
                                                        <span key={wsIdx} className="px-2 py-0.5 text-xs bg-[#222] text-[#888] rounded hover:text-white transition-colors">
                                                            {ws}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Collocations */}
                        {entry.collocations?.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-[#333]">
                                <button
                                    onClick={() => toggleSection(idx, 'collocations')}
                                    className="flex items-center gap-2 text-xs uppercase text-[#666] tracking-wider hover:text-white transition-colors"
                                >
                                    <span>{isSectionExpanded(idx, 'collocations') ? '▼' : '▶'}</span>
                                    <span>🔗 Collocations</span>
                                    <span className="text-[#888]">({entry.collocations.length})</span>
                                </button>
                                {isSectionExpanded(idx, 'collocations') && (
                                    <div className="mt-2 p-3 bg-[#111] rounded space-y-2">
                                        {entry.collocations.map((col, colIdx) => (
                                            <div key={colIdx} className="border-l-2 border-green-500/30 pl-3">
                                                <button
                                                    onClick={() => toggleSection(idx, `col_${colIdx}`)}
                                                    className="flex items-center gap-2 w-full text-left hover:bg-[#1a1a1a] p-1 -ml-1 rounded transition-colors"
                                                >
                                                    <span className="text-[#666] text-xs">
                                                        {isSectionExpanded(idx, `col_${colIdx}`) ? '▼' : '▶'}
                                                    </span>
                                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-sm">
                                                        {col.pattern}
                                                    </span>
                                                    {col.part_of_speech && (
                                                        <span className="text-[#666] text-xs">{col.part_of_speech}</span>
                                                    )}
                                                    {col.examples?.length > 0 && (
                                                        <span className="text-[#555] text-xs">({col.examples.length} examples)</span>
                                                    )}
                                                </button>
                                                {isSectionExpanded(idx, `col_${colIdx}`) && col.examples?.length > 0 && (
                                                    <div className="ml-6 mt-2 space-y-2">
                                                        {col.examples.map((ex, exIdx) => (
                                                            <div key={exIdx} className="pl-3 border-l-2 border-[#333]">
                                                                <p className="text-[#E0E0E0] text-sm italic">{ex.text}</p>
                                                                {ex.translation && (
                                                                    <p className="text-[#666] text-xs mt-1">{ex.translation}</p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Extra Examples */}
                        {entry.extra_examples?.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-[#333]">
                                <button
                                    onClick={() => toggleSection(idx, 'extra_examples')}
                                    className="flex items-center gap-2 text-xs uppercase text-[#666] tracking-wider hover:text-white transition-colors"
                                >
                                    <span>{isSectionExpanded(idx, 'extra_examples') ? '▼' : '▶'}</span>
                                    <span>💬 Extra Examples</span>
                                    <span className="text-[#888]">({entry.extra_examples.length})</span>
                                </button>
                                {isSectionExpanded(idx, 'extra_examples') && (
                                    <div className="mt-2 p-3 bg-[#111] rounded space-y-2">
                                        {entry.extra_examples.slice(0, 8).map((ex, exIdx) => (
                                            <div key={exIdx} className="flex items-start gap-2">
                                                <span className={`text-xs px-1 rounded ${ex.source === 'CORPUS'
                                                    ? 'bg-blue-500/20 text-blue-400'
                                                    : 'bg-orange-500/20 text-orange-400'
                                                    }`}>
                                                    {ex.source === 'CORPUS' ? 'C' : 'D'}
                                                </span>
                                                <span className="text-[#E0E0E0] text-sm italic">{ex.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DictionaryResults;

