import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, ChevronLeft, Calendar, BarChart2 } from "lucide-react";
import api from "../../api/client";
import Card from "./cards/Card";
import StudyTimeChart from "./widgets/StudyTimeChart";
import { formatDuration } from "./utils";

const StudyTimeDetail = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  // Get user's local timezone for correct daily grouping
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    // setLoading(true); // Moved to onClick to avoid synchronous setState warning
    api
      .get(
        `/api/performance/study-time?days=${days}&tz=${encodeURIComponent(userTimezone)}`,
      )
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setLoading(false);
      });
  }, [days, userTimezone]);

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-[#0a0f0d] font-mono gap-4 relative overflow-hidden">
        {/* Background Ambience */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent-primary/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="w-12 h-12 border-4 border-white/10 border-t-accent-primary rounded-full animate-spin"></div>
        <div className="text-accent-primary text-xs uppercase tracking-widest animate-pulse font-bold">
          Loading Metrics...
        </div>
      </div>
    );
  }

  const totalMinutes = data ? Math.round(data.total_seconds / 60) : 0;
  const avgMinutes =
    data && data.daily.length > 0
      ? Math.round(totalMinutes / data.daily.length)
      : 0;

  return (
    <section className="h-full w-full bg-[#0a0f0d] text-white font-sans overflow-y-auto p-6 md:p-12 pb-24 md:pb-12 relative">
      {/* GLOBAL NOISE TEXTURE OVERLAY */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

      {/* Background Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-accent-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-accent-secondary/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/performance")}
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all group border border-white/5 hover:border-white/10"
            >
              <ChevronLeft className="w-6 h-6 transition-transform group-hover:-translate-x-1" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-0.5 rounded bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-[10px] font-bold uppercase tracking-widest">
                  Deep Dive
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-white tracking-tight leading-tight">
                Study Duration
              </h2>
            </div>
          </div>

          {/* Date Range Selector */}
          <div className="flex bg-[#0c1418] p-1 rounded-xl border border-white/10 backdrop-blur-md shadow-lg">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDays(d);
                  setLoading(true);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all ${
                  days === d
                    ? "bg-accent-primary text-black shadow-lg shadow-accent-primary/20"
                    : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>
        </header>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="relative bg-white/[0.02] backdrop-blur-xl border border-white/10 p-8 rounded-2xl overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent-primary/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="text-xs text-accent-primary font-mono font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Total Time
              </div>
              <div className="text-4xl md:text-5xl font-mono font-bold text-white tracking-tighter">
                {formatDuration(totalMinutes)}
              </div>
            </div>
          </div>

          <div className="relative bg-white/[0.02] backdrop-blur-xl border border-white/10 p-8 rounded-2xl overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent-secondary/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="text-xs text-accent-secondary font-mono font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                <BarChart2 className="w-4 h-4" />
                Daily Average
              </div>
              <div className="text-4xl md:text-5xl font-mono font-bold text-white tracking-tighter">
                {avgMinutes} <span className="text-2xl opacity-50">min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Chart */}
        <div className="mb-12">
          <Card title="Daily Trends" icon={BarChart2}>
            <div className="pt-6">
              <StudyTimeChart dailyData={data?.daily || []} />
            </div>
          </Card>
        </div>

        {/* Raw Data List */}
        <Card title="History Log" icon={Calendar}>
          <div className="overflow-x-auto -mx-6 md:mx-0">
            <table className="w-full text-left font-mono text-xs md:text-sm">
              <thead className="border-b border-white/10 text-white/40 uppercase tracking-widest">
                <tr>
                  <th className="py-4 px-6 font-bold">Date</th>
                  <th className="py-4 px-4 font-normal text-right">Reading</th>
                  <th className="py-4 px-4 font-normal text-right">Sentence</th>
                  <th className="py-4 px-4 font-normal text-right">Voice</th>
                  <th className="py-4 px-4 font-normal text-right">Review</th>
                  <th className="py-4 px-4 font-normal text-right">Podcast</th>
                  <th className="py-4 px-6 text-accent-primary font-bold text-right">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data?.daily
                  .slice()
                  .reverse()
                  .map((d, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="py-4 px-6 text-white font-medium">
                        {d.date}
                      </td>
                      <td className="py-4 px-4 text-white/60 text-right">
                        {Math.round(d.reading / 60)}m
                      </td>
                      <td className="py-4 px-4 text-white/60 text-right">
                        {Math.round(d.sentence_study / 60)}m
                      </td>
                      <td className="py-4 px-4 text-white/60 text-right">
                        {Math.round(d.voice / 60)}m
                      </td>
                      <td className="py-4 px-4 text-white/60 text-right">
                        {Math.round((d.review || 0) / 60)}m
                      </td>
                      <td className="py-4 px-4 text-white/60 text-right">
                        {Math.round((d.podcast || 0) / 60)}m
                      </td>
                      <td className="py-4 px-6 text-accent-primary font-bold text-right group-hover:text-white transition-colors">
                        {Math.round(d.total / 60)}m
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default StudyTimeDetail;
