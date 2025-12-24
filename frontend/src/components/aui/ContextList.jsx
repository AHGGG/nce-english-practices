/**
 * ContextList - AUI-compatible pure presentation component for context resources list
 * 
 * This component receives all data via props and emits actions via callbacks.
 * It should be registered in the AUI registry and rendered by AUIStreamHydrator.
 */
import React from 'react';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import ContextCard from './ContextCard';

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

/**
 * ContextList - Display a list of context resources with progress
 * 
 * @param {Object} props
 * @param {string} props.word - The word these contexts belong to
 * @param {Array} props.contexts - Array of context objects
 * @param {Object} props.progress - Progress stats: { total, mastered, learning, unseen }
 * @param {boolean} props.show_progress - Whether to show progress bar
 * @param {boolean} props.compact - Compact display mode
 * @param {Function} props.onStatusChange - Callback: (id, newStatus) => void
 * @param {Function} props.onAction - AUI action callback: (action, payload) => void
 */
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

            {/* Context cards */}
            <div className="space-y-3">
                {contexts.map((context) => (
                    <ContextCard
                        key={context.id}
                        {...context}
                        compact={compact}
                        onStatusChange={handleStatusChange}
                        onAction={handleAction}
                    />
                ))}
            </div>
        </div>
    );
};

export default ContextList;
