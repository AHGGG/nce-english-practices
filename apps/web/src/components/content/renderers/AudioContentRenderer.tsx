// apps/web/src/components/content/renderers/AudioContentRenderer.tsx

import React, { useCallback, useMemo, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Loader2,
  Gauge,
} from "lucide-react";
import { useAudioPlayer, PLAYBACK_RATES, type AudioSegment } from "@nce/shared";
import type {
  ContentRenderer,
  ContentRendererProps,
  ContentBundle,
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
  studyHighlightSet?: Set<string>;
  knownWords?: Set<string>;
  showHighlights?: boolean;
  onClick?: () => void;
  onWordClick?: (word: string, sentence: string) => void;
}

function AudioSegmentBlock({
  segment,
  isActive,
  highlightSet,
  studyHighlightSet,
  knownWords,
  showHighlights,
  onClick,
  onWordClick,
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

      if (word && onWordClick) {
        e.stopPropagation();
        onWordClick(word.toLowerCase(), sentence || "");
      } else {
        // Click on segment itself to seek
        onClick?.();
      }
    },
    [onClick, onWordClick],
  );

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className={`
        px-4 py-3 rounded-lg cursor-pointer transition-all duration-300
        ${
          isActive
            ? "bg-accent-primary/10 border-l-4 border-accent-primary shadow-lg shadow-accent-primary/20"
            : "hover:bg-white/5 border-l-4 border-transparent"
        }
      `}
    >
      {/* Time indicator */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`text-xs font-mono ${isActive ? "text-accent-primary" : "text-text-muted"}`}
        >
          {formatTime(segment.startTime)}
        </span>
        {isActive && (
          <span className="text-xs px-2 py-0.5 bg-accent-primary/20 text-accent-primary rounded-full">
            Now Playing
          </span>
        )}
      </div>

      {/* Sentences */}
      <div className="space-y-1">
        {segment.sentences.map((sentence: string, idx: number) => (
          <SentenceBlock
            key={idx}
            text={sentence}
            highlightSet={highlightSet}
            studyHighlightSet={studyHighlightSet}
            knownWords={knownWords}
            showHighlights={showHighlights}
          />
        ))}
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
    <div className="relative">
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
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSkip: (seconds: number) => void;
  onRateChange: (rate: number) => void;
}

function PlayerControls({
  isPlaying,
  isLoading,
  currentTime,
  duration,
  progress,
  playbackRate,
  onTogglePlay,
  onSeek,
  onSkip,
  onRateChange,
}: PlayerControlsProps) {
  const [speedMenuOpen, setSpeedMenuOpen] = React.useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

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
    <div className="shrink-0 border-t border-white/10 bg-white/[0.02] backdrop-blur-xl">
      {/* Progress Bar */}
      <div
        ref={progressBarRef}
        onClick={handleProgressClick}
        className="h-1 bg-white/[0.1] cursor-pointer group relative transition-all duration-300 hover:h-2"
      >
        <div
          className="h-full bg-accent-primary shadow-[0_0_10px_rgba(var(--color-accent-primary-rgb),0.5)] relative"
          style={{ width: `${progress}%` }}
        >
          {/* Glow effect at tip */}
          <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-r from-transparent to-white/50" />
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Time Display */}
        <div className="flex-1 text-xs text-text-muted font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          {/* Skip Back */}
          <button
            onClick={() => onSkip(-10)}
            className="p-2 text-white/50 hover:text-white transition-colors hover:bg-white/5 rounded-full"
            title="Skip back 10s"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            disabled={isLoading}
            className="p-3 bg-accent-primary text-black rounded-full hover:bg-accent-primary/90 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(var(--color-accent-primary-rgb),0.4)] disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          {/* Skip Forward */}
          <button
            onClick={() => onSkip(10)}
            className="p-2 text-white/50 hover:text-white transition-colors hover:bg-white/5 rounded-full"
            title="Skip forward 10s"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Speed Control */}
        <div className="flex-1 flex justify-end">
          <SpeedMenu
            currentRate={playbackRate}
            onRateChange={onRateChange}
            isOpen={speedMenuOpen}
            onToggle={() => setSpeedMenuOpen(!speedMenuOpen)}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

function AudioContentRendererComponent({
  bundle,
  highlightSet,
  studyHighlightSet,
  knownWords,
  showHighlights = true,
  onWordClick,
}: ContentRendererProps) {
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

  // Handle segment click to seek
  const handleSegmentClick = useCallback(
    (index: number) => {
      actions.seekToSegment(index);
      if (!state.isPlaying) {
        actions.play();
      }
    },
    [actions, state.isPlaying],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Subtitle Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
        <div className="max-w-2xl mx-auto space-y-2">
          {segments.length > 0 ? (
            segments.map((segment) => (
              <AudioSegmentBlock
                key={segment.index}
                segment={segment}
                isActive={segment.index === state.activeSegmentIndex}
                highlightSet={highlightSet}
                studyHighlightSet={studyHighlightSet}
                knownWords={knownWords}
                showHighlights={showHighlights}
                onClick={() => handleSegmentClick(segment.index)}
                onWordClick={onWordClick}
              />
            ))
          ) : (
            <div className="text-center text-text-muted py-12">
              <p>No subtitle segments available.</p>
              <p className="text-sm mt-2">
                Audio will play without synchronized text.
              </p>
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
        onTogglePlay={actions.togglePlay}
        onSeek={actions.seekTo}
        onSkip={actions.skip}
        onRateChange={actions.setPlaybackRate}
      />
    </div>
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

export default AudioContentRenderer;
