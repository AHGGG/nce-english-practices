import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Volume2, X, Bookmark, Loader2, Sparkles } from "lucide-react-native";
import DictionaryResults from "./DictionaryResults";

interface DictionaryModalProps {
  visible: boolean;
  onClose: () => void;
  inspectorData: any;
  contextExplanation: string | null;
  isInspecting: boolean;
  isExplaining: boolean;
  selectedWord: string | null;
  isPhrase: boolean;
  explainStyle: string;
  generatedImage: string | null;
  isGeneratingImage: boolean;
  imagePrompt: string | null;
  onExplainStyle: (style: string) => void;
  onGenerateImage: () => void;
  onMarkAsKnown: (word: string) => void;
  onAddToReview?: (word: string) => void;
  onPlayAudio: (text: string) => void;
  currentSentenceContext: string;
}

export function DictionaryModal({
  visible,
  onClose,
  inspectorData,
  contextExplanation,
  isInspecting,
  isExplaining,
  selectedWord,
  isPhrase,
  explainStyle,
  generatedImage,
  isGeneratingImage,
  imagePrompt,
  onExplainStyle,
  onGenerateImage,
  onMarkAsKnown,
  onAddToReview,
  onPlayAudio,
  currentSentenceContext,
}: DictionaryModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const defaultTab = useMemo(() => {
    if (inspectorData?.ldoce?.found) return "LDOCE";
    if (inspectorData?.collins?.found) return "Collins";
    return "LDOCE";
  }, [inspectorData]);

  const [activeTab, setActiveTab] = useState(defaultTab);

  const effectiveTab = useMemo(() => {
    if (activeTab === "LDOCE" && inspectorData?.ldoce?.found) return "LDOCE";
    if (activeTab === "Collins" && inspectorData?.collins?.found)
      return "Collins";
    return defaultTab;
  }, [activeTab, inspectorData, defaultTab]);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/70">
        <View className="bg-bg-elevated h-[85%] rounded-t-3xl p-0 border-t border-border shadow-2xl">
          {/* Modal Header */}
          <View className="flex-row justify-between items-center p-4 pb-4 border-b border-border">
            <View className="flex-row items-center flex-1">
              <Text className="text-2xl font-bold text-text-primary font-serif mr-3">
                {selectedWord || "Looking up..."}
              </Text>
              {selectedWord && (
                <TouchableOpacity
                  onPress={() => onPlayAudio(selectedWord)}
                  className="p-2 bg-bg-surface rounded-full border border-border"
                >
                  <Volume2 size={18} color={isPlaying ? "#00FF94" : "#888"} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="p-2 bg-bg-surface rounded-full border border-border"
            >
              <X size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* AI Context Section */}
            {(contextExplanation || isExplaining) && (
              <View className="m-4 p-4 bg-bg-surface rounded-xl border border-accent-primary/30">
                <View className="flex-row items-center gap-2 mb-3">
                  <Sparkles size={14} color="#00FF94" />
                  <Text className="text-accent-primary font-bold text-xs uppercase tracking-wider font-mono">
                    {isPhrase ? "Phrase Explanation" : "In This Context"}
                  </Text>
                  {isExplaining && (
                    <ActivityIndicator
                      size="small"
                      color="#00FF94"
                      className="ml-auto"
                    />
                  )}
                </View>
                <Text className="text-text-primary leading-7 font-serif text-base">
                  {contextExplanation || "Analyzing..."}
                </Text>

                {/* Image Generation Section */}
                {(isGeneratingImage || generatedImage || imagePrompt) && (
                  <View className="mt-4 pt-3 border-t border-accent-primary/20">
                    <View className="flex-row items-center gap-2 mb-2">
                      <Sparkles size={12} color="#F59E0B" />
                      <Text className="text-accent-warning font-bold text-xs uppercase tracking-wider font-mono">
                        AI Visualization
                      </Text>
                    </View>
                    {isGeneratingImage ? (
                      <View className="flex-row items-center justify-center py-4 bg-bg-base/20 rounded">
                        <Loader2
                          size={20}
                          color="#F59E0B"
                          className="animate-spin"
                        />
                        <Text className="text-text-muted text-xs ml-2 uppercase tracking-widest font-mono">
                          Generating...
                        </Text>
                      </View>
                    ) : generatedImage ? (
                      <View className="relative rounded overflow-hidden border border-border">
                        <Text className="text-xs text-accent-warning p-2 font-mono">
                          [Image: {generatedImage.substring(0, 50)}...]
                        </Text>
                      </View>
                    ) : imagePrompt ? (
                      <TouchableOpacity
                        onPress={onGenerateImage}
                        className="py-2 bg-accent-warning/10 border border-accent-warning/30 rounded flex-row items-center justify-center gap-2"
                      >
                        <Sparkles size={12} color="#F59E0B" />
                        <Text className="text-accent-warning text-xs font-bold uppercase tracking-wider font-mono">
                          Generate Visualization
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}

                {/* Style Switching */}
                {!isExplaining && contextExplanation && (
                  <View className="mt-3 flex-row gap-2 border-t border-accent-primary/20 pt-2">
                    {explainStyle !== "simple" && (
                      <TouchableOpacity
                        onPress={() => onExplainStyle("simple")}
                        className="flex-1 py-1.5 border border-accent-primary/30 rounded items-center"
                      >
                        <Text className="text-accent-primary text-xs font-mono uppercase">
                          Simpler
                        </Text>
                      </TouchableOpacity>
                    )}
                    {explainStyle !== "chinese_deep" && (
                      <TouchableOpacity
                        onPress={() => onExplainStyle("chinese_deep")}
                        className="flex-1 py-1.5 border border-accent-warning/30 rounded items-center"
                      >
                        <Text className="text-accent-warning text-xs font-mono uppercase">
                          Chinese Deep
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Dictionary Loading */}
            {(isInspecting || isExplaining) && !inspectorData && (
              <View className="flex-row items-center justify-center py-8 space-x-2">
                <ActivityIndicator size="large" color="#00FF94" />
                <Text className="text-text-muted text-sm ml-2 uppercase tracking-widest font-mono">
                  Consulting Dictionary...
                </Text>
              </View>
            )}

            {/* Dictionary Tabs */}
            {inspectorData &&
              (inspectorData.ldoce?.found || inspectorData.collins?.found) && (
                <View className="flex-row border-b border-border mx-4">
                  {inspectorData.ldoce?.found && (
                    <TouchableOpacity
                      onPress={() => setActiveTab("LDOCE")}
                      className={`flex-1 py-3 ${
                        effectiveTab === "LDOCE"
                          ? "border-b-2 border-accent-primary bg-accent-primary/5"
                          : ""
                      }`}
                    >
                      <Text
                        className={`text-center text-xs font-bold uppercase tracking-wider ${
                          effectiveTab === "LDOCE"
                            ? "text-accent-primary"
                            : "text-text-muted"
                        }`}
                      >
                        LDOCE
                      </Text>
                    </TouchableOpacity>
                  )}
                  {inspectorData.collins?.found && (
                    <TouchableOpacity
                      onPress={() => setActiveTab("Collins")}
                      className={`flex-1 py-3 ${
                        effectiveTab === "Collins"
                          ? "border-b-2 border-accent-warning bg-accent-warning/5"
                          : ""
                      }`}
                    >
                      <Text
                        className={`text-center text-xs font-bold uppercase tracking-wider ${
                          effectiveTab === "Collins"
                            ? "text-accent-warning"
                            : "text-text-muted"
                        }`}
                      >
                        Collins
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

            {/* Dictionary Results */}
            {inspectorData?.found && (
              <View className="mx-4 mt-4">
                {effectiveTab === "LDOCE" && inspectorData.ldoce?.found && (
                  <DictionaryResults
                    word={selectedWord || ""}
                    source="LDOCE"
                    entries={inspectorData.ldoce.entries || []}
                  />
                )}
                {effectiveTab === "Collins" && inspectorData.collins?.found && (
                  <DictionaryResults
                    word={selectedWord || ""}
                    source="Collins"
                    entries={
                      inspectorData.collins.entry
                        ? [inspectorData.collins.entry]
                        : []
                    }
                  />
                )}
              </View>
            )}

            {inspectorData?.found === false && (
              <View className="mx-4 mt-4 text-text-secondary text-center py-8">
                <Text className="text-lg font-serif mb-2">Word not found</Text>
                <Text className="text-sm font-mono text-text-muted">
                  "{selectedWord}" is not in dictionaries.
                </Text>
              </View>
            )}

            {!inspectorData && !isInspecting && (
              <Text className="text-accent-danger text-center text-sm py-8 font-mono mx-4">
                Failed to load definition
              </Text>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View className="flex-row gap-2 p-4 border-t border-border bg-bg-elevated">
            <TouchableOpacity
              onPress={() => selectedWord && onMarkAsKnown(selectedWord)}
              className="flex-1 bg-bg-surface border border-border py-3 rounded-xl"
            >
              <Text className="text-text-secondary text-center text-xs font-bold uppercase tracking-wider">
                Mark Known
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (!selectedWord) return;
                const addToReview = onAddToReview || onMarkAsKnown;
                addToReview(selectedWord);
              }}
              className="flex-[2] bg-text-primary py-3 rounded-xl flex-row items-center justify-center gap-2"
            >
              <Bookmark size={16} color="#000" />
              <Text className="text-text-inverse text-center text-xs font-bold uppercase tracking-wider">
                Add to Review
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
