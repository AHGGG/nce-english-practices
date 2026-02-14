import { Check, Music, Pause, Play } from "lucide-react";

interface PodcastCoverPlayButtonProps {
  imageUrl?: string | null;
  isCurrent: boolean;
  isPlaying: boolean;
  isFinished?: boolean;
  isDownloading?: boolean;
  downloadProgress?: number;
  sizeClassName?: string;
  iconClassName?: string;
  fallbackIconClassName?: string;
  onClick?: () => void;
}

export default function PodcastCoverPlayButton({
  imageUrl,
  isCurrent,
  isPlaying,
  isFinished = false,
  isDownloading = false,
  downloadProgress = 0,
  sizeClassName = "w-14 h-14 sm:w-16 sm:h-16",
  iconClassName = "w-4 h-4 sm:w-5 sm:h-5",
  fallbackIconClassName = "w-6 h-6",
  onClick,
}: PodcastCoverPlayButtonProps) {
  return (
    <button
      onClick={() => !isDownloading && onClick?.()}
      disabled={isDownloading}
      className={`relative ${sizeClassName} rounded-xl overflow-hidden border transition-all duration-300 flex-shrink-0 ${
        isCurrent
          ? "border-accent-primary/50 shadow-[0_0_20px_rgba(var(--color-accent-primary-rgb),0.25)]"
          : "border-white/10 hover:border-white/20"
      } ${isDownloading ? "cursor-default" : "hover:scale-105"}`}
      title={isDownloading ? "Downloading" : "Play"}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white/25 bg-white/[0.03]">
          <Music className={fallbackIconClassName} />
        </div>
      )}

      <div
        className={`absolute inset-0 flex items-center justify-center transition-colors ${
          isCurrent ? "bg-black/30" : "bg-black/45 group-hover:bg-black/35"
        }`}
      >
        {isDownloading ? (
          <div className="relative w-6 h-6 sm:w-8 sm:h-8">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                className="text-white/20"
              />
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                className="text-accent-primary"
                strokeDasharray={`${downloadProgress} 100`}
                strokeLinecap="round"
              />
            </svg>
          </div>
        ) : isPlaying ? (
          <Pause className={`${iconClassName} text-white fill-current`} />
        ) : isFinished ? (
          <Check
            className={`${iconClassName} text-accent-success stroke-[3]`}
          />
        ) : (
          <Play className={`${iconClassName} text-white ml-0.5 fill-current`} />
        )}
      </div>

      {isDownloading && (
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-mono text-accent-primary font-bold bg-black/60 px-1 rounded">
          {downloadProgress}%
        </span>
      )}
    </button>
  );
}
