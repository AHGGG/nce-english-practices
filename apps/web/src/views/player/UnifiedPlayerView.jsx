/**
 * Unified Audio Player View
 *
 * Renders time-aligned audio content for both Podcast (with transcription)
 * and Audiobook sources using the shared AudioContentRenderer.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { apiGet } from "../../api/auth";
import { getCachedAudioUrl } from "../../utils/offline";
import {
  useAudioPlayer,
  useCollocationLoader,
  useWordExplainer,
} from "@nce/shared";

// Import the component directly (not the class)
import { AudioPlayerUI } from "../../components/content/renderers/AudioContentRenderer";
import WordInspector from "../../components/reading/WordInspector";

export default function UnifiedPlayerView() {
  const { sourceType, contentId } = useParams();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Audio Player State Tracking
  const wasPlayingRef = useRef(false);
  const prevSelectedWordRef = useRef(null);

  // Collocation loader for phrase highlighting
  const { getCollocations, loadCollocations } = useCollocationLoader({
    prefetchAhead: 3,
  });

  // Word explanation
  const {
    selectedWord,
    isPhrase,
    inspectorData,
    isInspecting,
    contextExplanation,
    isExplaining,
    explainStyle,
    currentSentenceContext,
    handleWordClick: hookHandleWordClick,
    closeInspector,
    changeExplainStyle,
    generatedImage,
    isGeneratingImage,
    generateImage,
  } = useWordExplainer();

  useEffect(() => {
    loadContent();
  }, [sourceType, contentId]);

  async function loadContent() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (sourceType === "audiobook") {
        // Track parameter for audiobooks
        const urlParams = new URLSearchParams(window.location.search);
        const track = urlParams.get("track") || "0";
        params.set("track", track);
      }

      const url = `/api/content/player/${sourceType}/${contentId}${params.toString() ? "?" + params.toString() : ""}`;
      const data = await apiGet(url);

      // For podcast, try to use cached audio from Cache API
      // This avoids re-downloading audio that was cached during transcription
      if (sourceType === "podcast" && data.audio_url) {
        const cachedUrl = await getCachedAudioUrl(data.audio_url);
        if (cachedUrl) {
          console.log("[UnifiedPlayer] Using cached audio URL");
          data.audio_url = cachedUrl;
        }
      }

      setBundle(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Load collocations when bundle is ready
  useEffect(() => {
    if (!bundle?.blocks) return;

    // Extract all sentences from audio segments
    const allSentences = [];
    bundle.blocks.forEach((block) => {
      if (block.type === "audio_segment" && block.sentences) {
        allSentences.push(...block.sentences);
      } else if (block.type === "audio_segment" && block.text) {
        allSentences.push(block.text);
      }
    });

    if (allSentences.length > 0) {
      // Load collocations for first batch
      loadCollocations(allSentences.slice(0, 20));
    }
  }, [bundle, loadCollocations]);

  // Handle word click
  const handleWordClick = useCallback(
    (word, sentence) => {
      hookHandleWordClick(word, sentence);
    },
    [hookHandleWordClick],
  );

  // Convert ContentBlocks to AudioSegments
  const segments = useMemo(() => {
    if (!bundle?.blocks) return [];
    return bundle.blocks
      .filter((block) => block.type === "audio_segment")
      .map((block, idx) => ({
        index: idx,
        text: block.text || "",
        sentences: block.sentences || [block.text || ""],
        startTime: block.start_time || 0,
        endTime: block.end_time || 0,
      }));
  }, [bundle?.blocks]);

  // Audio Player Hook
  const { state: audioState, actions: audioActions } = useAudioPlayer({
    audioUrl: bundle?.audio_url || "",
    segments,
  });

  // Handle auto-pause/resume on word lookup
  useEffect(() => {
    const prevSelectedWord = prevSelectedWordRef.current;

    if (selectedWord && !prevSelectedWord) {
      // Opening Inspector
      if (audioState.isPlaying) {
        wasPlayingRef.current = true;
        audioActions.pause();
      } else {
        wasPlayingRef.current = false;
      }
    } else if (!selectedWord && prevSelectedWord) {
      // Closing Inspector
      if (wasPlayingRef.current) {
        audioActions.play();
        wasPlayingRef.current = false;
      }
    }

    prevSelectedWordRef.current = selectedWord;
  }, [selectedWord, audioState.isPlaying, audioActions]);

  // Convert bundle to renderer props format
  const rendererProps = useMemo(() => {
    if (!bundle) return null;
    return {
      bundle,
      highlightSet: new Set(),
      studyWordSet: new Set(),
      studyPhraseSet: new Set(),
      knownWords: new Set(),
      showHighlights: true,
      getCollocations,
      onWordClick: handleWordClick,
      // Pass player state/actions/segments
      segments,
      state: audioState,
      actions: audioActions,
    };
  }, [
    bundle,
    getCollocations,
    handleWordClick,
    segments,
    audioState,
    audioActions,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent-primary mx-auto" />
          <p className="text-white/60 text-sm">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-6">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-red-400 font-mono">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="text-accent-primary hover:underline font-mono text-sm uppercase tracking-wider"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0a0f0d] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 bg-[#0a0f0d]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white/[0.03] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>

            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-medium text-white truncate">
                {bundle?.title || "Audio Player"}
              </h1>
              {bundle?.metadata?.feed_title && (
                <p className="text-xs text-white/40 truncate">
                  {bundle.metadata.feed_title}
                </p>
              )}
            </div>

            <div className="text-xs font-mono text-white/40 uppercase tracking-wider px-2 py-1 bg-white/5 rounded border border-white/10">
              {sourceType === "podcast" ? "Intensive Listening" : "Audiobook"}
            </div>
          </div>
        </div>
      </header>

      {/* Content with optional sidebar */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Main content */}
        <main className="flex-1 flex flex-col min-h-0">
          {rendererProps && <AudioPlayerUI {...rendererProps} />}
        </main>

        {/* Word Inspector Sidebar */}
        {selectedWord && (
          <div className="w-96 border-l border-white/10 overflow-y-auto bg-bg-surface shrink-0 absolute inset-y-0 right-0 z-20 shadow-2xl">
            <WordInspector
              selectedWord={selectedWord}
              isPhrase={isPhrase}
              isInspecting={isInspecting}
              inspectorData={inspectorData}
              currentSentenceContext={currentSentenceContext}
              contextExplanation={contextExplanation}
              isExplaining={isExplaining}
              currentStyle={explainStyle}
              onExplainStyle={changeExplainStyle}
              onClose={closeInspector}
              generatedImage={generatedImage}
              isGeneratingImage={isGeneratingImage}
              onGenerateImage={generateImage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
