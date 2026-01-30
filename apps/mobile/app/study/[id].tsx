import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useLocalSearchParams,
  useRouter,
  usePathname,
  Stack,
} from "expo-router";
import { useSentenceStudy, useWordExplainer } from "@nce/shared";
import {
  ChevronLeft,
  Play,
  CheckCircle,
  HelpCircle,
} from "lucide-react-native";
import { DictionaryModal } from "../../src/components/DictionaryModal";
import { useState, useRef, useCallback, useEffect } from "react";
import EventSource from "react-native-sse";
import { getApiBaseUrl } from "../../src/lib/platform-init";

const OverviewView = ({ data, onStart }: any) => (
  <View className="flex-1 p-6">
    <Text className="text-2xl font-serif font-bold text-text-primary mb-4">
      Overview
    </Text>
    <ScrollView className="flex-1 mb-6 bg-bg-surface p-4 rounded-xl border border-border-default">
      <Text className="text-text-secondary leading-relaxed text-base font-serif">
        {data.overview || data.overviewStream}
      </Text>
    </ScrollView>
    <TouchableOpacity
      className="bg-accent-primary py-4 rounded-full flex-row items-center justify-center"
      onPress={onStart}
    >
      <Play size={20} color="#050505" fill="#050505" />
      <Text className="text-bg-base font-bold ml-2 text-lg">
        START STUDYING
      </Text>
    </TouchableOpacity>
  </View>
);

