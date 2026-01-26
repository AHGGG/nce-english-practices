import React from 'react';
import { BookOpen, GraduationCap, CheckCircle, Clock, BookMarked } from 'lucide-react';

/**
 * Shared ArticleCard component for unified library view
 * Shows article with combined reading/study status and dual-mode entry buttons
 */
const ArticleCard = ({
    article,
    onRead,
    onStudy,
    compact = false
}) => {
    const {
        title,
        source_id,
        sentence_count,
        reading_sessions = 0,

        study_progress = {},
        has_review_items = false,
        status = 'new'
    } = article;

    const { current_index = 0, total = sentence_count, studied_count = 0, clear_count = 0 } = study_progress;
    const studyPercent = total > 0 ? Math.round((current_index / total) * 100) : 0;
    const clearRate = studied_count > 0 ? Math.round((clear_count / studied_count) * 100) : 0;

    // Status badge config
    const statusConfig = {
        new: { label: 'NEW', color: 'bg-bg-elevated text-text-secondary border border-border', icon: null },
        read: { label: 'READ', color: 'bg-accent-info/20 text-accent-info', icon: BookMarked },
        in_progress: { label: `${studyPercent}%`, color: 'bg-accent-warning/20 text-accent-warning', icon: Clock },
        completed: { label: 'DONE', color: 'bg-accent-primary/20 text-accent-primary', icon: CheckCircle }
    };

    const statusInfo = statusConfig[status] || statusConfig.new;
    const StatusIcon = statusInfo.icon;

    if (compact) {
        // Compact mode for mobile or list view
        return (
            <div className="border border-border bg-bg-surface p-3 hover:border-accent-primary/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-serif text-sm text-text-primary truncate">{title}</h3>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-text-muted">
                            <span>{sentence_count} sentences</span>
                            {reading_sessions > 0 && <span>· {reading_sessions} reads</span>}
                        </div>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${statusInfo.color} flex items-center gap-1`}>
                        {StatusIcon && <StatusIcon className="w-3 h-3" />}
                        {statusInfo.label}
                    </span>
                </div>
                <div className="flex gap-2 mt-3">
                    <button
                        onClick={() => onRead(source_id)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs border border-border text-text-secondary hover:text-text-primary hover:border-text-primary transition-colors"
                    >
                        <BookOpen className="w-3 h-3" />
                        Read
                    </button>
                    <button
                        onClick={() => onStudy(source_id)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs bg-accent-primary text-bg-base font-bold hover:bg-accent-primary/80 transition-colors"
                    >
                        <GraduationCap className="w-3 h-3" />
                        {status === 'in_progress' ? `Study (${studyPercent}%)` : 'Study'}
                    </button>
                </div>
            </div>
        );
    }

    // Full mode with more details
    return (
        <div className="border border-border bg-bg-surface hover:border-accent-primary/50 transition-colors group">
            {/* Header */}
            <div className="p-4 border-b border-border/50">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="font-serif text-lg text-text-primary group-hover:text-accent-primary transition-colors">
                        {title}
                    </h3>
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase shrink-0 ${statusInfo.color} flex items-center gap-1`}>
                        {StatusIcon && <StatusIcon className="w-3 h-3" />}
                        {statusInfo.label}
                    </span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                    <span>{sentence_count} sentences</span>
                    {reading_sessions > 0 && (
                        <>
                            <span className="text-border">·</span>
                            <span>{reading_sessions} reading session{reading_sessions > 1 ? 's' : ''}</span>
                        </>
                    )}
                    {studied_count > 0 && (
                        <>
                            <span className="text-border">·</span>
                            <span>{clearRate}% clear rate</span>
                        </>
                    )}
                    {has_review_items && (
                        <>
                            <span className="text-border">·</span>
                            <span className="text-accent-warning">📚 Review items</span>
                        </>
                    )}
                </div>
            </div>

            {/* Progress bar (if in progress) */}
            {status === 'in_progress' && (
                <div className="px-4 py-2 bg-bg-elevated">
                    <div className="h-1 bg-border rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-accent-primary to-accent-primary/70"
                            style={{ width: `${studyPercent}%` }}
                        />
                    </div>
                    <div className="mt-1 text-[10px] text-text-muted">
                        {current_index} / {total} sentences studied
                    </div>
                </div>
            )}

            {/* Action buttons */}
            <div className="flex">
                <button
                    onClick={() => onRead(source_id)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-sm border-r border-border text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                >
                    <BookOpen className="w-4 h-4" />
                    <span>Read</span>
                </button>
                <button
                    onClick={() => onStudy(source_id)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-sm bg-accent-primary/10 text-accent-primary hover:bg-accent-primary hover:text-bg-base font-bold transition-colors"
                >
                    <GraduationCap className="w-4 h-4" />
                    <span>{status === 'in_progress' ? `Continue (${studyPercent}%)` : status === 'completed' ? 'Review' : 'Study'}</span>
                </button>
            </div>
        </div>
    );
};

export default ArticleCard;
