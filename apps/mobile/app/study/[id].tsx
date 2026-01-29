import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useSentenceStudy, useWordExplainer } from "@nce/shared";
import {
  ChevronLeft,
  Play,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  X,
} from "lucide-react-native";
import { DictionaryModal } from "../../src/components/DictionaryModal";
import { useState } from "react";

// --- Sub-Views ---

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
}: any) => {
  return (
    <View className="flex-1 p-6 justify-center">
      {/* Progress */}
      <View className="absolute top-0 left-0 right-0 h-1 bg-bg-elevated">
        <View
          className="h-full bg-accent-primary"
          style={{ width: `${(index / total) * 100}%` }}
        />
      </View>

      <Text className="text-text-muted text-xs font-mono mb-8 text-center mt-6">
        Sentence {index + 1} / {total}
      </Text>

      {/* Card */}
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

      {/* Simplification / Explanation */}
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

      {/* Controls */}
      <View className="flex-row gap-4 mt-8">
        {isSimplifying || simplifiedText ? (
          <>
            <TouchableOpacity
              className="flex-1 bg-bg-elevated py-4 rounded-2xl items-center border border-border-default"
              onPress={() => onUnclearResponse(false)} // Still Unclear
            >
              <Text className="text-text-primary font-bold">Still Unclear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-accent-primary/10 py-4 rounded-2xl items-center border border-accent-primary/30"
              onPress={() => onUnclearResponse(true)} // Got it
            >
              <Text className="text-accent-primary font-bold">Got It!</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              className="flex-1 bg-bg-elevated py-4 rounded-2xl items-center border border-border-default flex-row justify-center"
              onPress={() => onUnclear()}
            >
              <HelpCircle size={20} color="#E0E0E0" className="mr-2" />
              <Text className="text-text-primary font-bold">Unclear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-accent-primary/10 py-4 rounded-2xl items-center border border-accent-primary/30 flex-row justify-center"
              onPress={() => onClear()}
            >
              <CheckCircle size={20} color="#00FF94" className="mr-2" />
              <Text className="text-accent-primary font-bold">Clear</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

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

export default function StudyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const sourceId = decodeURIComponent(id as string);

  const {
    view,
    overview,
    currentSentence,
    currentIndex,
    totalSentences,
    isSimplifying,
    simplifiedText,
    simplifyStage,
    startStudying,
    handleWordClick,
    handleClear,
    handleSimplify,
    handleUnclearResponse,
    explainer,
    studyHighlights,
  } = useSentenceStudy(sourceId);

  const [modalVisible, setModalVisible] = useState(false);

  const onWordClickWrapper = (word: string) => {
    handleWordClick(word);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    explainer.closeInspector();
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-base" edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="h-14 flex-row items-center px-4 border-b border-border-default bg-bg-surface">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft color="#E0E0E0" size={24} />
        </TouchableOpacity>
        <Text className="text-text-primary font-bold ml-2 text-sm">
          Sentence Study
        </Text>
      </View>

      {/* Content */}
      <View className="flex-1">
        {view === "LOADING" && (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator color="#00FF94" size="large" />
          </View>
        )}

        {view === "OVERVIEW" && (
          <OverviewView data={overview} onStart={startStudying} />
        )}

        {view === "STUDYING" && (
          <StudyingView
            sentence={currentSentence}
            index={currentIndex}
            total={totalSentences}
            onWordClick={onWordClickWrapper}
            onClear={handleClear}
            onUnclear={() => handleSimplify()}
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

      {/* Dictionary Modal */}
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