const StudyingView = ({
  sentence,
  index,
  total,
  onWordClick,
  onClear,
  onUnclear,
  isSimplifying,
  simplifiedText,
  simplifyStage,
  onUnclearResponse,
}: any) => (
  <View className="flex-1 p-6 justify-center">
    <View className="absolute top-0 left-0 right-0 h-1 bg-bg-elevated">
      <View
        className="h-full bg-accent-primary"
        style={{ width: `${(index / total) * 100}%` }}
      />
    </View>

    <Text className="text-text-muted text-xs font-mono mb-8 text-center mt-6">
      Sentence {index + 1} / {total}
    </Text>

    <View className="bg-bg-surface p-8 rounded-2xl border border-border-default min-h-[200px] justify-center">
      <Text className="text-xl font-serif leading-relaxed text-text-primary">
        {sentence?.text?.split(" ").map((word: string, i: number) => (
          <Text
            key={i}
            onPress={() => onWordClick(word)}
            className="active:text-accent-primary active:bg-accent-primary/10"
          >
            {word}{" "}
          </Text>
        ))}
      </Text>
    </View>

    {(isSimplifying || simplifiedText) && (
      <View className="mt-6 bg-bg-elevated p-4 rounded-xl border border-border-default animate-in fade-in">
        <View className="flex-row items-center mb-2">
          <HelpCircle size={16} color="#F59E0B" />
          <Text className="text-accent-warning font-bold ml-2 uppercase text-xs">
            AI Guidance (Stage {simplifyStage}/4)
          </Text>
        </View>
        {isSimplifying && !simplifiedText ? (
          <ActivityIndicator color="#F59E0B" />
        ) : (
          <Text className="text-text-secondary leading-relaxed font-sans text-sm">
            {simplifiedText}
          </Text>
        )}
      </View>
    )}

    <View className="flex-row gap-4 mt-8">
      {isSimplifying || simplifiedText ? (
        <>
          <TouchableOpacity
            className="flex-1 bg-bg-elevated py-4 rounded-2xl items-center border border-border-default"
            onPress={() => onUnclearResponse(false)}
          >
            <Text className="text-text-primary font-bold">Still Unclear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-accent-primary/10 py-4 rounded-2xl items-center border border-accent-primary/30"
            onPress={() => onUnclearResponse(true)}
          >
            <Text className="text-accent-primary font-bold">Got It!</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TouchableOpacity
            className="flex-1 bg-bg-elevated py-4 rounded-2xl items-center border border-border-default flex-row justify-center"
            onPress={onUnclear}
          >
            <HelpCircle size={20} color="#E0E0E0" className="mr-2" />
            <Text className="text-text-primary font-bold">Unclear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-accent-primary/10 py-4 rounded-2xl items-center border border-accent-primary/30 flex-row justify-center"
            onPress={onClear}
          >
            <CheckCircle size={20} color="#00FF94" className="mr-2" />
            <Text className="text-accent-primary font-bold">Clear</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  </View>
);

const CompletedView = ({ stats, onFinish }: any) => (
  <View className="flex-1 p-6 items-center justify-center">
    <CheckCircle size={64} color="#00FF94" />
    <Text className="text-2xl font-serif font-bold text-text-primary mt-6 mb-2">
      Session Complete!
    </Text>

    <View className="flex-row gap-4 mt-8 w-full">
      <View className="flex-1 bg-bg-surface p-4 rounded-xl items-center border border-border-default">
        <Text className="text-3xl font-mono font-bold text-accent-primary">
          {stats?.clear_count || 0}
        </Text>
        <Text className="text-text-muted text-xs uppercase mt-1">Clear</Text>
      </View>
      <View className="flex-1 bg-bg-surface p-4 rounded-xl items-center border border-border-default">
        <Text className="text-3xl font-mono font-bold text-accent-warning">
          {stats?.unclear_count || 0}
        </Text>
        <Text className="text-text-muted text-xs uppercase mt-1">Unclear</Text>
      </View>
    </View>

    <TouchableOpacity
      className="bg-bg-elevated w-full py-4 rounded-full mt-12 items-center border border-border-default"
      onPress={onFinish}
    >
      <Text className="text-text-primary font-bold">Return to Library</Text>
    </TouchableOpacity>
  </View>
);

function useStreamingSimplify() {
  const [simplifiedText, setSimplifiedText] = useState("");
  const [simplifyStage, setSimplifyStage] = useState(1);
  const [isSimplifying, setIsSimplifying] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const simplifiedTextRef = useRef("");

  const simplify = useCallback(
    async (
      params: {
        sentence: string;
        simplify_type: string;
        stage: number;
        prev_sentence?: string;
        next_sentence?: string;
      },
      onUpdate: (text: string, stage: number, done: boolean) => void,
    ) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.removeAllEventListeners();
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      setIsSimplifying(true);
      simplifiedTextRef.current = "";
      setSimplifiedText("");
      setSimplifyStage(params.stage);

      const url = `${getApiBaseUrl()}/api/sentence-study/simplify`;
      console.log("[streaming-simplify] Creating SSE for:", url);

      const es = new EventSource(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(params),
        pollingInterval: 0,
      });

      eventSourceRef.current = es;

      es.addEventListener("open", () => {
        console.log("[streaming-simplify] Connection opened");
      });

      es.addEventListener("message", (event) => {
        const data = event.data;
        if (!data) return;

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "chunk") {
            console.log(
              "[streaming-simplify] Received chunk:",
              parsed.content?.substring(0, 50),
            );
            const newText = (simplifiedTextRef.current || "") + parsed.content;
            simplifiedTextRef.current = newText;
            setSimplifiedText(newText);
            onUpdate(newText, params.stage, false);
          } else if (parsed.type === "done") {
            console.log("[streaming-simplify] Done, stage:", parsed.stage);
            const finalStage = parsed.stage || params.stage;
            setSimplifyStage(finalStage);
            setIsSimplifying(false);
            onUpdate(simplifiedTextRef.current || "", finalStage, true);
          }
        } catch (e) {
          console.error("[streaming-simplify] Parse error:", e);
        }
      });

      es.addEventListener("error", (event: any) => {
        console.error("[streaming-simplify] Error:", event.message);
        setIsSimplifying(false);
      });

      es.addEventListener("close" as any, () => {
        console.log("[streaming-simplify] Connection closed");
        setIsSimplifying(false);
      });
    },
    [],
  );

  const reset = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.removeAllEventListeners();
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    simplifiedTextRef.current = "";
    setSimplifiedText("");
    setSimplifyStage(1);
    setIsSimplifying(false);
  }, []);

  return {
    simplifiedText,
    simplifyStage,
    isSimplifying,
    simplify,
    reset,
  };
}

