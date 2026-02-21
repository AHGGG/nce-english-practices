import type { MouseEvent, ReactNode } from "react";

export interface PodcastEpisodeActionItem {
  key: string;
  title: string;
  icon: ReactNode;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className: string;
}

interface PodcastEpisodeActionButtonsProps {
  actions: PodcastEpisodeActionItem[];
  className?: string;
  showOnMobile?: boolean;
}

export default function PodcastEpisodeActionButtons({
  actions,
  className = "",
  showOnMobile = false,
}: PodcastEpisodeActionButtonsProps) {
  return (
    <div
      className={`${showOnMobile ? "flex" : "hidden sm:flex"} items-center gap-1.5 ${className}`.trim()}
    >
      {actions.map((action) => (
        <button
          key={action.key}
          onClick={action.onClick}
          disabled={action.disabled}
          className={`flex-shrink-0 p-3 rounded-xl transition-colors ${action.className}`}
          title={action.title}
        >
          {action.icon}
        </button>
      ))}
    </div>
  );
}
