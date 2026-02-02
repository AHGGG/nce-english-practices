import React from "react";

/**
 * Daily Study Time Bar Chart
 * Uses semantic accent colors with Tailwind classes
 */

const StudyTimeChart = ({ dailyData }) => {
  if (!dailyData || dailyData.length === 0) {
    return (
      <div className="text-text-muted font-mono text-sm italic">
        {">>"} NO_DATA_AVAILABLE
      </div>
    );
  }

  const maxTime = Math.max(...dailyData.map((d) => d.total), 1);

  return (
    <div className="space-y-6">
      <div className="relative h-40 border-l border-b border-border flex items-end gap-1 px-2">
        {/* Y-axis labels */}
        <div className="absolute -left-10 top-0 text-[10px] font-mono text-text-muted">
          {Math.round(maxTime / 60)}m
        </div>
        <div className="absolute -left-10 bottom-0 text-[10px] font-mono text-text-muted">
          0m
        </div>

        {/* Bars */}
        {dailyData.map((d, i) => (
          <div
            key={i}
            className="flex-1 group/bar relative flex flex-col justify-end hover:z-50"
            style={{ height: "100%" }}
          >
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-50">
              <div className="bg-bg-base/95 backdrop-blur-xl border border-white/20 text-white text-[10px] p-3 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] min-w-[140px]">
                <div className="font-bold text-accent-primary mb-2 border-b border-white/10 pb-1 text-center font-mono tracking-wider">
                  {d.date}
                </div>
                <div className="space-y-1.5 font-mono">
                  <div className="flex justify-between items-center text-white font-bold">
                    <span>TOTAL</span>
                    <span>{Math.round(d.total / 60)}m</span>
                  </div>
                  <div className="h-px bg-white/10 w-full" />
                  <div className="flex justify-between text-accent-info">
                    <span>Reading</span>
                    <span>{Math.round(d.reading / 60)}m</span>
                  </div>
                  <div className="flex justify-between text-accent-primary">
                    <span>Sentence</span>
                    <span>{Math.round(d.sentence_study / 60)}m</span>
                  </div>
                  <div className="flex justify-between text-accent-danger">
                    <span>Voice</span>
                    <span>{Math.round(d.voice / 60)}m</span>
                  </div>
                  <div className="flex justify-between text-accent-warning">
                    <span>Review</span>
                    <span>{Math.round((d.review || 0) / 60)}m</span>
                  </div>
                  <div className="flex justify-between text-purple-400">
                    <span>Podcast</span>
                    <span>{Math.round((d.podcast || 0) / 60)}m</span>
                  </div>
                </div>
                {/* Triangle arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-bg-base/95 border-r border-b border-white/20 transform rotate-45"></div>
              </div>
            </div>

            {/* Stacked Bar */}
            <div
              className="w-full flex flex-col justify-end overflow-hidden rounded-t-sm"
              style={{ height: `${(d.total / maxTime) * 100}%` }}
            >
              <div
                className="w-full bg-accent-info"
                style={{ height: `${(d.reading / d.total) * 100}%` }}
              ></div>
              <div
                className="w-full bg-accent-primary"
                style={{ height: `${(d.sentence_study / d.total) * 100}%` }}
              ></div>
              <div
                className="w-full bg-accent-danger"
                style={{ height: `${(d.voice / d.total) * 100}%` }}
              ></div>
              <div
                className="w-full bg-accent-warning"
                style={{ height: `${((d.review || 0) / d.total) * 100}%` }}
              ></div>
              <div
                className="w-full bg-purple-500"
                style={{ height: `${((d.podcast || 0) / d.total) * 100}%` }}
              ></div>
            </div>

            {/* Hover Highlight Overlay */}
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none rounded-t-sm" />
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-accent-info"></div>
          <span className="text-text-muted">阅读模式</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-accent-primary"></div>
          <span className="text-text-muted">句子学习</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-accent-danger"></div>
          <span className="text-text-muted">语音实验室</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-accent-warning"></div>
          <span className="text-text-muted">复习</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-500"></div>
          <span className="text-text-muted">播客</span>
        </div>
      </div>
    </div>
  );
};

export default StudyTimeChart;
