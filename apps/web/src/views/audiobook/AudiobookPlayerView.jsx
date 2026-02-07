/**
 * AudiobookPlayerView - Play an audiobook with subtitle sync
 * Uses the AudioContentRenderer from the content adapter system.
 * Supports multi-track audiobooks with track selector.
 */
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Loader2, List, ChevronDown } from "lucide-react";
import { authFetch } from "../../api/auth";
import {
  rendererRegistry,
  initializeRenderers,
} from "../../components/content";
import WordInspector from "../../components/reading/WordInspector";
import useWordExplainer from "../../hooks/useWordExplainer";

// Initialize renderers on load
initializeRenderers();

export default function AudiobookPlayerView() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTrack = parseInt(searchParams.get("track") || "0", 10);

  const [bundle, setBundle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTrackList, setShowTrackList] = useState(false);

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

  // Fetch audiobook content
  useEffect(() => {
    const fetchAudiobook = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await authFetch(
          `/api/content/audiobook/${bookId}?track=${currentTrack}`,
        );
        if (!res.ok) throw new Error("Failed to fetch audiobook");
        const data = await res.json();
        setBundle(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (bookId) {
      fetchAudiobook();
    }
  }, [bookId, currentTrack]);

  // Handle word click
  const handleWordClick = useCallback(
    (word, sentence) => {
      hookHandleWordClick(word, sentence);
    },
    [hookHandleWordClick],
  );

  // Handle track change
  const handleTrackChange = useCallback(
    (trackIndex) => {
      setSearchParams({ track: trackIndex.toString() });
      setShowTrackList(false);
    },
    [setSearchParams],
  );

  // Get renderer for the bundle
  const renderer = bundle
    ? rendererRegistry.getRendererForBundle(bundle)
    : null;

  // Extract tracks from metadata
  const tracks = bundle?.metadata?.tracks || [];
  const trackCount = bundle?.metadata?.track_count || 0;

  return (
    <div className="h-screen flex flex-col bg-bg-base text-text-primary">
      {/* Header */}
      <header className="shrink-0 h-14 border-b border-white/[0.05] flex items-center px-4 bg-bg-base/80 backdrop-blur-xl z-50">
        <button
          onClick={() => navigate("/audiobook")}
          className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors group px-2 py-1.5 rounded-lg hover:bg-white/5"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-xs font-bold uppercase tracking-widest">
            Library
          </span>
        </button>

        {bundle && (
          <h1 className="ml-4 text-sm font-semibold truncate flex-1">
            {bundle.title}
          </h1>
        )}

        {/* Track Selector */}
        {trackCount > 1 && (
          <div className="relative">
            <button
              onClick={() => setShowTrackList(!showTrackList)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <List className="w-4 h-4 text-accent-primary" />
              <span className="text-xs font-medium">
                Track {currentTrack + 1} / {trackCount}
              </span>
              <ChevronDown
                className={`w-3 h-3 transition-transform ${showTrackList ? "rotate-180" : ""}`}
              />
            </button>

            {/* Track List Dropdown */}
            {showTrackList && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowTrackList(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-72 max-h-80 overflow-y-auto bg-bg-surface border border-white/10 rounded-xl shadow-2xl z-50">
                  {tracks.map((track) => (
                    <button
                      key={track.index}
                      onClick={() => handleTrackChange(track.index)}
                      className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center gap-3 ${
                        track.index === currentTrack
                          ? "bg-accent-primary/10 text-accent-primary"
                          : "text-text-primary"
                      }`}
                    >
                      <span className="text-xs font-mono text-text-muted w-6">
                        {String(track.index + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1 text-sm truncate">
                        {track.title}
                      </span>
                      {track.index === currentTrack && (
                        <span className="text-xs bg-accent-primary/20 px-2 py-0.5 rounded-full">
                          Playing
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-text-muted">
              <div className="text-center">
                <p className="text-lg mb-2">Failed to load audiobook</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          ) : renderer ? (
            renderer.render({
              bundle,
              showHighlights: true,
              onWordClick: handleWordClick,
            })
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-muted">
              <p>No renderer available for this content type</p>
            </div>
          )}
        </div>

        {/* Word Inspector Sidebar */}
        {selectedWord && (
          <div className="w-96 border-l border-white/10 overflow-y-auto bg-bg-surface">
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
