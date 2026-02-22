// apps/web/src/components/content/renderers/AudioContentRenderer.tsx

import React, { useCallback, useMemo, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Loader2,
  Gauge,
  Bookmark,
} from "lucide-react";
import {
  useAudioPlayer,
  PLAYBACK_RATES,
  type AudioSegment,
  type AudioPlayerState,
  type AudioPlayerActions,
} from "@nce/shared";
import { useToast } from "../../../components/ui/Toast";
import { transcribeAudiobook } from "../../../api/audiobook";
import type {
  ContentRenderer,
  ContentRendererProps,
  ContentBundle,
  Collocation,
} from "../types";
import { SentenceBlock } from "../shared";

// ============================================================
// Helper Functions
// ============================================================

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ============================================================
// Audio Segment Block Component
// ============================================================

interface AudioSegmentBlockProps {
  segment: AudioSegment;
  isActive: boolean;
  highlightSet?: Set<string>;
  studyWordSet?: Set<string>;
  studyPhraseSet?: Set<string>;
  knownWords?: Set<string>;
  showHighlights?: boolean;
  getCollocations?: (sentence: string) => Collocation[];
  onClick?: () => void;
  onWordClick?: (word: string, sentence: string) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (segment: AudioSegment) => void;
}

function AudioSegmentBlock({
  segment,
  isActive,
  highlightSet,
  studyWordSet,
  studyPhraseSet,
  knownWords,
  showHighlights,
  getCollocations,
  onClick,
  onWordClick,
  isBookmarked,
  onToggleBookmark,
}: AudioSegmentBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active segment
  useEffect(() => {
    if (isActive && containerRef.current) {
      containerRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [isActive]);

  // Handle word click with event delegation
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const word = target.dataset?.word;
      const sentence = target.dataset?.sentence;

      // Only allow word/collocation lookup on the currently active subtitle.
      // For non-active lines, any click should jump playback to that line.
      if (isActive && word && onWordClick) {
        e.stopPropagation();
        onWordClick(word.toLowerCase(), sentence || "");
      } else {
        // Click on segment itself to seek
        onClick?.();
      }
    },
    [isActive, onClick, onWordClick],
  );

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      data-audio-segment-index={segment.index}
      data-audio-segment-active={isActive ? "true" : undefined}
      className={`
        px-3 sm:px-6 py-2 rounded-lg cursor-pointer transition-all duration-300 group
        ${
          isActive
            ? "bg-white/10 border-l-4 border-accent-primary shadow-2xl shadow-black/50 opacity-100 sm:scale-[1.01]"
            : "hover:bg-white/5 border-l-4 border-transparent opacity-60 hover:opacity-100"
        }
      `}
    >
      {/* Time indicator */}
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-mono tracking-wide ${isActive ? "text-accent-primary font-bold" : "text-white/30 group-hover:text-white/50"}`}
          >
            {formatTime(segment.startTime)}
          </span>
          {isActive && (
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-primary"></span>
            </span>
          )}
        </div>
        {onToggleBookmark && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark(segment);
            }}
            className={`rounded-md border px-2 py-1 text-[10px] transition-colors ${
              isBookmarked
                ? "border-accent-primary/60 bg-accent-primary/20 text-accent-primary"
                : "border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
            }`}
            title={isBookmarked ? "Remove bookmark" : "Bookmark sentence"}
          >
            <Bookmark
              className={`h-3 w-3 ${isBookmarked ? "fill-current" : ""}`}
            />
          </button>
        )}
      </div>

      {/* Sentences */}
      <div
        className={`space-y-0.5 text-base sm:text-lg leading-snug font-sans ${isActive ? "text-white" : "text-white/80"}`}
      >
        {segment.sentences.map((sentence: string, idx: number) => {
          const collocations = getCollocations?.(sentence) || [];
          return (
            <SentenceBlock
              key={idx}
              text={sentence}
              highlightSet={highlightSet}
              studyWordSet={studyWordSet}
              studyPhraseSet={studyPhraseSet}
              knownWords={knownWords}
              showHighlights={showHighlights}
              collocations={collocations}
            />
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Speed Menu Component
// ============================================================

interface SpeedMenuProps {
  currentRate: number;
  onRateChange: (rate: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}

function SpeedMenu({
  currentRate,
  onRateChange,
  isOpen,
  onToggle,
}: SpeedMenuProps) {
  return (
    <div className="relative z-40">
      <button
        onClick={onToggle}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-white/5 rounded-lg text-white hover:bg-white/10 border border-white/10"
      >
        <Gauge className="w-3 h-3" />
        <span>{currentRate}x</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 bg-bg-surface border border-white/10 rounded-lg shadow-xl z-50 backdrop-blur-xl overflow-hidden">
          {PLAYBACK_RATES.map((rate: number) => (
            <button
              key={rate}
              onClick={() => {
                onRateChange(rate);
                onToggle();
              }}
              className={`
                block w-full px-4 py-2 text-sm text-left hover:bg-white/10 transition-colors
                ${rate === currentRate ? "text-accent-primary bg-accent-primary/10" : "text-white"}
              `}
            >
              {rate}x
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Player Controls Component
// ============================================================

interface PlayerControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  playbackRate: number;
  loopMode: "off" | "segment" | "ab";
  loopStart: number | null;
  loopEnd: number | null;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSkip: (seconds: number) => void;
  onPrevSegment: () => void;
  onNextSegment: () => void;
  onRateChange: (rate: number) => void;
  onToggleSegmentLoop: () => void;
  onSetABStart: () => void;
  onSetABEnd: () => void;
  onClearABLoop: () => void;
  onToggleABLoop: () => void;
}

function PlayerControls({
  isPlaying,
  isLoading,
  currentTime,
  duration,
  progress,
  playbackRate,
  loopMode,
  loopStart,
  loopEnd,
  onTogglePlay,
  onSeek,
  onSkip,
  onPrevSegment,
  onNextSegment,
  onRateChange,
  onToggleSegmentLoop,
  onSetABStart,
  onSetABEnd,
  onClearABLoop,
  onToggleABLoop,
}: PlayerControlsProps) {
  const [speedMenuOpen, setSpeedMenuOpen] = React.useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = React.useState(false);

  // Handle progress bar click
  const handleProgressClick = useCallback(
    (e: React.MouseEvent) => {
      if (!progressBarRef.current || !duration) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      onSeek(percentage * duration);
    },
    [duration, onSeek],
  );

  return (
    <div className="shrink-0 border-t border-white/10 bg-[#0a0f0d]/90 backdrop-blur-2xl z-30 pb-safe">
      {/* Progress Bar Container */}
      <div
        className="group relative h-4 -mt-2 cursor-pointer flex items-center"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={handleProgressClick}
        ref={progressBarRef}
      >
        {/* Track Background */}
        <div className="absolute left-0 right-0 h-1 bg-white/10 group-hover:h-1.5 transition-all duration-200" />

        {/* Buffered/Progress Track */}
        <div
          className="absolute left-0 h-1 bg-accent-primary group-hover:h-1.5 transition-all duration-200 shadow-[0_0_10px_rgba(var(--color-accent-primary-rgb),0.5)]"
          style={{ width: `${progress}%` }}
        />

        {/* Thumb (Only visible on hover) */}
        <div
          className={`absolute h-3 w-3 bg-white rounded-full shadow-lg transform -translate-x-1/2 transition-opacity duration-200 ${isHovering ? "opacity-100" : "opacity-0"}`}
          style={{ left: `${progress}%` }}
        />
      </div>

      {/* Mobile: time flanking progress bar (Spotify/Apple pattern) */}
      <div className="flex sm:hidden justify-between px-3 mt-0.5 mb-0.5">
        <span className="text-[10px] font-mono text-white/35 tabular-nums">
          {formatTime(currentTime)}
        </span>
        <span className="text-[10px] font-mono text-white/35 tabular-nums">
          {formatTime(duration)}
        </span>
      </div>

      {/* Controls */}
      <div className="px-3 sm:px-6 py-1.5 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-0 max-w-4xl mx-auto w-full">
        {/* Time Display - desktop only (left column of the 3-column row) */}
        <div className="hidden sm:block w-24 text-left text-xs font-mono font-medium text-white/40 tracking-wider">
          {formatTime(currentTime)} <span className="text-white/20">/</span>{" "}
          {formatTime(duration)}
        </div>

        {/* Main Controls - play/pause stays perfectly centered */}
        <div className="flex items-center justify-center gap-3 sm:gap-6">
          {/* Backward 30s */}
          <button
            onClick={() => onSkip(-30)}
            className="px-2 py-1 sm:px-2.5 sm:py-1.5 text-xs font-mono text-white/60 hover:text-white transition-all hover:bg-white/5 rounded-full hover:scale-105 active:scale-95 border border-white/10"
            title="Jump backward 30s"
          >
            -30s
          </button>

          {/* Previous Sentence */}
          <button
            onClick={onPrevSegment}
            className="p-1.5 sm:p-2.5 text-white/40 hover:text-white transition-all hover:bg-white/5 rounded-full hover:scale-105 active:scale-95"
            title="Previous sentence"
          >
            <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Play/Pause - Hero Button */}
          <button
            onClick={onTogglePlay}
            disabled={isLoading}
            className="p-3 sm:p-4 bg-accent-primary text-black rounded-full hover:bg-white hover:scale-110 active:scale-95 transition-all duration-300 shadow-[0_0_30px_rgba(var(--color-accent-primary-rgb),0.3)] disabled:opacity-50 disabled:scale-100"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
            ) : (
              <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5 fill-current" />
            )}
          </button>

          {/* Next Sentence */}
          <button
            onClick={onNextSegment}
            className="p-1.5 sm:p-2.5 text-white/40 hover:text-white transition-all hover:bg-white/5 rounded-full hover:scale-105 active:scale-95"
            title="Next sentence"
          >
            <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Forward 30s */}
          <button
            onClick={() => onSkip(30)}
            className="px-2 py-1 sm:px-2.5 sm:py-1.5 text-xs font-mono text-white/60 hover:text-white transition-all hover:bg-white/5 rounded-full hover:scale-105 active:scale-95 border border-white/10"
            title="Jump forward 30s"
          >
            +30s
          </button>
        </div>

        {/* Loop Tools — mobile: pure centered buttons */}
        <div className="w-full sm:w-72 flex justify-center sm:justify-end items-center gap-1.5 sm:gap-2 flex-nowrap overflow-visible">
          <button
            onClick={onToggleSegmentLoop}
            className={`shrink-0 px-2 py-0.5 sm:py-1 rounded text-xs border transition-colors ${
              loopMode === "segment"
                ? "bg-accent-primary/15 text-accent-primary border-accent-primary/50"
                : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
            }`}
            title="Loop current subtitle segment"
          >
            SEG
          </button>

          <button
            onClick={onSetABStart}
            className="shrink-0 px-2 py-0.5 sm:py-1 rounded text-xs border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            title="Set A point"
          >
            A
          </button>

          <button
            onClick={onSetABEnd}
            className="shrink-0 px-2 py-0.5 sm:py-1 rounded text-xs border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            title="Set B point"
          >
            B
          </button>

          <button
            onClick={onToggleABLoop}
            disabled={
              loopStart == null || loopEnd == null || loopEnd <= loopStart
            }
            className={`shrink-0 px-2 py-0.5 sm:py-1 rounded text-xs border transition-colors disabled:opacity-40 ${
              loopMode === "ab"
                ? "bg-accent-primary/15 text-accent-primary border-accent-primary/50"
                : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
            }`}
            title="Toggle A-B loop"
          >
            A-B
          </button>

          <button
            onClick={onClearABLoop}
            className="shrink-0 px-2 py-0.5 sm:py-1 rounded text-xs border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            title="Clear A-B points"
          >
            CLR
          </button>

          <SpeedMenu
            currentRate={playbackRate}
            onRateChange={onRateChange}
            isOpen={speedMenuOpen}
            onToggle={() => setSpeedMenuOpen(!speedMenuOpen)}
          />
        </div>
      </div>

      <div className="hidden sm:block px-3 sm:px-6 pb-1.5 sm:pb-3 -mt-0.5 sm:-mt-1 text-[10px] font-mono text-white/35 max-w-4xl mx-auto w-full text-center sm:text-right">
        Loop: {loopMode.toUpperCase()}
        {loopStart != null && ` | A ${formatTime(loopStart)}`}
        {loopEnd != null && ` | B ${formatTime(loopEnd)}`}
      </div>
    </div>
  );
}

// ============================================================
// Audio Player UI Component (Presentational)
// ============================================================

interface AudioPlayerUIProps extends ContentRendererProps {
  segments: AudioSegment[];
  state: AudioPlayerState;
  actions: AudioPlayerActions;
  onTranscribe?: () => Promise<void>;
  isTranscribing?: boolean;
  bookmarkedSentenceKeys?: Set<string>;
  getSentenceKey?: (segment: AudioSegment) => string;
  onToggleSentenceBookmark?: (segment: AudioSegment) => void;
}

export function AudioPlayerUI({
  bundle,
  segments,
  state,
  actions,
  highlightSet,
  studyWordSet,
  studyPhraseSet,
  knownWords,
  showHighlights = true,
  getCollocations,
  onWordClick,
  onTranscribe,
  isTranscribing,
  bookmarkedSentenceKeys,
  getSentenceKey,
  onToggleSentenceBookmark,
}: AudioPlayerUIProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = React.useState(120);

  useEffect(() => {
    setVisibleCount(120);
  }, [bundle?.id, segments.length]);

  useEffect(() => {
    if (state.activeSegmentIndex < 0) return;
    if (state.activeSegmentIndex < visibleCount - 20) return;
    setVisibleCount((prev) => Math.min(segments.length, prev + 120));
  }, [state.activeSegmentIndex, visibleCount, segments.length]);

  useEffect(() => {
    if (visibleCount >= segments.length) return;
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisibleCount((prev) => Math.min(segments.length, prev + 120));
      },
      { rootMargin: "320px" },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [visibleCount, segments.length]);

  const visibleSegments = useMemo(
    () => segments.slice(0, visibleCount),
    [segments, visibleCount],
  );

  // Handle segment click to seek
  const handleSegmentClick = useCallback(
    (index: number) => {
      if (index === state.activeSegmentIndex) {
        actions.seekToSegment(index);
        void actions.play();
        return;
      }

      actions.seekToSegment(index);
      if (!state.isPlaying) {
        actions.play();
      }
    },
    [actions, state.isPlaying],
  );

  const handlePrevSegment = useCallback(() => {
    const currentIndex = Math.max(0, state.activeSegmentIndex);
    const current = segments[currentIndex];
    const currentStart = current?.startTime ?? -Infinity;

    let target = currentIndex > 0 ? currentIndex - 1 : 0;
    let bestStart = -Infinity;
    // Find the latest segment whose start is strictly earlier than current.
    // This works even when transcript list order is imperfect.
    for (let i = 0; i < segments.length; i++) {
      const start = segments[i]?.startTime ?? -Infinity;
      if (start < currentStart - 0.001 && start > bestStart) {
        bestStart = start;
        target = i;
      }
    }

    actions.seekToSegment(target);
    if (!state.isPlaying) {
      actions.play();
    }
  }, [actions, segments, state.activeSegmentIndex, state.isPlaying]);

  const handleNextSegment = useCallback(() => {
    const currentIndex =
      state.activeSegmentIndex >= 0 ? state.activeSegmentIndex : 0;
    const current = segments[currentIndex];
    const currentStart = current?.startTime ?? -Infinity;

    let target =
      currentIndex >= 0 ? Math.min(segments.length - 1, currentIndex + 1) : 0;
    let bestStart = Infinity;
    // Find the earliest segment whose start is strictly later than current.
    // This works even when transcript list order is imperfect.
    for (let i = 0; i < segments.length; i++) {
      const start = segments[i]?.startTime ?? Infinity;
      if (start > currentStart + 0.001 && start < bestStart) {
        bestStart = start;
        target = i;
      }
    }

    actions.seekToSegment(target);
    if (!state.isPlaying) {
      actions.play();
    }
  }, [actions, segments.length, state.activeSegmentIndex, state.isPlaying]);

  return (
    <div className="flex flex-col h-full">
      {/* Subtitle Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 pt-6 sm:pt-12 pb-40 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
        <div className="max-w-3xl mx-auto space-y-1">
          {segments.length > 0 ? (
            <>
              {visibleSegments.map((segment) => {
                const sentenceKey = getSentenceKey?.(segment);
                const isBookmarked =
                  sentenceKey != null &&
                  Boolean(bookmarkedSentenceKeys?.has(sentenceKey));

                return (
                  <AudioSegmentBlock
                    key={segment.index}
                    segment={segment}
                    isActive={segment.index === state.activeSegmentIndex}
                    highlightSet={highlightSet}
                    studyWordSet={studyWordSet}
                    studyPhraseSet={studyPhraseSet}
                    knownWords={knownWords}
                    showHighlights={showHighlights}
                    getCollocations={getCollocations}
                    onClick={() => handleSegmentClick(segment.index)}
                    onWordClick={onWordClick}
                    isBookmarked={isBookmarked}
                    onToggleBookmark={onToggleSentenceBookmark}
                  />
                );
              })}

              {visibleCount < segments.length && (
                <div
                  ref={loadMoreRef}
                  className="py-4 text-center text-xs font-mono text-white/40"
                >
                  Loading more subtitles... ({visibleCount}/{segments.length})
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-text-muted py-12 space-y-4">
              <div>
                <p>No subtitle segments available.</p>
                <p className="text-sm mt-2 opacity-60">
                  Audio will play without synchronized text.
                </p>
              </div>

              {onTranscribe && (
                <button
                  onClick={onTranscribe}
                  disabled={isTranscribing}
                  className="
                    inline-flex items-center gap-2 px-4 py-2 
                    bg-white/5 hover:bg-white/10 active:bg-white/15 
                    border border-white/10 rounded-full 
                    text-sm font-medium text-white/80 transition-all
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Starting Transcription...</span>
                    </>
                  ) : (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-primary"></span>
                      </span>
                      <span>Auto-Transcribe with AI</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Player Controls */}
      <PlayerControls
        isPlaying={state.isPlaying}
        isLoading={state.isLoading}
        currentTime={state.currentTime}
        duration={state.duration}
        progress={state.progress}
        playbackRate={state.playbackRate}
        loopMode={state.loopMode}
        loopStart={state.loopStart}
        loopEnd={state.loopEnd}
        onTogglePlay={actions.togglePlay}
        onSeek={actions.seekTo}
        onSkip={actions.skip}
        onPrevSegment={handlePrevSegment}
        onNextSegment={handleNextSegment}
        onRateChange={actions.setPlaybackRate}
        onToggleSegmentLoop={actions.toggleSegmentLoop}
        onSetABStart={actions.setABStart}
        onSetABEnd={actions.setABEnd}
        onClearABLoop={actions.clearABLoop}
        onToggleABLoop={actions.toggleABLoop}
      />
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

function AudioContentRendererComponent(props: ContentRendererProps) {
  const { bundle } = props;

  // Convert ContentBlocks to AudioSegments
  const segments: AudioSegment[] = useMemo(() => {
    return bundle.blocks
      .filter((block) => block.type === "audio_segment")
      .map((block, idx) => ({
        index: idx,
        text: block.text || "",
        sentences: block.sentences || [block.text || ""],
        startTime: block.start_time || 0,
        endTime: block.end_time || 0,
      }));
  }, [bundle.blocks]);

  // Audio player hook
  const { state, actions } = useAudioPlayer({
    audioUrl: bundle.audio_url || "",
    segments,
  });

  return (
    <AudioPlayerUI
      {...props}
      segments={segments}
      state={state}
      actions={actions}
    />
  );
}

// ============================================================
// Renderer Class
// ============================================================

export class AudioContentRenderer implements ContentRenderer {
  readonly name = "AudioContentRenderer";

  canRender(bundle: ContentBundle): boolean {
    // Only render audiobook content (Podcast has its own dedicated UI)
    return (
      bundle.source_type === "audiobook" ||
      (bundle.audio_url !== undefined &&
        bundle.audio_url !== null &&
        bundle.blocks.some((b) => b.type === "audio_segment"))
    );
  }

  render(props: ContentRendererProps): React.ReactNode {
    return <AudioContentRendererComponent {...props} />;
  }
}

// Export the component for direct use
export { AudioContentRendererComponent };

export default AudioContentRenderer;
