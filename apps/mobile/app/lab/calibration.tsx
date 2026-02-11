import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import { useProficiencyTest } from "@nce/shared";
import {
  ArrowRight,
  Brain,
  Check,
  X,
  HelpCircle,
  Zap,
  BookOpen,
  ChevronLeft,
} from "lucide-react-native";
import { useState } from "react";

// --- Sub-Views ---

const IntroView = ({ onStart }: { onStart: () => void }) => (
  <View className="flex-1 items-center justify-center p-6 bg-bg-base">
    <View className="w-24 h-24 bg-accent-primary/10 rounded-full items-center justify-center mb-8 border border-accent-primary/20">
      <Brain size={48} color="#00FF94" />
    </View>
    <Text className="text-3xl font-serif font-bold text-text-primary mb-4 text-center">
      Calibration Mission
    </Text>
    <Text className="text-text-secondary text-center leading-relaxed mb-12 px-4">
      We need to calibrate your neural interface. Read 5 sentences. Tell us if
      they are <Text className="text-accent-primary font-bold">Clear</Text> or{" "}
      <Text className="text-accent-danger font-bold">Confusing</Text>.
    </Text>
    <TouchableOpacity
      className="bg-accent-primary w-full py-4 rounded-full flex-row items-center justify-center"
      onPress={onStart}
    >
      <Text className="text-bg-base font-bold text-lg mr-2">
        START SEQUENCE
      </Text>
      <ArrowRight size={20} color="#050505" />
    </TouchableOpacity>
  </View>
);

