/**
 * EpisodeSwipeCard - 可复用的滑动卡片组件
 * 支持左滑显示操作按钮，适配移动端
 */

import { useState, useRef, useCallback, type ReactNode } from "react";

export interface SwipeAction {
  /** 按钮图标 */
  icon: ReactNode;
  /** 点击回调 */
  onClick: () => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义样式类名 */
  className?: string;
  /** 提示文字 */
  title?: string;
  /** 条件显示（默认 true） */
  show?: boolean;
}

interface EpisodeSwipeCardProps {
  /** 卡片唯一ID */
  episodeId: number | string;
  /** 滑出按钮配置列表 */
  actions: SwipeAction[];
  /** 滑出区域宽度，默认 208px (5个按钮 + gap + 关闭按钮) */
  swipeRailWidth?: number;
  /** 卡片内容 */
  children: ReactNode;
  /** 卡片容器额外样式 */
  className?: string;
  /** 是否显示滑动提示 */
  showSwipeHint?: boolean;
  /** 滑动提示文本 */
  swipeHintText?: string;
  /** 滑动阈值（向左滑动的最小距离），默认 36 */
  swipeThreshold?: number;
  /** 自定义触摸开始处理（可选，用于外部状态同步） */
  onTouchStart?: (clientX: number) => void;
  /** 自定义触摸结束处理（可选，用于外部状态同步） */
  onTouchEnd?: (episodeId: number | string, clientX: number) => void;
  /** 当前展开的卡片ID（受控模式） */
  expandedId?: number | string | null;
  /** 设置展开卡片ID（受控模式） */
  onExpandedChange?: (id: number | string | null) => void;
}

const SWIPE_HINT_KEY = "podcast_swipe_hint_seen_v1";

export default function EpisodeSwipeCard({
  episodeId,
  actions,
  swipeRailWidth = 208,
  children,
  className = "",
  showSwipeHint = false,
  swipeHintText = "Swipe left for quick actions",
  swipeThreshold = 36,
  onTouchStart: externalTouchStart,
  onTouchEnd: externalTouchEnd,
  expandedId,
  onExpandedChange,
}: EpisodeSwipeCardProps) {
  const [internalExpanded, setInternalExpanded] = useState<
    number | string | null
  >(null);
  const touchStartXRef = useRef<number | null>(null);

  // 支持受控和非受控模式
  const isExpanded =
    expandedId !== undefined
      ? expandedId === episodeId
      : internalExpanded === episodeId;

  const setExpanded = useCallback(
    (id: number | string | null) => {
      if (onExpandedChange) {
        onExpandedChange(id);
      } else {
        setInternalExpanded(id);
      }
    },
    [onExpandedChange],
  );

  const handleCardTouchStart = (clientX: number) => {
    touchStartXRef.current = clientX;
    externalTouchStart?.(clientX);
  };

  const handleCardTouchEnd = (clientX: number) => {
    if (touchStartXRef.current === null) return;
    const deltaX = clientX - touchStartXRef.current;
    touchStartXRef.current = null;

    // 左滑展开
    if (deltaX < -swipeThreshold) {
      setExpanded(episodeId);
      // 首次滑动时设置 localStorage 提示
      if (showSwipeHint) {
        localStorage.setItem(SWIPE_HINT_KEY, "1");
      }
      return;
    }

    // 右滑收起（仅当已经展开时）
    if (deltaX > 28 && isExpanded) {
      setExpanded(null);
    }

    externalTouchEnd?.(episodeId, clientX);
  };

  // 过滤出显示的 actions
  const visibleActions = actions.filter((action) => action.show !== false);

  return (
    <div
      className={`group relative rounded-xl transition-all duration-300 overflow-hidden ${className}`}
      onTouchStart={(e) => {
        if (isExpanded) {
          // 如果已展开，点击内容区域应该收起
          setExpanded(null);
        }
        handleCardTouchStart(e.changedTouches[0].clientX);
      }}
      onTouchEnd={(e) => handleCardTouchEnd(e.changedTouches[0].clientX)}
    >
      {/* Mobile swipe action rail - 滑出按钮区域 */}
      <div
        className={`sm:hidden absolute inset-y-0 right-0 z-0 flex items-center gap-1.5 pr-2 transition-transform duration-200 ${
          isExpanded ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: swipeRailWidth + 36 }}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={() => setExpanded(null)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white/40 bg-white/5 border border-white/10 hover:text-white hover:bg-white/10 active:scale-95"
          title="Close"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        {visibleActions.map((action, index) => (
          <button
            type="button"
            key={index}
            onClick={() => action.onClick()}
            disabled={action.disabled}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors active:scale-95 ${
              action.className || ""
            } ${action.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            title={action.title}
          >
            {action.icon}
          </button>
        ))}
      </div>

      {/* Card content - 主内容区域 */}
      <div
        className={`relative z-10 transition-transform duration-200 ${
          isExpanded ? `-translate-x-[${swipeRailWidth}px]` : "translate-x-0"
        }`}
        style={{
          transform: isExpanded
            ? `translateX(-${swipeRailWidth}px)`
            : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * 检查是否应该显示滑动提示（首次访问用户）
 */
export function shouldShowSwipeHint(): boolean {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(SWIPE_HINT_KEY);
}
