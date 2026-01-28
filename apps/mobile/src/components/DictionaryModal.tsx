import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";

interface DictionaryModalProps {
  visible: boolean;
  onClose: () => void;
  inspectorData: any;
  contextExplanation: string | null;
  isInspecting: boolean;
  isExplaining: boolean;
}

export function DictionaryModal({
  visible,
  onClose,
  inspectorData,
  contextExplanation,
  isInspecting,
  isExplaining,
}: DictionaryModalProps) {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/70">
        <View className="bg-bg-elevated h-[70%] rounded-t-3xl p-6 border-t border-border shadow-2xl">
          {/* Modal Header */}
          <View className="flex-row justify-between items-center mb-6 pb-4 border-b border-border">
            <View>
              <Text className="text-xs font-bold text-accent-primary uppercase tracking-widest mb-1">
                Dictionary
              </Text>
              <Text className="text-2xl font-bold text-text-primary font-serif">
                {inspectorData?.word || "Looking up..."}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="p-2 bg-bg-surface rounded-full border border-border"
            >
              <Text className="text-text-muted font-bold px-2">✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {(isInspecting || isExplaining) && !inspectorData && (
              <ActivityIndicator
                size="large"
                color="#00FF94"
                className="mt-8"
              />
            )}

            {/* Dictionary Entries */}
            {inspectorData && (
              <View className="mb-8">
                {/* LDOCE */}
                {inspectorData.ldoce?.found && (
                  <View className="mb-6">
                    <Text className="text-accent-info font-bold mb-3 text-xs uppercase tracking-wider font-mono">
                      Longman Dictionary
                    </Text>
                    {inspectorData.ldoce.senses
                      ?.slice(0, 3)
                      .map((sense: any, i: number) => (
                        <View
                          key={i}
                          className="mb-4 pl-3 border-l-2 border-accent-info/30"
                        >
                          <Text className="text-text-primary text-lg font-serif leading-7 mb-1">
                            {sense.definition?.en}
                          </Text>
                          {sense.examples?.[0] && (
                            <Text className="text-text-secondary italic text-sm mt-1">
                              "{sense.examples[0].text}"
                            </Text>
                          )}
                        </View>
                      ))}
                  </View>
                )}

                {/* Collins */}
                {inspectorData.collins?.found && (
                  <View className="mb-6">
                    <Text className="text-accent-warning font-bold mb-3 text-xs uppercase tracking-wider font-mono">
                      Collins COBUILD
                    </Text>
                    {inspectorData.collins.senses
                      ?.slice(0, 2)
                      .map((sense: any, i: number) => (
                        <View
                          key={i}
                          className="mb-2 pl-3 border-l-2 border-accent-warning/30"
                        >
                          <Text className="text-text-primary text-base font-serif leading-6">
                            {sense.definition?.en}
                          </Text>
                        </View>
                      ))}
                  </View>
                )}
              </View>
            )}

            {/* AI Context */}
            {contextExplanation ? (
              <View className="bg-bg-surface p-5 rounded-xl border border-accent-success/30 mb-8">
                <Text className="text-accent-success font-bold mb-3 text-xs uppercase tracking-wider font-mono">
                  AI Context Analysis
                </Text>
                <Text className="text-text-primary leading-7 font-serif text-base">
                  {contextExplanation}
                </Text>
              </View>
            ) : isExplaining ? (
              <View className="flex-row items-center space-x-2 mt-2">
                <ActivityIndicator size="small" color="#94a3b8" />
                <Text className="text-text-muted italic text-sm ml-2">
                  Analyzing context...
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
