import React from 'react';

/**
 * Milestone Badges - Achievement display for vocab and streak milestones
 */
const MilestoneBadges = ({ milestones }) => {
    if (!milestones) return null;

    return (
        <div className="space-y-6">
            {/* Vocab Milestones */}
            <div>
                <h4 className="text-xs font-mono text-ink-muted uppercase tracking-wider mb-3">词汇量成就</h4>
                <div className="flex flex-wrap gap-2">
                    {milestones.vocab_milestones?.map((m, i) => (
                        <div
                            key={i}
                            className={`px-3 py-2 border flex items-center gap-2 transition-all ${m.achieved
                                ? 'border-neon-green bg-neon-green/10 text-neon-green'
                                : 'border-ink-faint text-ink-muted opacity-50'
                                }`}
                            title={`${m.name}: ${m.threshold} words`}
                        >
                            <span className="text-lg">{m.icon}</span>
                            <div>
                                <div className="font-mono text-xs font-bold">{m.threshold}</div>
                                <div className="text-[10px] uppercase">{m.name}</div>
                            </div>
                            {!m.achieved && (
                                <div className="w-8 h-1 bg-bg-elevated ml-2">
                                    <div className="h-full bg-neon-cyan" style={{ width: `${m.progress * 100}%` }}></div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Streak Milestones */}
            <div>
                <h4 className="text-xs font-mono text-ink-muted uppercase tracking-wider mb-3">连续学习成就</h4>
                <div className="flex flex-wrap gap-2">
                    {milestones.streak_milestones?.map((m, i) => (
                        <div
                            key={i}
                            className={`px-3 py-2 border flex items-center gap-2 transition-all ${m.achieved
                                ? 'border-neon-pink bg-neon-pink/10 text-neon-pink'
                                : 'border-ink-faint text-ink-muted opacity-50'
                                }`}
                            title={`${m.name}: ${m.threshold} days`}
                        >
                            <span className="text-lg">{m.icon}</span>
                            <div>
                                <div className="font-mono text-xs font-bold">{m.threshold} days</div>
                                <div className="text-[10px] uppercase">{m.name}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MilestoneBadges;
