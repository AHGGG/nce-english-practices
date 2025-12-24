import React from 'react';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import ContextCard from './ContextCard';
import SenseCard from './SenseCard';

/**
 * ProgressBar - Visual progress indicator
 */
const ProgressBar = ({ total, mastered, learning }) => {
    const masteredPercent = total > 0 ? (mastered / total) * 100 : 0;
    const learningPercent = total > 0 ? (learning / total) * 100 : 0;

    return (
        <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
            <div className="h-full flex">
                <div
                    className="bg-emerald-500 transition-all duration-300"
                    style={{ width: `${masteredPercent}%` }}
                />
                <div
                    className="bg-amber-500 transition-all duration-300"
                    style={{ width: `${learningPercent}%` }}
                />
            </div>
        </div>
    );
};

const ContextList = ({
    word,
    contexts = [],
    progress = { total: 0, mastered: 0, learning: 0, unseen: 0 },
    show_progress = true,
    compact = false,
    onStatusChange,
    onAction,
}) => {
    // Handle status change from child card
    const handleStatusChange = (contextId, newStatus) => {
        onStatusChange?.(contextId, newStatus);
        onAction?.('context_status_changed', { context_id: contextId, status: newStatus, word });
    };

    // Handle action from child card
    const handleAction = (action, payload) => {
        onAction?.(action, { ...payload, word });
    };

    if (!word) {
        return (
            <div className="text-center py-8 text-ink/50">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select a word to view contexts</p>
            </div>
        );
    }

    if (contexts.length === 0) {
        return (
            <div className="text-center py-8 text-ink/50 border border-dashed border-ink/20 rounded-lg">
                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No contexts available for "{word}"</p>
            </div>
        );
    }

    // Group contexts by sense_index
    const groupedContexts = React.useMemo(() => {
        const groups = {};
        const noSense = [];

        contexts.forEach(ctx => {
            if (ctx.sense_index !== undefined && ctx.sense_index !== null) {
                const key = ctx.sense_index;
                if (!groups[key]) {
                    groups[key] = {
                        senseIndex: ctx.sense_index,
                        definition: ctx.definition,
                        definitionCn: ctx.definition_cn,
                        partOfSpeech: ctx.source?.replace('Collins - ', ''), // Rough extraction
                        synonyms: ctx.synonyms,
                        items: []
                    };
                }
                groups[key].items.push(ctx);
            } else {
                noSense.push(ctx);
            }
        });

        // Convert to array and sort by index
        const sortedGroups = Object.values(groups).sort((a, b) => a.senseIndex - b.senseIndex);
        return { sortedGroups, noSense };
    }, [contexts]);

    return (
        <div className="space-y-4">
            {/* Header with word */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-ink">
                        Contexts for <span className="text-neon-purple">"{word}"</span>
                    </h3>
                    <span className="text-sm text-ink/50">
                        {progress.total} total
                    </span>
                </div>
            </div>

            {/* Progress bar */}
            {show_progress && progress.total > 0 && (
                <div className="space-y-2">
                    <ProgressBar
                        total={progress.total}
                        mastered={progress.mastered}
                        learning={progress.learning}
                    />
                    <div className="flex items-center gap-4 text-xs text-ink/50">
                        <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            {progress.mastered} mastered
                        </span>
                        <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            {progress.learning} learning
                        </span>
                        <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-gray-500" />
                            {progress.unseen} unseen
                        </span>
                    </div>
                </div>
            )}

            {/* Grouped Contexts */}
            <div className="space-y-4">
                {groupedContexts.sortedGroups.map((group) => (
                    <SenseCard
                        key={group.senseIndex}
                        senseIndex={group.senseIndex}
                        definition={group.definition}
                        definitionCn={group.definitionCn}
                        partOfSpeech={group.items[0]?.source?.includes(' - ') ? group.items[0].source.split(' - ')[1] : null}
                        synonyms={group.synonyms}
                    >
                        {group.items.map(context => (
                            <ContextCard
                                key={context.id}
                                {...context}
                                compact={compact}
                                onStatusChange={handleStatusChange}
                                onAction={handleAction}
                            />
                        ))}
                    </SenseCard>
                ))}

                {/* Render ungrouped contexts if any */}
                {groupedContexts.noSense.length > 0 && (
                    <div className="space-y-3">
                        {groupedContexts.noSense.map((context) => (
                            <ContextCard
                                key={context.id}
                                {...context}
                                compact={compact}
                                onStatusChange={handleStatusChange}
                                onAction={handleAction}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContextList;
