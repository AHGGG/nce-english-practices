/**
 * Unified Audio Player View
 *
 * Renders time-aligned audio content for both Podcast (with transcription)
 * and Audiobook sources using the shared AudioContentRenderer.
 */

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type ComponentType,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  ListChecks,
  Trash2,
  Plus,
} from "lucide-react";
import { apiGet, apiPost, apiPut } from "../../api/auth";
import * as podcastApi from "../../api/podcast";
import {
  savePositionLocal,
  getLatestPosition,
} from "../../utils/localProgress";
import { getCachedAudioUrl } from "../../utils/offline";
import { useGlobalState } from "../../context/GlobalContext";
import {
  useAudioPlayer,
  useCollocationLoader,
  useWordExplainer,
} from "@nce/shared";
import CollocationDifficultySwitch from "../../components/content/shared/CollocationDifficultySwitch";
import { filterCollocationsByLevel } from "../../components/content/shared/collocationDifficulty";
import type {
  Collocation,
  ContentBlock,
  ContentBundle,
} from "../../components/content/types";

// Import the component directly (not the class)
import { AudioPlayerUI } from "../../components/content/renderers/AudioContentRenderer";
import WordInspector from "../../components/reading/WordInspector";
import { useToast } from "../../components/ui/Toast";

interface AudioSegment {
  index: number;
  text: string;
  sentences: string[];
  startTime: number;
  endTime: number;
}

interface LookupItem {
  key: string;
  kind: "word" | "phrase";
  text: string;
  sentence: string;
  sentenceIndex: number;
  sourceId: string;
  count: number;
}

interface BookmarkedSentence {
  key: string;
  sentence: string;
  sentenceIndex: number;
  sourceId: string;
}

interface StudyBasketApiResponse {
  lookup_items: StudyBasketLookupItemWire[];
  bookmarked_sentences: StudyBasketSentenceWire[];
}

interface StudyBasketLookupItemWire {
  key: string;
  kind: "word" | "phrase";
  text: string;
  sentence?: string;
  sentence_index: number;
  source_id: string;
  count?: number;
}

interface StudyBasketSentenceWire {
  key: string;
  sentence: string;
  sentence_index: number;
  source_id: string;
}

const WordInspectorPanel = WordInspector as unknown as ComponentType<
  Record<string, unknown>
>;

