import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  BookOpen,
  FileText,
  Brain,
  ChevronLeft,
  Lightbulb,
  AlertTriangle,
  RefreshCw,
  Target,
} from "lucide-react";
import Card from "./cards/Card";
import MemoryCurveChart from "./widgets/MemoryCurveChart";
import { formatDuration, formatWordCount } from "./utils";

import { apiGet } from "../../api/auth";

interface StudyTimeSummary {
  total_minutes: number;
}

interface ReadingStats {
  total_words: number;
  articles_count: number;
}

interface CurvePoint {
  day: number;
  retention: number | null;
}

interface MemoryCurve {
  actual: CurvePoint[];
  ebbinghaus: CurvePoint[];
  total_words_analyzed: number;
}

interface WordReviewItem {
  word: string;
  difficulty_score: number;
  exposure_count: number;
}

interface SentenceProfile {
  recommendation?: string;
  clear_rate?: number;
  unclear_count: number;
  vocab_gap_count: number;
  grammar_gap_count: number;
  meaning_gap_count?: number;
  collocation_gap_count: number;
  total_sentences_studied: number;
  clear_count: number;
  insights?: string[];
  words_to_review?: WordReviewItem[];
}

interface PerformanceData {
  study_time: StudyTimeSummary;
  reading_stats: ReadingStats;
  memory_curve: MemoryCurve;
}

/**
 * Unified Learning Analytics Dashboard
 * Combines: Study Time, Reading Stats, Memory Curve, and Sentence Study Profile
 */
