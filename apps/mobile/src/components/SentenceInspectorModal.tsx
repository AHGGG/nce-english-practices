import React, { useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSentenceExplainer } from "@nce/shared";
import { X, HelpCircle, ChevronRight, Sparkles } from "lucide-react-native";

interface SentenceInspectorModalProps {
  visible: boolean;
  onClose: () => void;
  sentence: string | null;
  unclearType?: string;
}

const STAGE_LABELS: Record<number, string> = {
  1: "Simple Explanation",
  2: "Detailed Breakdown",
  3: "中文深度解释",
};

export const SentenceInspectorModal = ({
  visible,
  onClose,
  sentence,
  unclearType,
}: SentenceInspectorModalProps) => {
  const {
    currentStage,
    setCurrentStage,
    explanations,
    isLoading,
    error,
    fetchExplanation,
  } = useSentenceExplainer(sentence, unclearType);

  // Fetch when visible
  useEffect(() => {
    if (visible && sentence) {
      fetchExplanation(currentStage);
    }
  }, [visible, sentence, currentStage]);

  if (!sentence) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-bg-surface h-[85%] rounded-t-2xl overflow-hidden border-t border-border-default">
          {/* Header */}
          <View className="p-4 border-b border-border-default bg-bg-elevated flex-row justify-between items-start">
            <View className="flex-1 pr-4">
              <View className="flex-row items-center mb-2">
                <HelpCircle size={14} color="#F59E0B" />
                <Text className="text-accent-warning text-xs font-mono font-bold ml-2 uppercase">
                  {unclearType || "SENTENCE"} ANALYSIS
                </Text>
              </View>
              <Text
                className="text-text-primary font-serif leading-6"
                numberOfLines={3}
              >
                {sentence}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2">
              <X size={24} color="#888888" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View className="flex-row border-b border-border-default bg-bg-surface">
            {[1, 2, 3].map((stage) => (
              <TouchableOpacity
                key={stage}
                onPress={() => setCurrentStage(stage)}
                className={`flex-1 py-3 items-center border-b-2 ${
                  currentStage === stage
                    ? "border-accent-primary bg-accent-primary/5"
                    : "border-transparent"
                }`}
              >
                <Text
                  className={`text-xs font-bold uppercase ${
                    currentStage === stage
                      ? "text-accent-primary"
                      : "text-text-muted"
                  }`}
                >
                  Stage {stage}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          <View className="flex-1 p-4">
            <View className="flex-row items-center mb-4">
              <Sparkles size={14} color="#00FF94" />
              <Text className="text-accent-primary text-xs font-bold uppercase ml-2">
                {STAGE_LABELS[currentStage]}
              </Text>
              {isLoading && (
                <ActivityIndicator
                  size="small"
                  color="#00FF94"
                  className="ml-auto"
                />
              )}
            </View>

            <ScrollView className="flex-1">
              {error ? (
                <Text className="text-accent-warning text-center mt-4">
                  {error}
                </Text>
              ) : explanations[currentStage] ? (
                <Text className="text-text-primary text-base font-serif leading-8">
                  {/* Simple Markdown cleaning */}
                  {
                    explanations[currentStage]
                      .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold markers
                      .replace(/\*(.*?)\*/g, "$1") // Remove italic markers
                  }
                </Text>
              ) : !isLoading ? (
                <Text className="text-text-muted text-center mt-8">
                  Tap a stage to analyze
                </Text>
              ) : null}
            </ScrollView>
          </View>

          {/* Footer Actions */}
          <View className="p-4 border-t border-border-default bg-bg-elevated safe-bottom">
            {currentStage < 3 ? (
              <TouchableOpacity
                onPress={() => setCurrentStage((prev) => Math.min(prev + 1, 3))}
                className="flex-row items-center justify-center py-3 border border-border-default rounded-lg bg-bg-surface"
              >
                <Text className="text-text-secondary font-bold text-xs uppercase mr-2">
                  Still Unclear? Go Deeper
                </Text>
                <ChevronRight size={16} color="#888888" />
              </TouchableOpacity>
            ) : (
              <Text className="text-center text-text-muted text-xs">
                Deepest explanation level reached
              </Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};
