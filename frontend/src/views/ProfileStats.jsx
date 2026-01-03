import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, BookOpen, Lightbulb, AlertTriangle } from 'lucide-react';

const ProfileStats = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/sentence-study/profile');
            if (!response.ok) throw new Error('Failed to fetch profile');
            const data = await response.json();
            setProfile(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    return (
        <div className="min-h-screen bg-bg p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/nav')}
                        className="p-2 hover:bg-surface-1 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-ink" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold font-serif text-ink">学习画像</h1>
                        <p className="text-ink-muted text-sm">基于你的学习行为生成</p>
                    </div>
                    <button
                        onClick={fetchProfile}
                        className="ml-auto p-2 hover:bg-surface-1 transition-colors"
                    >
                        <RefreshCw className={`w-5 h-5 text-ink ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="text-center py-12 text-ink-muted">Loading...</div>
                ) : error ? (
                    <div className="text-center py-12 text-red-500">{error}</div>
                ) : profile ? (
                    <div className="space-y-6">
                        {/* Recommendation Banner */}
                        {profile.recommendation && (
                            <div className="bg-neon-cyan/10 border border-neon-cyan p-4 flex items-center gap-3">
                                <Lightbulb className="w-6 h-6 text-neon-cyan flex-shrink-0" />
                                <div>
                                    <span className="text-xs text-neon-cyan font-mono">NEXT_ACTION</span>
                                    <p className="text-ink font-serif">{profile.recommendation}</p>
                                </div>
                            </div>
                        )}

                        {/* Study Summary */}
                        <div className="bg-surface-1 border border-ink-faint p-6">
                            <h3 className="text-lg font-serif text-ink mb-4">学习统计</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-neon-cyan">{profile.total_sentences_studied}</div>
                                    <div className="text-xs text-ink-muted">句子总数</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-neon-lime">{profile.clear_count}</div>
                                    <div className="text-xs text-ink-muted">一次看懂</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-neon-magenta">{profile.unclear_count}</div>
                                    <div className="text-xs text-ink-muted">需要帮助</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-ink">{Math.round(profile.clear_rate * 100)}%</div>
                                    <div className="text-xs text-ink-muted">一次通过率</div>
                                </div>
                            </div>
                        </div>

                        {/* Gap Breakdown */}
                        {profile.unclear_count > 0 && (
                            <div className="bg-surface-1 border border-ink-faint p-6">
                                <h3 className="text-lg font-serif text-ink mb-4">问题类型分布</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-ink w-24">词汇问题</span>
                                        <div className="flex-1 bg-surface-2 h-4 relative overflow-hidden">
                                            <div
                                                className="absolute inset-y-0 left-0"
                                                style={{
                                                    width: `${Math.min((profile.vocab_gap_count / profile.unclear_count * 100), 100)}%`,
                                                    backgroundColor: 'rgba(0, 255, 148, 0.6)'  // neon.green with opacity
                                                }}
                                            />
                                        </div>
                                        <span className="text-sm text-ink-muted w-8">{profile.vocab_gap_count}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-ink w-24">语法问题</span>
                                        <div className="flex-1 bg-surface-2 h-4 relative overflow-hidden">
                                            <div
                                                className="absolute inset-y-0 left-0"
                                                style={{
                                                    width: `${Math.min((profile.grammar_gap_count / profile.unclear_count * 100), 100)}%`,
                                                    backgroundColor: 'rgba(255, 0, 85, 0.6)'  // neon.pink with opacity
                                                }}
                                            />
                                        </div>
                                        <span className="text-sm text-ink-muted w-8">{profile.grammar_gap_count}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-ink w-24">固定搭配</span>
                                        <div className="flex-1 bg-surface-2 h-4 relative overflow-hidden">
                                            <div
                                                className="absolute inset-y-0 left-0"
                                                style={{
                                                    width: `${Math.min((profile.collocation_gap_count / profile.unclear_count * 100), 100)}%`,
                                                    backgroundColor: 'rgba(6, 182, 212, 0.6)'  // neon.cyan with opacity
                                                }}
                                            />
                                        </div>
                                        <span className="text-sm text-ink-muted w-8">{profile.collocation_gap_count}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Insights */}
                        {profile.insights && profile.insights.length > 0 && (
                            <div className="bg-surface-1 border border-ink-faint p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Lightbulb className="w-5 h-5 text-neon-cyan" />
                                    <h3 className="text-lg font-serif text-ink">学习建议</h3>
                                </div>
                                <div className="space-y-2">
                                    {profile.insights.map((insight, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-sm text-ink">
                                            <AlertTriangle className="w-4 h-4 text-neon-magenta flex-shrink-0 mt-0.5" />
                                            {insight}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Words to Review */}
                        {profile.words_to_review && profile.words_to_review.length > 0 && (
                            <div className="bg-surface-1 border border-ink-faint p-6">
                                <h3 className="text-lg font-serif text-ink mb-2">需要加强的词汇</h3>
                                <p className="text-xs text-ink-muted mb-4">这些词你多次点击查询，说明还没完全掌握</p>
                                <div className="flex flex-wrap gap-2">
                                    {profile.words_to_review.map((w, idx) => (
                                        <span
                                            key={idx}
                                            className="px-3 py-1 bg-neon-magenta/10 border border-neon-magenta/30 text-neon-magenta text-sm font-mono"
                                            title={`难度: ${w.difficulty_score}, 查询次数: ${w.exposure_count}`}
                                        >
                                            {w.word}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Empty State */}
                        {profile.total_sentences_studied === 0 && (
                            <div className="text-center py-12">
                                <BookOpen className="w-16 h-16 text-ink-muted mx-auto mb-4" />
                                <h2 className="text-xl font-serif text-ink mb-2">还没有学习记录</h2>
                                <p className="text-ink-muted">去 Sentence Study 开始学习吧！</p>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default ProfileStats;