const PerformanceReport = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<PerformanceData | null>(null);
  const [profile, setProfile] = useState<SentenceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    // Don't setLoading(true) here - it's either initial true or set by onClick
    Promise.all([
      apiGet(`/api/performance?days=${days}`),
      apiGet("/api/sentence-study/profile"),
    ])
      .then(([performanceData, profileData]) => {
        setData(performanceData as PerformanceData);
        setProfile(profileData as SentenceProfile);
        setLoading(false);
      })
      .catch((err: unknown) => {
        console.error("Fetch error:", err);
        setLoading(false);
      });
  }, [days]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-bg-base font-mono gap-4 relative overflow-hidden">
        {/* Background Ambient */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent-primary/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative">
          <div className="w-16 h-16 border-4 border-white/5 border-t-accent-primary rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-accent-primary/20 rounded-full animate-pulse"></div>
          </div>
        </div>
        <div className="text-accent-primary text-xs tracking-[0.3em] animate-pulse font-bold">
          ANALYZING METRICS...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-accent-danger font-mono bg-bg-base min-h-screen flex flex-col items-center justify-center">
        <div className="p-6 border border-accent-danger/30 bg-accent-danger/5 rounded-2xl backdrop-blur-sm">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <div className="text-lg font-bold mb-2">DATA_FETCH_ERROR</div>
          <div className="text-xs opacity-70">
            Please check your network connection.
          </div>
        </div>
      </div>
    );
  }

  const { study_time, reading_stats, memory_curve } = data;

  return (
    <section className="min-h-screen w-full bg-bg-base overflow-y-auto p-6 md:p-12 pb-24 md:pb-12 relative">
      {/* GLOBAL NOISE TEXTURE OVERLAY */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-0 bg-[url('/noise.svg')]"></div>

      {/* Background Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-accent-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-accent-secondary/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/nav")}
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all group"
            >
              <ChevronLeft className="w-6 h-6 transition-transform group-hover:-translate-x-1" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-0.5 rounded bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-[10px] font-bold uppercase tracking-widest">
                  Analytics
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-white tracking-tight drop-shadow-2xl">
                Performance
              </h2>
            </div>
          </div>

          {/* Date Range Selector */}
          <div className="flex flex-col items-end gap-4">
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 backdrop-blur-sm">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setLoading(true);
                    setDays(d);
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                    days === d
                      ? "bg-accent-primary text-black shadow-lg shadow-accent-primary/20"
                      : "text-white/40 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {d}D
                </button>
              ))}
            </div>
            {/* Debug Links */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/performance/debug")}
                className="text-[10px] text-white/20 hover:text-accent-primary uppercase tracking-widest transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Algo
              </button>
              <button
                onClick={() => navigate("/performance/memory-debug")}
                className="text-[10px] text-white/20 hover:text-accent-info uppercase tracking-widest transition-colors flex items-center gap-1"
              >
                <Brain className="w-3 h-3" />
                Curve
              </button>
            </div>
          </div>
        </header>

        {/* Recommendation Banner (from ProfileStats) */}
        {profile?.recommendation && (
          <div className="relative overflow-hidden bg-accent-primary/10 border border-accent-primary/30 p-6 rounded-2xl mb-12 flex items-start gap-4 shadow-[0_0_30px_rgba(var(--color-accent-primary-rgb),0.1)]">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <Lightbulb className="w-24 h-24 text-accent-primary -rotate-12" />
            </div>
            <div className="p-3 bg-accent-primary/20 rounded-xl">
              <Lightbulb className="w-6 h-6 text-accent-primary" />
            </div>
            <div className="relative z-10">
              <span className="text-xs text-accent-primary font-mono font-bold uppercase tracking-widest mb-1 block">
                Recommended Action
              </span>
              <p className="text-lg md:text-xl text-white font-serif leading-relaxed">
                {profile.recommendation}
              </p>
            </div>
          </div>
        )}

        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {/* Study Time Card */}
          <div
            onClick={() => navigate("/performance/time")}
            className="relative group bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm hover:border-accent-primary/50 transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronLeft className="w-4 h-4 text-accent-primary rotate-180" />
            </div>
            <Clock
              className="text-accent-primary mb-4 w-8 h-8 opacity-80"
              strokeWidth={1.5}
            />
            <div className="text-3xl md:text-4xl font-mono font-bold text-white mb-2 tracking-tighter">
              {formatDuration(study_time?.total_minutes || 0)}
            </div>
            <div className="text-xs font-bold text-white/40 uppercase tracking-widest">
              Total Time
            </div>

            {/* Background Glow */}
            <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-accent-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Reading Words Card */}
          <div className="relative group bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm hover:border-accent-secondary/50 transition-all">
            <BookOpen
              className="text-accent-secondary mb-4 w-8 h-8 opacity-80"
              strokeWidth={1.5}
            />
            <div className="text-3xl md:text-4xl font-mono font-bold text-white mb-2 tracking-tighter">
              {formatWordCount(reading_stats?.total_words || 0)}
            </div>
            <div className="text-xs font-bold text-white/40 uppercase tracking-widest">
              Words Read
            </div>
            <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-accent-secondary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Articles Count Card */}
          <div className="relative group bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm hover:border-accent-info/50 transition-all">
            <FileText
              className="text-accent-info mb-4 w-8 h-8 opacity-80"
              strokeWidth={1.5}
            />
            <div className="text-3xl md:text-4xl font-mono font-bold text-white mb-2 tracking-tighter">
              {reading_stats?.articles_count || 0}
            </div>
            <div className="text-xs font-bold text-white/40 uppercase tracking-widest">
              Articles
            </div>
            <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-accent-info/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Clear Rate Card */}
          <div className="relative group bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm hover:border-accent-warning/50 transition-all">
            <Target
              className="text-accent-warning mb-4 w-8 h-8 opacity-80"
              strokeWidth={1.5}
            />
            <div className="text-3xl md:text-4xl font-mono font-bold text-white mb-2 tracking-tighter">
              {profile ? Math.round((profile.clear_rate || 0) * 100) : 0}%
            </div>
            <div className="text-xs font-bold text-white/40 uppercase tracking-widest">
              Clear Rate
            </div>
            <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-accent-warning/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Gap Breakdown Section */}
        {profile && profile.unclear_count > 0 && (
          <Card title="Problem Distribution" icon={AlertTriangle}>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-xs text-white/60 w-24 uppercase tracking-widest font-mono">
                  Vocabulary
                </span>
                <div className="flex-1 bg-white/5 h-2 rounded-full relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-accent-primary rounded-full shadow-[0_0_10px_rgba(var(--color-accent-primary-rgb),0.5)]"
                    style={{
                      width: `${Math.min((profile.vocab_gap_count / profile.unclear_count) * 100, 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-accent-primary font-mono font-bold w-8 text-right">
                  {profile.vocab_gap_count}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-white/60 w-24 uppercase tracking-widest font-mono">
                  Grammar
                </span>
                <div className="flex-1 bg-white/5 h-2 rounded-full relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-accent-danger rounded-full shadow-[0_0_10px_rgba(var(--color-accent-danger-rgb),0.5)]"
                    style={{
                      width: `${Math.min((profile.grammar_gap_count / profile.unclear_count) * 100, 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-accent-danger font-mono font-bold w-8 text-right">
                  {profile.grammar_gap_count}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-white/60 w-24 uppercase tracking-widest font-mono">
                  Meaning
                </span>
                <div className="flex-1 bg-white/5 h-2 rounded-full relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-accent-warning rounded-full shadow-[0_0_10px_rgba(var(--color-accent-warning-rgb),0.5)]"
                    style={{
                      width: `${Math.min(((profile.meaning_gap_count || 0) / profile.unclear_count) * 100, 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-accent-warning font-mono font-bold w-8 text-right">
                  {profile.meaning_gap_count || 0}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-white/60 w-24 uppercase tracking-widest font-mono">
                  Collocation
                </span>
                <div className="flex-1 bg-white/5 h-2 rounded-full relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-accent-info rounded-full shadow-[0_0_10px_rgba(var(--color-accent-info-rgb),0.5)]"
                    style={{
                      width: `${Math.min((profile.collocation_gap_count / profile.unclear_count) * 100, 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-accent-info font-mono font-bold w-8 text-right">
                  {profile.collocation_gap_count}
                </span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 text-[10px] text-white/40 font-mono flex justify-between uppercase tracking-wider">
              <span>Total: {profile.total_sentences_studied} sentences</span>
              <span>
                {profile.clear_count} cleared / {profile.unclear_count} needs
                work
              </span>
            </div>
          </Card>
        )}

        {/* Two-Column Grid for Memory Curve and Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Memory Curve Section */}
          <Card title="Memory Curve" icon={Brain}>
            {memory_curve && memory_curve.total_words_analyzed > 0 ? (
              <MemoryCurveChart data={memory_curve} />
            ) : (
              <div className="text-center py-12 text-white/20 font-mono">
                <Brain className="mx-auto mb-4 opacity-20" size={48} />
                <div className="text-sm">INSUFFICIENT DATA</div>
                <div className="text-[10px] mt-2 tracking-wider">
                  COMPLETE REVIEWS TO GENERATE CURVE
                </div>
              </div>
            )}
          </Card>

          {/* Insights */}
          <Card title="AI Insights" icon={Lightbulb}>
            {profile?.insights && profile.insights.length > 0 ? (
              <div className="space-y-4">
                {profile.insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 text-sm text-white/80 bg-white/5 p-3 rounded-lg border border-white/5"
                  >
                    <AlertTriangle className="w-4 h-4 text-accent-warning flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{insight}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-white/20 font-mono">
                <Lightbulb className="mx-auto mb-4 opacity-20" size={48} />
                <div className="text-sm">ANALYZING PATTERNS</div>
                <div className="text-[10px] mt-2 tracking-wider">
                  CONTINUE STUDYING TO UNLOCK INSIGHTS
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Words to Review */}
        {profile?.words_to_review && profile.words_to_review.length > 0 && (
          <div className="mt-6">
            <Card title="Focus Vocabulary" icon={Target}>
              <p className="text-xs text-white/40 mb-6 uppercase tracking-widest font-mono">
                High frequency lookup candidates
              </p>
              <div className="flex flex-wrap gap-2">
                {profile.words_to_review.slice(0, 20).map((w, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-accent-primary/5 border border-accent-primary/20 text-accent-primary text-xs font-mono font-bold rounded hover:bg-accent-primary/10 transition-colors cursor-help"
                    title={`Difficulty: ${w.difficulty_score}, Lookups: ${w.exposure_count}`}
                  >
                    {w.word}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
};

export default PerformanceReport;
