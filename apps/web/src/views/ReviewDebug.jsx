import React, { useState, useEffect } from "react";
import {
  Calendar,
  RotateCw,
  Calculator,
  HelpCircle,
  ArrowRight,
  Code,
  Activity,
  ChevronLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../api/auth";

const ReviewDebug = () => {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(14);

  const fetchSchedule = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/review/debug/schedule?days=${days}`);
      if (res.ok) {
        const json = await res.json();
        setSchedule(json.schedule || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchSchedule();
  }, [days, fetchSchedule]);

  const dates = Object.keys(schedule).sort();

  return (
    <div className="min-h-screen bg-[#0a0f0d] relative overflow-hidden font-sans text-white">
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

      <div className="relative z-10 max-w-6xl mx-auto p-6 md:p-12 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/performance")}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white/[0.03] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all group"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div>
              <h1 className="text-3xl font-serif font-bold text-white flex items-center gap-3">
                <Code className="w-6 h-6 text-accent-primary" />
                Algorithm Trace
              </h1>
              <p className="text-white/50 font-mono text-xs uppercase tracking-widest mt-1">
                SM-2 Scheduling Logic Inspection
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="appearance-none bg-[#0a0f0d]/60 border border-white/10 text-white px-4 py-2 pr-10 rounded-lg font-mono text-xs uppercase tracking-wider focus:outline-none focus:border-accent-primary/50 transition-colors cursor-pointer hover:bg-white/5"
              >
                <option value={7}>Next 7 Days</option>
                <option value={14}>Next 14 Days</option>
                <option value={30}>Next 30 Days</option>
              </select>
              <Activity className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            </div>

            <button
              onClick={fetchSchedule}
              className="p-2 border border-white/10 rounded-lg text-white/60 hover:text-accent-primary hover:bg-accent-primary/10 hover:border-accent-primary/30 transition-all active:scale-95"
              title="Refresh Data"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-white/30 font-mono animate-pulse gap-4">
            <Activity className="w-8 h-8 animate-spin" />
            <span className="text-xs uppercase tracking-widest">
              Analyzing Schedule...
            </span>
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-700">
            {dates.length === 0 && (
              <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02] text-white/40 font-mono">
                No reviews scheduled for the next {days} days.
              </div>
            )}

            {dates.map((date) => (
              <div key={date} className="relative group">
                <div className="flex items-center gap-3 mb-4 sticky top-4 z-20">
                  <div className="px-3 py-1 bg-accent-primary/10 border border-accent-primary/20 backdrop-blur-md rounded text-accent-primary font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg">
                    <Calendar className="w-4 h-4" />
                    {new Date(date).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="h-px flex-grow bg-gradient-to-r from-white/10 to-transparent" />
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                    {schedule[date].length} items
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {schedule[date].map((item) => (
                    <ReviewItemRow key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ReviewItemRow = ({ item }) => {
  return (
    <div className="group relative bg-[#0a0f0d]/40 backdrop-blur-md border border-white/5 hover:border-accent-primary/30 transition-all duration-300 rounded-xl p-5 hover:bg-white/[0.02] hover:shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:z-20">
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        {/* Main Content */}
        <div className="flex-grow min-w-0 space-y-3">
          <div className="text-white font-serif text-lg leading-relaxed line-clamp-2 group-hover:text-accent-primary transition-colors duration-300">
            {item.text}
          </div>

          {/* Metadata Badges */}
          <div className="flex flex-wrap gap-2 items-center">
            <MetricBadge
              label="Interval"
              value={`${item.interval.toFixed(1)}d`}
              color="cyan"
            />
            <MetricBadge
              label="Factor"
              value={item.ef.toFixed(2)}
              color="pink"
            />
            <MetricBadge label="Rep" value={item.repetition} color="amber" />
            <div className="h-4 w-px bg-white/10 mx-1 hidden md:block" />
            <div className="text-[10px] text-white/30 font-mono uppercase tracking-widest flex items-center gap-1.5">
              <Activity className="w-3 h-3" />
              Due: {new Date(item.next_review_at).toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Debug/Logic Section (Right Side) */}
        <div className="flex-shrink-0 pt-1">
          <LogicTooltip item={item} />
        </div>
      </div>
    </div>
  );
};

const MetricBadge = ({ label, value, color }) => {
  const colors = {
    cyan: "text-accent-info bg-accent-info/5 border-accent-info/20 shadow-[0_0_10px_rgba(var(--color-accent-info-rgb),0.1)]",
    pink: "text-accent-danger bg-accent-danger/5 border-accent-danger/20 shadow-[0_0_10px_rgba(var(--color-accent-danger-rgb),0.1)]",
    amber:
      "text-accent-warning bg-accent-warning/5 border-accent-warning/20 shadow-[0_0_10px_rgba(var(--color-accent-warning-rgb),0.1)]",
  };

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono border rounded ${colors[color]}`}
    >
      <span className="opacity-60 uppercase tracking-wider">{label}:</span>
      <span className="font-bold">{value}</span>
    </div>
  );
};

