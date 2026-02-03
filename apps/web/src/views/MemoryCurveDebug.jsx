import React, { useState, useEffect } from "react";
import {
  Activity,
  RotateCw,
  BarChart2,
  List,
  Info,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  BookOpen,
  HelpCircle,
} from "lucide-react";
import { authFetch } from "../api/auth";

const MemoryCurveDebug = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState(false);
  const [showHelp, setShowHelp] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/review/debug/memory-curve");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center font-mono">
        <div className="text-accent-primary animate-pulse flex items-center gap-2">
          <Activity className="w-5 h-5 animate-spin" />
          LOADING DEBUG DATA...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center font-mono">
        <div className="text-red-400">Failed to load debug data.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f0d] p-6 pb-20 text-white font-sans relative overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0a1418] via-[#0c1815] to-[#0a0f0d] pointer-events-none" />
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-radial from-emerald-900/20 via-transparent to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-gradient-radial from-teal-900/10 via-transparent to-transparent blur-3xl" />
      </div>
      <div
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold text-white mb-2 tracking-tight">
              Memory Curve Debug
            </h1>
            <p className="text-white/40 font-mono text-sm uppercase tracking-widest">
              SM-2 Distribution Analysis
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className={`p-2.5 rounded-lg border transition-all ${showHelp ? "bg-accent-primary/10 border-accent-primary text-accent-primary" : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"}`}
              title="Toggle Help"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button
              onClick={fetchData}
              className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all hover:rotate-180 duration-500"
              title="Refresh Data"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Help Section */}
        {showHelp && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* What is Memory Curve */}
            <div className="p-6 border border-purple-500/20 bg-purple-500/5 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <BookOpen className="w-16 h-16 text-purple-400" />
              </div>
              <div className="flex items-start gap-4 relative z-10">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-purple-200">
                    Memory Curve Theory
                  </h3>
                  <p className="text-sm text-purple-200/60 leading-relaxed">
                    The <strong>Memory Curve</strong> visualizes retention rates
                    across different review intervals. Ideally, retention should
                    match the theoretical forgetting curve (Ebbinghaus), but
                    active recall (SM-2) can improve actual performance.
                  </p>
                </div>
              </div>
            </div>

            {/* SM-2 Algorithm */}
            <div className="p-6 border border-accent-info/20 bg-accent-info/5 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Info className="w-16 h-16 text-accent-info" />
              </div>
              <div className="flex items-start gap-4 relative z-10">
                <div className="p-2 bg-accent-info/10 rounded-lg">
                  <Info className="w-5 h-5 text-accent-info" />
                </div>
                <div className="space-y-3">
                  <h3 className="font-bold text-accent-info">
                    SM-2 Algorithm Intervals
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs text-accent-info/70 font-mono">
                    <div className="bg-accent-info/5 px-2 py-1 rounded border border-accent-info/10">
                      1st: 1 day → Day 1
                    </div>
                    <div className="bg-accent-info/5 px-2 py-1 rounded border border-accent-info/10">
                      2nd: 6 days → Day 6
                    </div>
                    <div className="bg-accent-info/5 px-2 py-1 rounded border border-accent-info/10">
                      3rd: ~15 days → Day 15
                    </div>
                    <div className="bg-accent-info/5 px-2 py-1 rounded border border-accent-info/10">
                      4th: ~37+ days → Day 40
                    </div>
                  </div>
                  <p className="text-xs text-accent-info/50 mt-2 italic">
                    * Buckets are optimized to capture data at these specific
                    intervals.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Alert */}
        <div className="p-4 border border-accent-warning/20 bg-accent-warning/5 rounded-xl flex items-start gap-3 text-sm text-accent-warning/80">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="font-mono leading-relaxed">
            {data.summary.explanation}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Logs"
            value={data.total_logs}
            icon={List}
            color="cyan"
            tooltip="Total review records analyzed"
          />
          <StatCard
            label="Avg Quality"
            value={data.summary.avg_quality || "N/A"}
            icon={Activity}
            color="pink"
            tooltip="Mean SM-2 Quality Score (0-5)"
          />
          <StatCard
            label="Data Coverage"
            value={`${data.summary.buckets_with_data}/${data.summary.total_buckets}`}
            icon={BarChart2}
            color="amber"
            tooltip="Buckets with meaningful data / Total defined buckets"
          />
          <StatCard
            label="System Status"
            value={
              data.summary.buckets_with_data === 1
                ? "Day 1 Only"
                : data.summary.buckets_with_data < 3
                  ? "Early Stage"
                  : "Mature"
            }
            icon={data.summary.buckets_with_data === 1 ? XCircle : CheckCircle}
            color={
              data.summary.buckets_with_data === 1
                ? "red"
                : data.summary.buckets_with_data < 3
                  ? "amber"
                  : "green"
            }
            tooltip={
              data.summary.buckets_with_data === 1
                ? "Data concentrated in early intervals."
                : "Good distribution across multiple intervals."
            }
          />
        </div>

        {/* Interval Distribution */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
            <BarChart2 className="w-5 h-5 text-accent-info" />
            <h2 className="text-lg font-bold font-serif text-white tracking-wide">
              Interval Distribution
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(data.interval_distribution).map(
              ([range, count]) => (
                <div
                  key={range}
                  className="bg-black/20 border border-white/10 p-4 rounded-xl text-center relative group hover:border-accent-info/30 transition-colors"
                >
                  <div className="text-3xl font-bold text-white mb-1 group-hover:text-accent-info transition-colors font-mono">
                    {count}
                  </div>
                  <div className="text-[10px] text-white/40 font-mono uppercase tracking-widest">
                    {range}
                  </div>
                </div>
              ),
            )}
            {Object.keys(data.interval_distribution).length === 0 && (
              <div className="col-span-full text-center text-white/20 font-mono py-8 border border-dashed border-white/10 rounded-xl">
                NO_DISTRIBUTION_DATA
              </div>
            )}
          </div>
        </div>

        {/* Bucket Statistics Table */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md">
          <div className="p-6 md:p-8 border-b border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-accent-warning" />
              <h2 className="text-lg font-bold font-serif text-white tracking-wide">
                Bucket Statistics
              </h2>
            </div>
            <p className="text-sm text-white/40 font-light">
              Source data for the Memory Curve visualization. Retention Rate =
              Success / Sample Size.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5 text-left text-[10px] font-mono uppercase tracking-widest text-white/40">
                  <th className="px-6 py-4 font-bold">Day Label</th>
                  <th className="px-6 py-4 font-normal">Interval Range</th>
                  <th className="px-6 py-4 font-normal">Sample Size</th>
                  <th className="px-6 py-4 font-normal">Success Count</th>
                  <th className="px-6 py-4 font-normal">Retention Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.buckets.map((bucket) => (
                  <tr
                    key={bucket.day}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="px-6 py-4 font-mono text-sm text-white font-bold group-hover:text-accent-primary transition-colors">
                      Day {bucket.day}
                      {bucket.day === 1 && (
                        <span className="ml-2 text-[9px] text-accent-info bg-accent-info/10 px-1.5 py-0.5 rounded border border-accent-info/20">
                          FIRST
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-white/60">
                      {bucket.interval_range} days
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">
                      <span
                        className={
                          bucket.sample_size > 0
                            ? "text-white"
                            : "text-white/20"
                        }
                      >
                        {bucket.sample_size}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-accent-success/80">
                      {bucket.success_count}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">
                      {bucket.retention_rate !== null ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold ${bucket.retention_rate >= 0.7 ? "text-accent-success" : bucket.retention_rate >= 0.5 ? "text-accent-warning" : "text-accent-danger"}`}
                          >
                            {(bucket.retention_rate * 100).toFixed(0)}%
                          </span>
                          {bucket.retention_rate >= 0.8 && (
                            <CheckCircle className="w-3 h-3 text-accent-success" />
                          )}
                        </div>
                      ) : (
                        <span className="text-white/10">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Logs */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md">
          <button
            onClick={() => setExpandedLogs(!expandedLogs)}
            className="w-full flex items-center justify-between p-6 md:p-8 hover:bg-white/[0.02] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <List className="w-5 h-5 text-accent-primary" />
              <div>
                <h2 className="text-lg font-bold font-serif text-white tracking-wide">
                  Recent Logs
                </h2>
                <p className="text-xs text-white/40 font-mono mt-1 uppercase tracking-widest">
                  Latest {data.recent_logs.length} entries
                </p>
              </div>
            </div>
            {expandedLogs ? (
              <ChevronDown className="w-5 h-5 text-white/40" />
            ) : (
              <ChevronRight className="w-5 h-5 text-white/40" />
            )}
          </button>

          {expandedLogs && (
            <div className="border-t border-white/5">
              {/* Legend */}
              <div className="flex flex-wrap gap-4 p-4 bg-black/20 border-b border-white/5 text-[10px] font-mono uppercase tracking-wider text-white/40">
                <span>
                  <strong className="text-white/60">Q</strong> = Quality (1-5)
                </span>
                <span>
                  <strong className="text-white/60">I</strong> = Interval (Days)
                </span>
                <span className="text-accent-success">Q≥3 (Success)</span>
                <span className="text-accent-danger">Q&lt;3 (Fail)</span>
              </div>

              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {data.recent_logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 border-b border-white/5 flex items-center gap-4 text-sm font-mono hover:bg-white/[0.02] transition-colors last:border-0"
                  >
                    <div className="flex-shrink-0 w-16">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${log.quality >= 3 ? "bg-accent-success/10 text-accent-success border border-accent-success/20" : "bg-accent-danger/10 text-accent-danger border border-accent-danger/20"}`}
                      >
                        Q:{log.quality}
                      </span>
                    </div>
                    <div
                      className="flex-shrink-0 w-20 text-accent-info/80 text-xs"
                      title={`Interval: ${log.interval_at_review} days`}
                    >
                      I:{log.interval_at_review}d
                    </div>
                    <div
                      className="flex-grow text-white/70 truncate font-sans text-sm"
                      title={log.sentence_preview}
                    >
                      {log.sentence_preview || (
                        <span className="text-white/20 italic">No Preview</span>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-white/30 text-[10px]">
                      {new Date(log.reviewed_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {data.recent_logs.length === 0 && (
                  <div className="text-center text-white/20 font-mono py-8 italic">
                    No recent logs found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color, tooltip }) => {
  const colors = {
    cyan: "text-accent-info bg-accent-info/5 border-accent-info/20",
    pink: "text-accent-danger bg-accent-danger/5 border-accent-danger/20",
    amber: "text-accent-warning bg-accent-warning/5 border-accent-warning/20",
    green: "text-accent-success bg-accent-success/5 border-accent-success/20",
    red: "text-accent-danger bg-accent-danger/5 border-accent-danger/20",
  };

  return (
    <div
      className={`p-5 rounded-2xl border ${colors[color]} relative group transition-all hover:scale-[1.02] hover:shadow-lg`}
    >
      <div className="flex items-center gap-2 mb-3 opacity-80">
        <Icon className="w-4 h-4" />
        <span className="text-[10px] font-mono uppercase tracking-widest">
          {label}
        </span>
      </div>
      <div className="text-2xl md:text-3xl font-bold font-mono tracking-tight">
        {value}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 p-3 bg-[#0c1418] border border-white/10 rounded-xl text-[10px] text-white/70 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 text-center font-sans leading-relaxed backdrop-blur-xl">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-[#0c1418] border-r border-b border-white/10 transform rotate-45"></div>
        </div>
      )}
    </div>
  );
};

export default MemoryCurveDebug;