// --- Streaming Overview Hook using react-native-sse ---
function useStreamingOverview() {
  const [overviewStream, setOverviewStream] = useState("");
  const [overview, setOverview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const overviewRef = useRef("");

  const fetchOverview = useCallback(
    async (
      title: string,
      fullText: string,
      totalSentences: number,
      onUpdate: (stream: string, done: boolean) => void,
    ) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.removeAllEventListeners();
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      setIsLoading(true);
      overviewRef.current = "";
      setOverviewStream("");
      setOverview(null);

      const url = `${getApiBaseUrl()}/api/sentence-study/overview`;
      console.log("[streaming-overview] Creating SSE for:", url);

      const es = new EventSource(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          title,
          full_text: fullText,
          total_sentences: totalSentences,
        }),
        pollingInterval: 0,
      });

      eventSourceRef.current = es;

      es.addEventListener("open", () => {
        console.log("[streaming-overview] Connection opened");
      });

      es.addEventListener("message", (event) => {
        const data = event.data;
        if (!data) return;

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "chunk") {
            const newText = (overviewRef.current || "") + parsed.content;
            overviewRef.current = newText;
            setOverviewStream(newText);
            onUpdate(newText, false);
          } else if (parsed.type === "done") {
            console.log(
              "[streaming-overview] Done, overview:",
              parsed.overview?.substring(0, 50),
            );
            setOverview({ overview: parsed.overview });
            setIsLoading(false);
            onUpdate(overviewRef.current, true);
          }
        } catch (e) {
          console.error("[streaming-overview] Parse error:", e);
        }
      });

      es.addEventListener("error", (event: any) => {
        console.error("[streaming-overview] Error:", event.message);
        setIsLoading(false);
      });

      es.addEventListener("close" as any, () => {
        console.log("[streaming-overview] Connection closed");
        setIsLoading(false);
      });
    },
    [],
  );

  const reset = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.removeAllEventListeners();
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    overviewRef.current = "";
    setOverviewStream("");
    setOverview(null);
    setIsLoading(false);
  }, []);

  return {
    overviewStream,
    overview,
    isLoading,
    fetchOverview,
    reset,
  };
}