const ReadingView = ({ sentence, index, total, onResult, onInspect }: any) => (
  <View className="flex-1 bg-bg-base">
    {/* Progress */}
    <View className="h-1 bg-bg-elevated w-full">
      <View
        className="h-full bg-accent-primary"
        style={{ width: `${((index + 1) / total) * 100}%` }}
      />
    </View>

    <View className="flex-1 p-6 justify-center items-center">
      <Text className="text-text-muted text-xs font-mono uppercase tracking-widest mb-12">
        Sentence {index + 1} / {total}
      </Text>

      {/* Interactive Sentence (Simplified: Click whole sentence or words?) 
          Mobile typically prefers word clicking, but here let's just show text.
          Ideally we wrap words for inspection tracking.
      */}
      <View className="mb-16">
        <Text className="text-2xl md:text-3xl font-serif leading-relaxed text-center text-text-primary">
          {sentence.split(" ").map((word: string, i: number) => (
            <Text
              key={i}
              onPress={() => onInspect(word)}
              className="active:text-accent-primary"
            >
              {word}{" "}
            </Text>
          ))}
        </Text>
        <Text className="text-text-muted text-xs text-center mt-4 font-mono opacity-50">
          (Tap words you don't know)
        </Text>
      </View>

      {/* Actions */}
      <View className="flex-row gap-4 w-full">
        <TouchableOpacity
          className="flex-1 py-6 bg-bg-surface border border-border-default rounded-xl items-center justify-center active:bg-accent-danger/10 active:border-accent-danger"
          onPress={() => onResult("confused")}
        >
          <X size={24} color="#FF4444" className="mb-2" />
          <Text className="text-accent-danger text-xs font-bold uppercase">
            Confusing
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 py-6 bg-bg-surface border border-border-default rounded-xl items-center justify-center active:bg-accent-warning/10 active:border-accent-warning"
          onPress={() => onResult("partial")}
        >
          <HelpCircle size={24} color="#FFB800" className="mb-2" />
          <Text className="text-accent-warning text-xs font-bold uppercase">
            Somewhat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 py-6 bg-bg-surface border border-border-default rounded-xl items-center justify-center active:bg-accent-primary/10 active:border-accent-primary"
          onPress={() => onResult("clear")}
        >
          <Check size={24} color="#00FF94" className="mb-2" />
          <Text className="text-accent-primary text-xs font-bold uppercase">
            Clear
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

const LevelingView = ({ level }: { level: number }) => (
  <View className="flex-1 items-center justify-center bg-bg-base">
    <View className="relative mb-8 items-center justify-center">
      <View className="w-24 h-24 border-4 border-accent-primary/30 rounded-full absolute animate-ping" />
      <Zap size={48} color="#00FF94" />
    </View>
    <Text className="text-2xl font-serif font-bold text-text-primary mb-2">
      Adjusting Difficulty
    </Text>
    <Text className="font-mono text-sm text-text-secondary">
      Calibrating to Level {level + 1}...
    </Text>
  </View>
);

const ProcessingView = () => (
  <View className="flex-1 items-center justify-center bg-bg-base">
    <ActivityIndicator size="large" color="#00FF94" className="mb-6" />
    <Text className="font-mono text-xs uppercase tracking-widest text-text-muted">
      Analyzing Neural Patterns...
    </Text>
  </View>
);

const CompleteView = ({
  level,
  diagnosis,
  onApply,
  onHome,
}: {
  level: number;
  diagnosis: any;
  onApply: () => void;
  onHome: () => void;
}) => {
  const bandRanges = [
    [0, 1000],
    [1000, 2000],
    [2000, 3000],
    [3000, 4000],
    [4000, 5000],
    [5000, 6000],
    [6000, 8000],
    [8000, 10000],
    [10000, 12500],
    [12500, 15000],
    [15000, 17500],
    [17500, 20000],
  ];
  const suggestedBand = bandRanges[Math.min(level, bandRanges.length - 1)][0];

  return (
    <ScrollView className="flex-1 bg-bg-base p-6">
      <View className="items-center py-12">
        <Text className="text-3xl font-serif font-bold text-accent-primary mb-2">
          Calibration Complete
        </Text>
        <Text className="text-text-secondary font-mono text-sm">
          Your Level: {level} / 11
        </Text>
      </View>

      <View className="bg-accent-primary/5 border border-accent-primary/30 p-6 rounded-xl mb-8 items-center">
        <Text className="text-text-secondary text-sm mb-2">
          Suggested focus for Reading Mode:
        </Text>
        <Text className="text-3xl font-mono font-bold text-accent-primary">
          COCA {suggestedBand}+
        </Text>
      </View>

      <View className="bg-bg-elevated border border-border-default p-6 rounded-xl mb-8 space-y-6">
        <View>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-bold uppercase tracking-wider text-text-primary">
              Vocabulary
            </Text>
            <Text className="text-accent-primary font-mono text-xl">
              {diagnosis?.words_mastered || 0}
            </Text>
          </View>
          <View className="h-2 bg-bg-surface rounded-full overflow-hidden">
            <View
              className="h-full bg-accent-primary"
              style={{ width: `${(level / 11) * 100}%` }}
            />
          </View>
          <Text className="text-text-muted text-xs mt-2">
            Words marked as Mastered from this session.
          </Text>
        </View>

        <View className="h-[1px] bg-border-subtle" />

        <View>
          <Text className="text-sm font-bold uppercase tracking-wider text-text-primary mb-4">
            Syntax Diagnosis
          </Text>
          {diagnosis?.syntax_diagnosis?.weaknesses ? (
            <View>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {diagnosis.syntax_diagnosis.weaknesses.map(
                  (w: string, i: number) => (
                    <View
                      key={i}
                      className="px-2 py-1 bg-accent-danger/10 border border-accent-danger/30 rounded"
                    >
                      <Text className="text-accent-danger text-xs font-mono uppercase">
                        {w}
                      </Text>
                    </View>
                  ),
                )}
              </View>
              <Text className="text-text-muted text-sm italic border-l-2 border-accent-danger pl-4">
                "{diagnosis.syntax_diagnosis.advice}"
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center">
              <Check size={16} color="#00FF94" />
              <Text className="text-text-secondary text-sm ml-2">
                No significant syntax gaps detected.
              </Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        className="bg-accent-primary w-full py-4 rounded-full flex-row items-center justify-center mb-4"
        onPress={onApply}
      >
        <BookOpen size={20} color="#050505" />
        <Text className="text-bg-base font-bold text-lg ml-2">
          APPLY TO READING
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="border border-border-default w-full py-4 rounded-full items-center justify-center mb-12"
        onPress={onHome}
      >
        <Text className="text-text-primary font-bold">RETURN TO LIBRARY</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default function CalibrationScreen() {
  const router = useRouter();
  const { state, actions } = useProficiencyTest();

  // Handle navigation
  const handleHome = () => router.replace("/(tabs)/");
  const handleApply = () => router.replace("/(tabs)/library");

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header (Back button only visible in some steps) */}
      {state.step === "intro" && (
        <View className="absolute top-4 left-4 z-10">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 rounded-full bg-bg-base/50"
          >
            <ChevronLeft size={24} color="#E0E0E0" />
          </TouchableOpacity>
        </View>
      )}

      {state.step === "intro" && <IntroView onStart={actions.start} />}

      {state.step === "reading" && (
        <ReadingView
          sentence={state.sentences[state.currentIndex]}
          index={state.currentIndex}
          total={state.sentences.length}
          onResult={actions.recordResult}
          onInspect={actions.inspectWord}
        />
      )}

      {state.step === "leveling" && <LevelingView level={state.currentLevel} />}

      {(state.step === "processing" || state.isLoading) &&
        state.step !== "reading" && <ProcessingView />}

      {state.step === "complete" && (
        <CompleteView
          level={state.currentLevel}
          diagnosis={state.diagnosis}
          onApply={handleApply}
          onHome={handleHome}
        />
      )}

      {state.step === "error" && (
        <View className="flex-1 items-center justify-center">
          <Text className="text-accent-danger font-bold mb-4">
            Connection Error
          </Text>
          <TouchableOpacity
            onPress={actions.restart}
            className="bg-bg-elevated px-6 py-3 rounded-full"
          >
            <Text className="text-text-primary">Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