export default function UnifiedPlayerView() {
  const { sourceType, contentId } = useParams();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState<ContentBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {
    state: { settings },
    actions: { updateSetting },
  } = useGlobalState();

  // Audio Player State Tracking
  const wasPlayingRef = useRef(false);
  const prevSelectedWordRef = useRef<string | null>(null);
  const lastCollocationBucketRef = useRef<number | null>(null);
  const podcastSessionIdRef = useRef<number | null>(null);
  const [podcastSessionId, setPodcastSessionId] = useState<number | null>(null);
  const podcastListenedSecondsRef = useRef(0);
  const podcastLastPositionRef = useRef<number>(0);
  const podcastFinalizedRef = useRef(false);
  const podcastCurrentTimeRef = useRef(0);
  const initialSeekAppliedRef = useRef<string | null>(null);
  const prevIsPlayingRef = useRef(false);

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
  const { addToast } = useToast();
  const [lookupItems, setLookupItems] = useState<LookupItem[]>([]);
  const [bookmarkedSentences, setBookmarkedSentences] = useState<
    BookmarkedSentence[]
  >([]);
  const [showStudySidebarMobile, setShowStudySidebarMobile] = useState(false);
  const [isAddingToReview, setIsAddingToReview] = useState(false);
  const [lastJumpPosition, setLastJumpPosition] = useState<{
    time: number;
    segmentIndex: number;
  } | null>(null);
  const [studyBasketHydrated, setStudyBasketHydrated] = useState(false);

  useEffect(() => {
    loadContent();
  }, [sourceType, contentId]);

  const studyBasketScope = useMemo(() => {
    if (!sourceType || !contentId) return null;
    if (sourceType !== "podcast" && sourceType !== "audiobook") return null;
    return {
      sourceType,
      contentId: String(contentId),
    };
  }, [sourceType, contentId]);

  const fromWireLookupItem = useCallback(
    (item: StudyBasketLookupItemWire): LookupItem => ({
      key: item.key,
      kind: item.kind,
      text: item.text,
      sentence: item.sentence || "",
      sentenceIndex: item.sentence_index,
      sourceId: item.source_id,
      count: item.count || 1,
    }),
    [],
  );

  const fromWireSentenceItem = useCallback(
    (item: StudyBasketSentenceWire): BookmarkedSentence => ({
      key: item.key,
      sentence: item.sentence,
      sentenceIndex: item.sentence_index,
      sourceId: item.source_id,
    }),
    [],
  );

  const toWireLookupItem = useCallback(
    (item: LookupItem): StudyBasketLookupItemWire => ({
      key: item.key,
      kind: item.kind,
      text: item.text,
      sentence: item.sentence,
      sentence_index: item.sentenceIndex,
      source_id: item.sourceId,
      count: item.count,
    }),
    [],
  );

  const toWireSentenceItem = useCallback(
    (item: BookmarkedSentence): StudyBasketSentenceWire => ({
      key: item.key,
      sentence: item.sentence,
      sentence_index: item.sentenceIndex,
      source_id: item.sourceId,
    }),
    [],
  );

  useEffect(() => {
    if (!studyBasketScope) {
      setStudyBasketHydrated(false);
      setLookupItems([]);
      setBookmarkedSentences([]);
      return;
    }

    let cancelled = false;
    setStudyBasketHydrated(false);

    const loadStudyBasket = async () => {
      try {
        const data = (await apiGet(
          `/api/study-basket/${studyBasketScope.sourceType}/${encodeURIComponent(studyBasketScope.contentId)}`,
        )) as Partial<StudyBasketApiResponse>;

        if (cancelled) return;

        setLookupItems(
          Array.isArray(data.lookup_items)
            ? data.lookup_items.map(fromWireLookupItem)
            : [],
        );
        setBookmarkedSentences(
          Array.isArray(data.bookmarked_sentences)
            ? data.bookmarked_sentences.map(fromWireSentenceItem)
            : [],
        );
      } catch (e) {
        if (cancelled) return;
        console.warn(
          "[UnifiedPlayer] Failed to load study basket from server:",
          e,
        );
        setLookupItems([]);
        setBookmarkedSentences([]);
      } finally {
        if (cancelled) return;
        setShowStudySidebarMobile(false);
        setLastJumpPosition(null);
        setStudyBasketHydrated(true);
      }
    };

    void loadStudyBasket();
    return () => {
      cancelled = true;
    };
  }, [studyBasketScope, fromWireLookupItem, fromWireSentenceItem]);

  useEffect(() => {
    if (!studyBasketScope || !studyBasketHydrated) return;

    const timer = window.setTimeout(() => {
      void apiPut(
        `/api/study-basket/${studyBasketScope.sourceType}/${encodeURIComponent(studyBasketScope.contentId)}`,
        {
          lookup_items: lookupItems.map(toWireLookupItem),
          bookmarked_sentences: bookmarkedSentences.map(toWireSentenceItem),
        },
      ).catch((e) => {
        console.warn(
          "[UnifiedPlayer] Failed to sync study basket to server:",
          e,
        );
      });
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    studyBasketScope,
    studyBasketHydrated,
    lookupItems,
    bookmarkedSentences,
    toWireLookupItem,
    toWireSentenceItem,
  ]);

  const getSentenceText = useCallback((segment: AudioSegment) => {
    return segment.sentences[0] || segment.text || "";
  }, []);

  const buildSourceId = useCallback(
    (sentenceIndex: number) => {
      const source = sourceType === "podcast" ? "podcast" : "audiobook";
      const itemId =
        sourceType === "podcast"
          ? String(bundle?.metadata?.episode_id || contentId || "")
          : String(contentId || "");
      return `${source}:${itemId}:${sentenceIndex}`;
    },
    [sourceType, bundle?.metadata?.episode_id, contentId],
  );

  const getSentenceKey = useCallback(
    (segment: AudioSegment) => {
      return `${segment.index}:${getSentenceText(segment)}`;
    },
    [getSentenceText],
  );

  const handleToggleSentenceBookmark = useCallback(
    (segment: AudioSegment) => {
      const sentence = getSentenceText(segment).trim();
      if (!sentence) return;

      const key = getSentenceKey(segment);
      const sourceId = buildSourceId(segment.index);

      setBookmarkedSentences((prev) => {
        const exists = prev.some((item) => item.key === key);
        if (exists) {
          return prev.filter((item) => item.key !== key);
        }
        return [
          {
            key,
            sentence,
            sentenceIndex: segment.index,
            sourceId,
          },
          ...prev,
        ];
      });
    },
    [buildSourceId, getSentenceKey, getSentenceText],
  );

  async function loadContent() {
    if (!sourceType || !contentId) {
      setError("Invalid player route parameters");
      setLoading(false);
      return;
    }

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
      const data = (await apiGet(url)) as ContentBundle;

      if (sourceType === "podcast") {
        const episodeId = Number(contentId);
        if (Number.isFinite(episodeId) && episodeId > 0) {
          try {
            const latest = await getLatestPosition(episodeId);
            const serverPosition = Number(data.metadata?.current_position || 0);
            const mergedPosition = Math.max(
              serverPosition,
              latest.position || 0,
            );
            data.metadata = {
              ...(data.metadata || {}),
              current_position: mergedPosition,
              is_finished: Boolean(
                data.metadata?.is_finished || latest.isFinished,
              ),
            };
          } catch (progressError) {
            console.warn(
              "[UnifiedPlayer] Failed to load latest podcast position:",
              progressError,
            );
          }
        }
      }

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
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Unknown error");
      }
    } finally {
      setLoading(false);
    }
  }

  const removeLookupItem = useCallback((key: string) => {
    setLookupItems((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const removeBookmarkedSentence = useCallback((key: string) => {
    setBookmarkedSentences((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const addAllToReviewQueue = useCallback(async () => {
    if (isAddingToReview) return;

    const bucket = new Map<
      string,
      {
        sourceId: string;
        sentenceIndex: number;
        sentenceText: string;
        highlightedItems: Set<string>;
      }
    >();

    for (const item of bookmarkedSentences) {
      bucket.set(item.key, {
        sourceId: item.sourceId,
        sentenceIndex: item.sentenceIndex,
        sentenceText: item.sentence,
        highlightedItems: new Set<string>(),
      });
    }

    for (const item of lookupItems) {
      const sentenceText = item.sentence || item.text;
      const groupKey = `${item.sourceId}:${item.sentenceIndex}:${sentenceText}`;
      const existing = bucket.get(groupKey);
      if (existing) {
        existing.highlightedItems.add(item.text);
      } else {
        bucket.set(groupKey, {
          sourceId: item.sourceId,
          sentenceIndex: item.sentenceIndex,
          sentenceText,
          highlightedItems: new Set([item.text]),
        });
      }
    }

    if (bucket.size === 0) {
      addToast("No words/collocations or saved sentences yet.", "warning");
      return;
    }

    setIsAddingToReview(true);
    try {
      for (const payload of bucket.values()) {
        await apiPost("/api/review/create", {
          source_id: payload.sourceId,
          sentence_index: payload.sentenceIndex,
          sentence_text: payload.sentenceText,
          highlighted_items: Array.from(payload.highlightedItems),
          difficulty_type: "vocabulary",
        });
      }

      addToast(`Added ${bucket.size} item(s) to review queue.`, "success");
      setLookupItems([]);
      setBookmarkedSentences([]);
      setShowStudySidebarMobile(false);
    } catch (e) {
      console.error(
        "Failed to add podcast intensive items to review queue:",
        e,
      );
      addToast("Failed to add items to review queue", "error");
    } finally {
      setIsAddingToReview(false);
    }
  }, [addToast, bookmarkedSentences, isAddingToReview, lookupItems]);

  // Convert ContentBlocks to AudioSegments
  const segments = useMemo(() => {
    if (!bundle?.blocks) return [];
    return bundle.blocks
      .filter((block: ContentBlock) => block.type === "audio_segment")
      .map((block: ContentBlock, idx: number) => ({
        index: idx,
        text: block.text || "",
        sentences: block.sentences || [block.text || ""],
        startTime: block.start_time || 0,
        endTime: block.end_time || 0,
      })) as AudioSegment[];
  }, [bundle?.blocks]);

  // Audio Player Hook
  const { state: audioState, actions: audioActions } = useAudioPlayer({
    audioUrl: bundle?.audio_url || "",
    segments,
    initialPlaybackRate: settings.podcastSpeed || 1,
  });

  // Handle word click
  const handleWordClick = useCallback(
    (word: string, sentence: string) => {
      const cleanWord = word.toLowerCase().trim();
      if (!cleanWord) return;

      const activeSegment =
        segments[Math.max(0, audioState.activeSegmentIndex)] || null;
      const sentenceIndex = activeSegment?.index ?? 0;
      const sourceId = buildSourceId(sentenceIndex);
      const kind: "word" | "phrase" = cleanWord.includes(" ")
        ? "phrase"
        : "word";
      const key = `${kind}:${cleanWord}`;

      setLookupItems((prev) => {
        const idx = prev.findIndex((item) => item.key === key);
        if (idx >= 0) {
          const next = [...prev];
          const target = next[idx];
          next[idx] = {
            ...target,
            sentence: sentence || target.sentence,
            sentenceIndex,
            sourceId,
            count: target.count + 1,
          };
          return next;
        }
        return [
          {
            key,
            kind,
            text: cleanWord,
            sentence: sentence || "",
            sentenceIndex,
            sourceId,
            count: 1,
          },
          ...prev,
        ];
      });

      hookHandleWordClick(cleanWord, sentence, undefined, {
        sourceType: sourceType === "podcast" ? "podcast" : "audiobook",
        sourceId,
      });
    },
    [
      hookHandleWordClick,
      sourceType,
      segments,
      audioState.activeSegmentIndex,
      buildSourceId,
    ],
  );

  const jumpToSentence = useCallback(
    (sentenceIndex: number) => {
      setLastJumpPosition({
        time: audioState.currentTime || 0,
        segmentIndex: Math.max(0, audioState.activeSegmentIndex),
      });
      audioActions.seekToSegment(Math.max(0, sentenceIndex));
      setShowStudySidebarMobile(false);
    },
    [audioActions, audioState.currentTime, audioState.activeSegmentIndex],
  );

  const returnToLastJumpPosition = useCallback(() => {
    if (!lastJumpPosition) return;
    if (lastJumpPosition.time > 0) {
      audioActions.seekTo(lastJumpPosition.time);
    } else {
      audioActions.seekToSegment(Math.max(0, lastJumpPosition.segmentIndex));
    }
    setLastJumpPosition(null);
    setShowStudySidebarMobile(false);
  }, [audioActions, lastJumpPosition]);

  const handlePlaybackRateChange = useCallback(
    (rate: number) => {
      audioActions.setPlaybackRate(rate);
      if (sourceType === "podcast") {
        updateSetting("podcastSpeed", rate);
      }
    },
    [audioActions, sourceType, updateSetting],
  );

  useEffect(() => {
    if (sourceType !== "podcast" || !bundle?.id) return;
    if (initialSeekAppliedRef.current === bundle.id) return;
    if (!audioState.duration || audioState.duration <= 0) return;

    const isFinished = Boolean(bundle.metadata?.is_finished);
    const currentPosition = Number(bundle.metadata?.current_position || 0);

    if (
      !isFinished &&
      currentPosition > 1 &&
      currentPosition < audioState.duration - 1
    ) {
      audioActions.seekTo(currentPosition);
      podcastCurrentTimeRef.current = currentPosition;
      podcastLastPositionRef.current = currentPosition;
    }

    initialSeekAppliedRef.current = bundle.id;
  }, [audioActions, audioState.duration, bundle, sourceType]);

  useEffect(() => {
    const episodeId = Number(bundle?.metadata?.episode_id || 0);
    if (sourceType !== "podcast" || !episodeId || !audioState.isPlaying) {
      return;
    }

    const timer = window.setInterval(() => {
      const position = podcastCurrentTimeRef.current || 0;
      if (position <= 0) return;

      void savePositionLocal(
        episodeId,
        position,
        audioState.playbackRate,
        false,
      )
        .then((localPos) => {
          if (!localPos) return;
          void podcastApi.syncPosition(episodeId, {
            position: localPos.position,
            timestamp: localPos.timestamp,
            deviceId: localPos.deviceId,
            deviceType: localPos.deviceType,
            playbackRate: localPos.playbackRate,
            isFinished: false,
            duration: Math.round(audioState.duration || 0),
          });
        })
        .catch((error: unknown) => {
          console.warn("[UnifiedPlayer] Position sync failed:", error);
        });
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    sourceType,
    bundle?.metadata?.episode_id,
    audioState.isPlaying,
    audioState.playbackRate,
    audioState.duration,
  ]);

  useEffect(() => {
    const episodeId = Number(bundle?.metadata?.episode_id || 0);
    if (sourceType !== "podcast" || !episodeId) {
      prevIsPlayingRef.current = audioState.isPlaying;
      return;
    }

    const justPaused = prevIsPlayingRef.current && !audioState.isPlaying;
    prevIsPlayingRef.current = audioState.isPlaying;
    if (!justPaused) return;

    const position = podcastCurrentTimeRef.current || 0;
    if (position <= 0) return;

    void savePositionLocal(episodeId, position, audioState.playbackRate, false)
      .then(async (localPos) => {
        if (!localPos) return;
        const payload = {
          position: localPos.position,
          timestamp: localPos.timestamp,
          deviceId: localPos.deviceId,
          deviceType: localPos.deviceType,
          playbackRate: localPos.playbackRate,
          isFinished: false,
          duration: Math.round(audioState.duration || 0),
        };
        await podcastApi.syncPosition(episodeId, payload);
      })
      .catch((error: unknown) => {
        console.warn("[UnifiedPlayer] Pause sync failed:", error);
      });
  }, [
    sourceType,
    bundle?.metadata?.episode_id,
    audioState.isPlaying,
    audioState.playbackRate,
    audioState.duration,
  ]);

  const finalizePodcastSession = useCallback(
    async (isFinished: boolean) => {
      if (sourceType !== "podcast") return;

      const sessionId = podcastSessionIdRef.current;
      if (!sessionId) return;

      const listened = Math.floor(podcastListenedSecondsRef.current);
      const position = podcastCurrentTimeRef.current || 0;

      podcastSessionIdRef.current = null;
      setPodcastSessionId(null);
      podcastLastPositionRef.current = 0;

      try {
        await podcastApi.endListeningSession(
          sessionId,
          listened,
          position,
          isFinished,
        );
      } catch (error) {
        console.warn("[UnifiedPlayer] Failed to end podcast session:", error);
      }
    },
    [sourceType],
  );

  useEffect(() => {
    podcastCurrentTimeRef.current = audioState.currentTime || 0;
  }, [audioState.currentTime]);

  useEffect(() => {
    if (sourceType !== "podcast" || !bundle?.metadata?.episode_id) {
      return;
    }

    if (!audioState.isPlaying) {
      const currentPosition = podcastCurrentTimeRef.current || 0;
      const delta = Math.max(
        0,
        currentPosition - podcastLastPositionRef.current,
      );
      if (delta > 0) {
        podcastListenedSecondsRef.current += delta;
        podcastLastPositionRef.current = currentPosition;

        const sessionId = podcastSessionIdRef.current;
        if (sessionId) {
          void podcastApi
            .updateListeningSession(
              sessionId,
              Math.floor(podcastListenedSecondsRef.current),
              podcastCurrentTimeRef.current || 0,
            )
            .catch((error: unknown) => {
              console.warn("[UnifiedPlayer] Failed to flush session:", error);
            });
        }
      }
      return;
    }

    if (podcastFinalizedRef.current) return;

    const canStartTracking =
      audioState.isPlaying || (podcastCurrentTimeRef.current || 0) > 0;

    if (!canStartTracking) return;

    if (!podcastSessionIdRef.current) {
      void podcastApi
        .startListeningSession(
          bundle.metadata.episode_id as number,
          "intensive",
        )
        .then((res: { session_id: number }) => {
          podcastSessionIdRef.current = res.session_id;
          setPodcastSessionId(res.session_id);
          podcastLastPositionRef.current = podcastCurrentTimeRef.current || 0;
        })
        .catch((error: unknown) => {
          console.warn(
            "[UnifiedPlayer] Failed to start podcast session:",
            error,
          );
        });
    }
  }, [
    sourceType,
    bundle?.metadata?.episode_id,
    audioState.isPlaying,
    audioState.currentTime,
  ]);

  useEffect(() => {
    if (sourceType !== "podcast" || !bundle?.metadata?.episode_id) {
      return;
    }

    if (!podcastSessionId) {
      return;
    }

    const timer = window.setInterval(() => {
      const currentPosition = podcastCurrentTimeRef.current || 0;
      const delta = Math.max(
        0,
        currentPosition - podcastLastPositionRef.current,
      );
      if (delta > 0) {
        podcastListenedSecondsRef.current += delta;
      }
      podcastLastPositionRef.current = currentPosition;

      void podcastApi
        .updateListeningSession(
          podcastSessionId,
          Math.floor(podcastListenedSecondsRef.current),
          currentPosition,
        )
        .catch((error: unknown) => {
          console.warn("[UnifiedPlayer] Failed to update session:", error);
        });
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [sourceType, bundle?.metadata?.episode_id, podcastSessionId]);

  useEffect(() => {
    if (sourceType !== "podcast" || !bundle?.metadata?.episode_id) {
      return;
    }

    const duration =
      audioState.duration || Number(bundle.metadata?.duration_seconds || 0);
    const reachedEnd =
      duration > 0 &&
      audioState.currentTime >= duration - 0.5 &&
      !audioState.isPlaying;

    if (reachedEnd && !podcastFinalizedRef.current) {
      podcastFinalizedRef.current = true;
      void finalizePodcastSession(true);
    }
  }, [
    sourceType,
    bundle?.metadata?.episode_id,
    bundle?.metadata?.duration_seconds,
    audioState.currentTime,
    audioState.duration,
    audioState.isPlaying,
    finalizePodcastSession,
  ]);

  useEffect(() => {
    podcastSessionIdRef.current = null;
    setPodcastSessionId(null);
    podcastListenedSecondsRef.current = 0;
    podcastLastPositionRef.current = 0;
    podcastFinalizedRef.current = false;
    initialSeekAppliedRef.current = null;
  }, [sourceType, bundle?.id]);

  useEffect(() => {
    if (sourceType !== "podcast") return;

    const handleBeforeUnload = () => {
      const sessionId = podcastSessionIdRef.current;
      if (!sessionId) return;

      const data = JSON.stringify({
        session_id: sessionId,
        listened_seconds: Math.floor(podcastListenedSecondsRef.current),
        position_seconds: podcastCurrentTimeRef.current || 0,
        is_finished: false,
      });
      navigator.sendBeacon("/api/podcast/session/update-beacon", data);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [
    sourceType,
    bundle?.metadata?.episode_id,
    audioState.duration,
    audioState.playbackRate,
  ]);

  useEffect(() => {
    return () => {
      if (sourceType !== "podcast") return;
      if (podcastFinalizedRef.current) return;
      void finalizePodcastSession(false);
    };
  }, [sourceType, bundle?.id, finalizePodcastSession]);

  useEffect(() => {
    lastCollocationBucketRef.current = null;
  }, [bundle?.id]);

  // Continuously load collocations around current playback position.
  // This ensures later subtitles are recognized, not only the first screen.
  useEffect(() => {
    if (!segments.length) return;

    const activeIndex = Math.max(0, audioState.activeSegmentIndex);
    const bucketSize = 8;
    const currentBucket = Math.floor(activeIndex / bucketSize);

    // Avoid reloading on every single subtitle tick.
    if (lastCollocationBucketRef.current === currentBucket) return;
    lastCollocationBucketRef.current = currentBucket;

    const start = Math.max(0, currentBucket * bucketSize - 8);
    const end = Math.min(
      segments.length,
      (currentBucket + 1) * bucketSize + 40,
    );

    const sentences = segments
      .slice(start, end)
      .flatMap((segment) =>
        segment.sentences.length > 0 ? segment.sentences : [segment.text],
      )
      .filter((sentence) => Boolean(sentence && sentence.trim()));

    const uniqueSentences = Array.from(new Set(sentences));

    if (uniqueSentences.length > 0) {
      void loadCollocations(uniqueSentences);
    }
  }, [segments, audioState.activeSegmentIndex, loadCollocations]);

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
      highlightSet: new Set<string>(),
      studyWordSet: new Set<string>(),
      studyPhraseSet: new Set<string>(),
      knownWords: new Set<string>(),
      showHighlights: true,
      getCollocations: (sentence: string): Collocation[] =>
        filterCollocationsByLevel(
          (getCollocations(sentence) ?? []).map((item) => ({
            reasoning: item.reasoning,
            text: item.text,
            key_word: item.key_word ?? "",
            start_word_idx: item.start_word_idx,
            end_word_idx: item.end_word_idx,
            difficulty: item.difficulty,
            confidence: item.confidence,
          })),
          settings.collocationDisplayLevel || "core",
        ),
      onWordClick: handleWordClick,
      // Pass player state/actions/segments
      segments,
      bookmarkedSentenceKeys: new Set(bookmarkedSentences.map((s) => s.key)),
      getSentenceKey,
      onToggleSentenceBookmark: handleToggleSentenceBookmark,
      state: audioState,
      actions: {
        ...audioActions,
        setPlaybackRate: handlePlaybackRateChange,
      },
    };
  }, [
    bundle,
    getCollocations,
    settings.collocationDisplayLevel,
    handleWordClick,
    segments,
    bookmarkedSentences,
    getSentenceKey,
    handleToggleSentenceBookmark,
    audioState,
    audioActions,
    handlePlaybackRateChange,
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
    <div className="h-dvh min-h-screen bg-[#0a0f0d] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 sticky top-0 z-20 bg-[#0a0f0d]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center gap-2.5 sm:gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-white/[0.03] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all group"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>

            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-medium text-white truncate">
                {bundle?.title || "Audio Player"}
              </h1>
              {bundle?.metadata?.feed_title && (
                <p className="text-[11px] sm:text-xs text-white/40 truncate">
                  {bundle.metadata.feed_title}
                </p>
              )}
            </div>

            <div className="hidden sm:block text-xs font-mono text-white/40 uppercase tracking-wider px-2 py-1 bg-white/5 rounded border border-white/10">
              {sourceType === "podcast" ? "Intensive Listening" : "Audiobook"}
            </div>

            <button
              onClick={() => setShowStudySidebarMobile((prev) => !prev)}
              className="md:hidden h-9 px-2 rounded-lg border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Open lookup and sentence list"
            >
              <ListChecks className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-3 sm:px-4 pb-2 sm:pb-3 flex items-center justify-end">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/45">
            <span>Collocations</span>
            <CollocationDifficultySwitch compact />
          </div>
        </div>
      </header>

      {/* Content with optional sidebar */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Main content */}
        <main className="flex-1 flex flex-col min-h-0">
          {rendererProps && <AudioPlayerUI {...rendererProps} />}
        </main>

        <aside className="hidden lg:flex w-80 border-l border-white/10 bg-bg-surface/80 backdrop-blur-xl flex-col shrink-0">
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <div className="text-xs uppercase tracking-widest text-white/60 font-mono">
              Study Basket
            </div>
            <button
              onClick={addAllToReviewQueue}
              disabled={isAddingToReview}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-accent-primary/40 bg-accent-primary/15 text-accent-primary text-[11px] disabled:opacity-60"
            >
              <Plus className="w-3 h-3" />
              {isAddingToReview ? "Adding..." : "Add All to Review"}
            </button>
          </div>

          <div className="p-3 overflow-y-auto space-y-4">
            <div className="text-[11px] text-white/45 leading-relaxed">
              Batch add collected lookups and bookmarked sentences to your
              review queue.
            </div>
            {lastJumpPosition && (
              <button
                onClick={returnToLastJumpPosition}
                className="w-full px-2 py-1.5 rounded border border-white/15 bg-white/5 text-xs text-white/75 hover:bg-white/10"
              >
                Back to Previous Position
              </button>
            )}

            <section>
              <div className="text-[11px] text-white/50 uppercase tracking-wider mb-2">
                Lookups ({lookupItems.length})
              </div>
              <div className="space-y-2">
                {lookupItems.map((item) => (
                  <div
                    key={item.key}
                    onClick={() => jumpToSentence(item.sentenceIndex)}
                    className="rounded-lg border border-white/10 bg-white/5 p-2 cursor-pointer hover:border-accent-primary/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-white font-medium truncate">
                        {item.text}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeLookupItem(item.key);
                        }}
                        className="text-white/40 hover:text-red-300"
                        title="Remove lookup"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-[10px] text-white/40 mt-1 line-clamp-2">
                      {item.sentence || "(No context sentence)"}
                    </div>
                  </div>
                ))}
                {lookupItems.length === 0 && (
                  <div className="text-xs text-white/35">
                    Click words/collocations in active subtitle lines.
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="text-[11px] text-white/50 uppercase tracking-wider mb-2">
                Saved Sentences ({bookmarkedSentences.length})
              </div>
              <div className="space-y-2">
                {bookmarkedSentences.map((item) => (
                  <div
                    key={item.key}
                    onClick={() => jumpToSentence(item.sentenceIndex)}
                    className="rounded-lg border border-white/10 bg-white/5 p-2 cursor-pointer hover:border-accent-primary/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-white/85 leading-snug">
                        {item.sentence}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBookmarkedSentence(item.key);
                        }}
                        className="text-white/40 hover:text-red-300 mt-0.5"
                        title="Remove sentence"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {bookmarkedSentences.length === 0 && (
                  <div className="text-xs text-white/35">
                    Bookmark useful subtitle sentences first.
                  </div>
                )}
              </div>
            </section>
          </div>
        </aside>

        {showStudySidebarMobile && (
          <button
            onClick={() => setShowStudySidebarMobile(false)}
            className="lg:hidden absolute inset-0 z-20 bg-black/55"
            aria-label="Close study basket"
          />
        )}

        <aside
          className={`lg:hidden absolute right-0 top-0 bottom-0 z-30 w-[88%] max-w-sm border-l border-white/10 bg-bg-surface/95 backdrop-blur-xl transition-transform ${
            showStudySidebarMobile ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <div className="text-xs uppercase tracking-widest text-white/60 font-mono">
              Study Basket
            </div>
            <button
              onClick={() => setShowStudySidebarMobile(false)}
              className="text-white/60 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3 space-y-3">
            <button
              onClick={addAllToReviewQueue}
              disabled={isAddingToReview}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded border border-accent-primary/40 bg-accent-primary/15 text-accent-primary text-xs disabled:opacity-60"
            >
              <Plus className="w-3.5 h-3.5" />
              {isAddingToReview ? "Adding..." : "Add All to Review"}
            </button>
            <div className="text-xs text-white/45">
              Lookups: {lookupItems.length} | Sentences:{" "}
              {bookmarkedSentences.length}
            </div>
            <div className="text-[11px] text-white/45 leading-relaxed">
              Batch add collected lookups and bookmarked sentences to your
              review queue.
            </div>
            {lastJumpPosition && (
              <button
                onClick={returnToLastJumpPosition}
                className="w-full px-2 py-1.5 rounded border border-white/15 bg-white/5 text-xs text-white/75 hover:bg-white/10"
              >
                Back to Previous Position
              </button>
            )}

            <section className="space-y-2 max-h-[34vh] overflow-y-auto pr-1">
              <div className="text-[11px] text-white/50 uppercase tracking-wider">
                Lookups
              </div>
              {lookupItems.map((item) => (
                <div
                  key={item.key}
                  onClick={() => jumpToSentence(item.sentenceIndex)}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 cursor-pointer hover:border-accent-primary/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-white font-medium truncate">
                      {item.text}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLookupItem(item.key);
                      }}
                      className="text-white/40 hover:text-red-300"
                      title="Remove lookup"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-[10px] text-white/40 mt-1 line-clamp-2">
                    {item.sentence || "(No context sentence)"}
                  </div>
                </div>
              ))}
              {lookupItems.length === 0 && (
                <div className="text-xs text-white/35">
                  Click words/collocations in active subtitle lines.
                </div>
              )}
            </section>

            <section className="space-y-2 max-h-[34vh] overflow-y-auto pr-1">
              <div className="text-[11px] text-white/50 uppercase tracking-wider">
                Saved Sentences
              </div>
              {bookmarkedSentences.map((item) => (
                <div
                  key={item.key}
                  onClick={() => jumpToSentence(item.sentenceIndex)}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 cursor-pointer hover:border-accent-primary/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-white/85 leading-snug">
                      {item.sentence}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeBookmarkedSentence(item.key);
                      }}
                      className="text-white/40 hover:text-red-300 mt-0.5"
                      title="Remove sentence"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {bookmarkedSentences.length === 0 && (
                <div className="text-xs text-white/35">
                  Bookmark useful subtitle sentences first.
                </div>
              )}
            </section>
          </div>
        </aside>

        {selectedWord && (
          <button
            onClick={closeInspector}
            className="md:hidden absolute inset-0 z-20 bg-black/45"
            aria-label="Close word inspector"
          />
        )}

        {/* Word Inspector Sidebar */}
        {selectedWord && (
          <div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-white/10 overflow-y-auto bg-bg-surface shrink-0 absolute inset-x-0 bottom-0 top-20 md:inset-y-0 md:right-0 md:left-auto z-30 shadow-2xl rounded-t-2xl md:rounded-none">
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
