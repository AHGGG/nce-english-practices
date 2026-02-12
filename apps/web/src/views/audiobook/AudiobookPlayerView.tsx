/**
 * AudiobookPlayerView - Play an audiobook with subtitle sync
 * Uses the AudioContentRenderer from the content adapter system.
 * Supports multi-track audiobooks with track selector.
 */
import {
  useCallback,
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Loader2, List, PanelRight, X } from "lucide-react";
import { apiGet } from "../../api/auth";
import {
  rendererRegistry,
  initializeRenderers,
} from "../../components/content";
import WordInspector from "../../components/reading/WordInspector";
import { useWordExplainer } from "@nce/shared";
import { useToast } from "../../components/ui/Toast";
import { transcribeAudiobook } from "../../api/audiobook";

interface AudiobookTrack {
  index: number;
  title: string;
  start_time?: number;
}

interface AudiobookBundle {
  title?: string;
  metadata?: {
    tracks?: AudiobookTrack[];
    track_count?: number;
  };
}

interface RendererLike {
  render: (props: {
    bundle: AudiobookBundle;
    showHighlights: boolean;
    onWordClick: (word: string, sentence: string) => void;
    onTranscribe: () => void;
    isTranscribing: boolean;
  }) => ReactNode;
}

const WordInspectorPanel = WordInspector as unknown as ComponentType<
  Record<string, unknown>
>;

// Initialize renderers on load
initializeRenderers();

export default function AudiobookPlayerView() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTrack = parseInt(searchParams.get("track") || "0", 10);

  const [bundle, setBundle] = useState<AudiobookBundle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTrackList, setShowTrackList] = useState(true); // Default to open on desktop
  const [isTranscribing, setIsTranscribing] = useState(false);
  const { addToast } = useToast();

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
        const data = await apiGet(
          `/api/content/audiobook/${bookId}?track=${currentTrack}`,
        );
        setBundle(data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unknown error");
        }
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
    (word: string, sentence: string) => {
      hookHandleWordClick(word, sentence);
    },
    [hookHandleWordClick],
  );

  // Handle track change
  const handleTrackChange = useCallback(
    (trackIndex: number) => {
      setSearchParams({ track: trackIndex.toString() });
      // Only close track list on mobile (< lg breakpoint)
      if (window.innerWidth < 1024) {
        setShowTrackList(false);
      }
    },
    [setSearchParams],
  );

  // Handle transcription
  const handleTranscribe = useCallback(async () => {
    if (!bundle) return;
    if (!bookId) return;
    setIsTranscribing(true);
    try {
      await transcribeAudiobook(bookId, currentTrack, true);
      addToast(
        "Transcription started. This may take a few minutes.",
        "success",
      );
    } catch (err: unknown) {
      console.error("Transcription failed:", err);
      if (err instanceof Error) {
        addToast(err.message || "Failed to start transcription", "error");
      } else {
        addToast("Failed to start transcription", "error");
      }
    } finally {
      setIsTranscribing(false);
    }
  }, [bookId, currentTrack, bundle, addToast]);

  // Get renderer for the bundle
  const renderer = bundle
    ? (rendererRegistry.getRendererForBundle(
        bundle as unknown as never,
      ) as RendererLike | null)
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

        {/* Track List Toggle (Sidebar) */}
        {trackCount > 1 && (
          <button
            onClick={() => setShowTrackList(!showTrackList)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ml-4 ${
              showTrackList
                ? "bg-accent-primary/10 border-accent-primary/20 text-accent-primary"
                : "bg-white/5 border-white/10 hover:bg-white/10 text-text-secondary"
            }`}
            title="Toggle Chapter List"
          >
            <PanelRight className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">
              Chapters
            </span>
          </button>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
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
              bundle: bundle as AudiobookBundle,
              showHighlights: true,
              onWordClick: handleWordClick,
              onTranscribe: handleTranscribe,
              isTranscribing: isTranscribing,
            })
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-muted">
              <p>No renderer available for this content type</p>
            </div>
          )}
        </div>

        {/* Track List Sidebar */}
        {trackCount > 1 && showTrackList && (
          <div className="w-72 lg:w-80 border-l border-white/10 flex flex-col bg-bg-surface z-10 shrink-0 absolute inset-y-0 right-0 lg:static lg:inset-auto shadow-2xl lg:shadow-none">
            <div className="p-3 lg:p-4 border-b border-white/5 flex items-center justify-between shrink-0">
              <h2 className="text-xs lg:text-sm font-semibold flex items-center gap-2">
                <List className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-accent-primary" />
                Chapters
              </h2>
              <button
                onClick={() => setShowTrackList(false)}
                className="lg:hidden p-1 hover:bg-white/10 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 lg:p-2">
              {tracks.map((track: AudiobookTrack) => (
                <button
                  key={track.index}
                  onClick={() => handleTrackChange(track.index)}
                  className={`w-full px-2.5 py-2 lg:px-3 lg:py-3 text-left rounded-lg mb-1 transition-all flex items-start gap-2 lg:gap-3 group ${
                    track.index === currentTrack
                      ? "bg-accent-primary/10 text-accent-primary ring-1 ring-accent-primary/20"
                      : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                  }`}
                >
                  <span
                    className={`text-[10px] lg:text-xs font-mono mt-0.5 shrink-0 ${
                      track.index === currentTrack
                        ? "text-accent-primary/60"
                        : "text-white/20 group-hover:text-white/40"
                    }`}
                  >
                    {String(track.index + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs lg:text-sm font-medium leading-snug truncate">
                      {track.title}
                    </div>
                    {track.start_time !== undefined && (
                      <div className="text-[10px] lg:text-xs opacity-50 mt-0.5 lg:mt-1">
                        {formatTime(track.start_time)}
                      </div>
                    )}
                  </div>
                  {track.index === currentTrack && (
                    <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-accent-primary mt-1 lg:mt-1.5 shrink-0 animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Word Inspector Sidebar */}
        {selectedWord && (
          <div className="w-96 border-l border-white/10 overflow-y-auto bg-bg-surface shrink-0 absolute inset-y-0 right-0 z-20 shadow-2xl">
            <WordInspectorPanel
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

// Helper for time formatting
function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