export default function StudyScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const pathname = usePathname();

  console.log("[StudyScreen] Local params:", JSON.stringify(params));
  console.log("[StudyScreen] Pathname:", pathname);

  let sourceId: string | undefined;

  if (params.id && params.id !== "undefined") {
    sourceId = decodeURIComponent(params.id);
  } else {
    const match = pathname.match(/^\/study\/(.+)$/);
    if (match && match[1]) {
      sourceId = decodeURIComponent(match[1]);
      console.log("[StudyScreen] Extracted sourceId from path:", sourceId);
    }
  }

  console.log("[StudyScreen] Final sourceId:", sourceId);

  if (!sourceId) {
    return (
      <SafeAreaView className="flex-1 bg-bg-base" edges={["top"]}>
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-accent-warning text-center mb-4">
            Missing article ID
          </Text>
          <Text className="text-text-muted text-center mb-6">
            Could not load the article. Please try again from the library.
          </Text>
          <TouchableOpacity
            className="bg-accent-primary/10 px-6 py-3 rounded-full border border-accent-primary/30"
            onPress={() => router.replace("/(tabs)/library")}
          >
            <Text className="text-accent-primary font-bold">Go to Library</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const {
    view,
    article,
    currentSentence,
    currentIndex,
    totalSentences,
    startStudying,
    handleWordClick,
    handleClear,
    explainer,
    studyHighlights,
  } = useSentenceStudy(sourceId);

  const {
    simplifiedText,
    simplifyStage,
    isSimplifying,
    simplify: streamSimplify,
    reset: resetSimplify,
  } = useStreamingSimplify();

  const {
    overviewStream,
    overview: streamingOverview,
    isLoading: isLoadingOverview,
    fetchOverview: streamOverview,
  } = useStreamingOverview();

  const [modalVisible, setModalVisible] = useState(false);

  // Fetch overview when entering OVERVIEW view
  useEffect(() => {
    if (
      view === "OVERVIEW" &&
      streamingOverview === null &&
      overviewStream === ""
    ) {
      if (article?.title && article?.full_text) {
        streamOverview(
          article.title,
          article.full_text,
          totalSentences || 0,
          (stream, done) => {
            console.log(
              "[StudyScreen] Overview stream:",
              done ? "done" : "streaming...",
            );
          },
        );
      }
    }
  }, [
    view,
    streamingOverview,
    overviewStream,
    totalSentences,
    article,
    streamOverview,
  ]);

  const onWordClickWrapper = (word: string) => {
    console.log(
      "[StudyScreen] onWordClickWrapper:",
      word,
      "sentence:",
      currentSentence?.text,
    );
    handleWordClick(word, currentSentence?.text || "");
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    explainer.closeInspector();
  };

  const handleUnclear = useCallback(() => {
    if (!currentSentence) return;

    const nextStage = simplifyStage < 4 ? simplifyStage + 1 : 4;
    console.log(
      "[StudyScreen] handleUnclear: currentStage=",
      simplifyStage,
      "nextStage=",
      nextStage,
    );

    const params = {
      sentence: currentSentence.text,
      simplify_type: "meaning",
      stage: nextStage,
      prev_sentence: null,
      next_sentence: null,
    };

    streamSimplify(params, (text, stage, done) => {
      console.log(
        "[StudyScreen] Simplify update: text.length=",
        text.length,
        "stage=",
        stage,
        "done=",
        done,
      );
    });
  }, [currentSentence, simplifyStage, streamSimplify]);

  const handleUnclearResponse = useCallback(
    async (gotIt: boolean) => {
      if (gotIt) {
        // Record learning and advance
        await handleClear();
      } else {
        // Go to next stage
        handleUnclear();
      }
    },
    [handleClear, handleUnclear],
  );

  return (
    <SafeAreaView className="flex-1 bg-bg-base" edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="h-14 flex-row items-center px-4 border-b border-border-default bg-bg-surface">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft color="#E0E0E0" size={24} />
        </TouchableOpacity>
        <Text className="text-text-primary font-bold ml-2 text-sm">
          Sentence Study
        </Text>
      </View>

      <View className="flex-1">
        {view === "LOADING" && (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator color="#00FF94" size="large" />
          </View>
        )}

        {view === "OVERVIEW" && (
          <OverviewView
            data={streamingOverview || { overviewStream }}
            onStart={startStudying}
          />
        )}

        {view === "STUDYING" && (
          <StudyingView
            sentence={currentSentence}
            index={currentIndex}
            total={totalSentences}
            onWordClick={onWordClickWrapper}
            onClear={handleClear}
            onUnclear={handleUnclear}
            isSimplifying={isSimplifying}
            simplifiedText={simplifiedText}
            simplifyStage={simplifyStage}
            onUnclearResponse={handleUnclearResponse}
          />
        )}

        {view === "COMPLETED" && (
          <CompletedView
            stats={studyHighlights}
            onFinish={() => router.replace("/(tabs)/library")}
          />
        )}
      </View>

      <DictionaryModal
        visible={modalVisible}
        onClose={handleCloseModal}
        inspectorData={explainer.inspectorData}
        contextExplanation={explainer.contextExplanation}
        isInspecting={explainer.isInspecting}
        isExplaining={explainer.isExplaining}
        selectedWord={explainer.selectedWord}
        isPhrase={explainer.isPhrase}
        explainStyle={explainer.explainStyle}
        generatedImage={explainer.generatedImage}
        isGeneratingImage={explainer.isGeneratingImage}
        imagePrompt={explainer.imagePrompt}
        onExplainStyle={explainer.changeExplainStyle}
        onGenerateImage={explainer.generateImage}
        onMarkAsKnown={explainer.closeInspector}
        onPlayAudio={() => {}}
        currentSentenceContext={""}
      />
    </SafeAreaView>
  );
}