const LogicTooltip = ({ item }) => {
  if (!item.last_review) {
    return (
      <div className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-white/30 text-[10px] font-mono uppercase tracking-wider flex items-center gap-2 cursor-not-allowed">
        <Calculator className="w-3 h-3" />
        <span>New Item</span>
      </div>
    );
  }

  const { date, quality, duration_ms, interval_before } = item.last_review;

  // Logic Calculation Preview
  let logicText = "";
  if (quality < 3) {
    logicText = "Reset: Quality < 3 resets Rep to 0 and Interval to 1.";
  } else if (item.repetition === 1) {
    logicText = "First Pass: Quality ≥ 3 sets Interval to 1.0.";
  } else if (item.repetition === 2) {
    logicText = "Second Pass: Quality ≥ 3 sets Interval to 6.0.";
  } else {
    // SM-2: I_new = I_old * EF_new
    const predicted_interval = interval_before * item.ef;
    logicText = `Growth: I_new = I_prev (${interval_before}) * EF (${item.ef}) ≈ ${predicted_interval.toFixed(2)}`;
  }

  return (
    <div className="group/tooltip relative">
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.05] text-white/50 hover:text-accent-primary hover:bg-accent-primary/10 hover:border-accent-primary/30 transition-all font-mono text-[10px] uppercase tracking-wider shadow-sm hover:shadow-lg hover:shadow-accent-primary/10">
        <Code className="w-3 h-3" />
        <span>Inspect Logic</span>
      </button>

      {/* Tooltip Content */}
      <div className="absolute right-0 top-full mt-2 w-80 p-5 bg-[#0c1418] border border-white/10 rounded-xl shadow-2xl z-[100] opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 translate-y-2 group-hover/tooltip:translate-y-0 text-left pointer-events-none backdrop-blur-xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary opacity-50 rounded-t-xl" />

        <div className="font-mono text-[10px] font-bold text-accent-primary mb-4 uppercase tracking-widest border-b border-white/10 pb-2 flex items-center gap-2">
          <Calculator className="w-3 h-3" />
          Scheduling Trace
        </div>

        <div className="space-y-3 font-mono text-xs text-white/70">
          <div className="flex justify-between">
            <span className="text-white/40">Last Review:</span>
            <span className="text-white">
              {new Date(date).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">User Rating:</span>
            <span
              className={`font-bold ${quality >= 3 ? "text-accent-info" : "text-accent-danger"}`}
            >
              {quality} (
              {quality === 5 ? "Easy" : quality === 3 ? "Remembered" : "Forgot"}
              )
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">Prev Interval:</span>
            <span className="text-white">{interval_before} days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">Duration:</span>
            <span className="text-white">
              {(duration_ms / 1000).toFixed(1)}s
            </span>
          </div>

          <div className="h-px bg-white/10 my-3" />

          <div>
            <span className="block text-accent-secondary mb-1.5 font-bold text-[10px] uppercase tracking-wider">
              Calculation Logic:
            </span>
            <p className="leading-relaxed text-white/80 text-[11px] italic">
              "{logicText}"
            </p>
          </div>

          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-accent-primary font-bold">
            <span className="text-[10px] uppercase tracking-wider">
              Result:
            </span>
            <span className="flex items-center gap-1 text-[11px]">
              Next in {item.interval.toFixed(1)}d
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewDebug;
