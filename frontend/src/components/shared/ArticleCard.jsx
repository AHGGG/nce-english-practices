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
        last_read,
        study_progress = {},
        has_review_items = false,
        status = 'new'
    } = article;

    const { current_index = 0, total = sentence_count, studied_count = 0, clear_count = 0 } = study_progress;
    const studyPercent = total > 0 ? Math.round((current_index / total) * 100) : 0;
    const clearRate = studied_count > 0 ? Math.round((clear_count / studied_count) * 100) : 0;

    // Status badge config
    const statusConfig = {
        new: { label: 'NEW', color: 'bg-[#333] text-[#888]', icon: null },
        read: { label: 'READ', color: 'bg-cyan-500/20 text-cyan-400', icon: BookMarked },
        in_progress: { label: `${studyPercent}%`, color: 'bg-amber-500/20 text-amber-400', icon: Clock },
        completed: { label: 'DONE', color: 'bg-[#00FF94]/20 text-[#00FF94]', icon: CheckCircle }
    };

    const statusInfo = statusConfig[status] || statusConfig.new;
    const StatusIcon = statusInfo.icon;

    if (compact) {
        // Compact mode for mobile or list view
        return (
            <div className="border border-[#333] bg-[#0A0A0A] p-3 hover:border-[#00FF94]/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-serif text-sm text-white truncate">{title}</h3>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-[#666]">
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
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs border border-[#333] text-[#888] hover:text-white hover:border-white transition-colors"
                    >
                        <BookOpen className="w-3 h-3" />
                        Read
                    </button>
                    <button
                        onClick={() => onStudy(source_id)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs bg-[#00FF94] text-black font-bold hover:bg-[#00FF94]/80 transition-colors"
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
        <div className="border border-[#333] bg-[#0A0A0A] hover:border-[#00FF94]/50 transition-colors group">
            {/* Header */}
            <div className="p-4 border-b border-[#333]/50">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="font-serif text-lg text-white group-hover:text-[#00FF94] transition-colors">
                        {title}
                    </h3>
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase shrink-0 ${statusInfo.color} flex items-center gap-1`}>
                        {StatusIcon && <StatusIcon className="w-3 h-3" />}
                        {statusInfo.label}
                    </span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-[#666]">
                    <span>{sentence_count} sentences</span>
                    {reading_sessions > 0 && (
                        <>
                            <span className="text-[#333]">·</span>
                            <span>{reading_sessions} reading session{reading_sessions > 1 ? 's' : ''}</span>
                        </>
                    )}
                    {studied_count > 0 && (
                        <>
                            <span className="text-[#333]">·</span>
                            <span>{clearRate}% clear rate</span>
                        </>
                    )}
                    {has_review_items && (
                        <>
                            <span className="text-[#333]">·</span>
                            <span className="text-amber-400">📚 Review items</span>
                        </>
                    )}
                </div>
            </div>

            {/* Progress bar (if in progress) */}
            {status === 'in_progress' && (
                <div className="px-4 py-2 bg-[#111]">
                    <div className="h-1 bg-[#333] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-[#00FF94] to-[#00FF94]/70"
                            style={{ width: `${studyPercent}%` }}
                        />
                    </div>
                    <div className="mt-1 text-[10px] text-[#666]">
                        {current_index} / {total} sentences studied
                    </div>
                </div>
            )}

            {/* Action buttons */}
            <div className="flex">
                <button
                    onClick={() => onRead(source_id)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-sm border-r border-[#333] text-[#888] hover:text-white hover:bg-[#111] transition-colors"
                >
                    <BookOpen className="w-4 h-4" />
                    <span>Read</span>
                </button>
                <button
                    onClick={() => onStudy(source_id)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-sm bg-[#00FF94]/10 text-[#00FF94] hover:bg-[#00FF94] hover:text-black font-bold transition-colors"
                >
                    <GraduationCap className="w-4 h-4" />
                    <span>{status === 'in_progress' ? `Continue (${studyPercent}%)` : status === 'completed' ? 'Review' : 'Study'}</span>
                </button>
            </div>
        </div>
    );
};

export default ArticleCard;
