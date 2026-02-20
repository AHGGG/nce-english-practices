import { Radio } from "lucide-react";

interface PodcastChannelEntry {
  feed_id: number;
  title: string;
  image_url?: string | null;
  total_seconds: number;
  total_minutes: number;
}

interface PodcastChannelRankingProps {
  channels: PodcastChannelEntry[];
}

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

const PodcastChannelRanking = ({ channels }: PodcastChannelRankingProps) => {
  if (!channels || channels.length === 0) {
    return (
      <div className="text-text-muted font-mono text-sm italic">
        {">>"} NO_PODCAST_LISTENING_DATA
      </div>
    );
  }

  const maxSeconds = Math.max(...channels.map((item) => item.total_seconds), 1);
  const totalSeconds = channels.reduce(
    (sum, item) => sum + Math.max(0, item.total_seconds),
    0,
  );

  function rankAccentClass(index: number): string {
    if (index === 0)
      return "from-amber-300/40 to-amber-500/20 border-amber-300/45";
    if (index === 1)
      return "from-slate-200/35 to-slate-400/15 border-slate-300/35";
    if (index === 2)
      return "from-orange-300/35 to-orange-500/15 border-orange-300/35";
    return "from-white/10 to-white/5 border-white/15";
  }

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
        <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/50">
          Top Channels
        </span>
        <span className="text-xs font-mono font-bold text-accent-secondary">
          {formatDuration(totalSeconds)} total
        </span>
      </div>

      {channels.map((channel, index) => {
        const barWidth = Math.max(
          (channel.total_seconds / maxSeconds) * 100,
          channel.total_seconds > 0 ? 8 : 0,
        );
        const percent =
          totalSeconds > 0 ? (channel.total_seconds / totalSeconds) * 100 : 0;

        return (
          <div
            key={channel.feed_id}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 transition-all duration-300 hover:border-accent-secondary/35 hover:bg-white/[0.06]"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-accent-secondary/10 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-2.5">
                <span
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-gradient-to-br text-[10px] font-mono font-bold text-white/85 ${rankAccentClass(index)}`}
                >
                  {index + 1}
                </span>

                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-white/5">
                  {channel.image_url ? (
                    <img
                      src={channel.image_url}
                      alt={channel.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Radio className="h-4 w-4 text-white/40" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">
                    {channel.title}
                  </div>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-xs font-mono font-bold text-accent-secondary">
                  {formatDuration(channel.total_seconds)}
                </div>
                <div className="text-[10px] font-mono text-white/45">
                  {percent.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-secondary/80 via-accent-secondary to-accent-primary/80 shadow-[0_0_12px_rgba(var(--color-accent-secondary-rgb),0.45)] transition-all duration-500"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PodcastChannelRanking;
