// apps/mobile/app/(tabs)/dictionary.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useWordExplainer } from "@nce/shared";

export default function DictionaryScreen() {
  const [input, setInput] = useState("");

  // Use the shared hook
  const {
    handleWordClick,
    inspectorData,
    contextExplanation,
    isInspecting,
    isExplaining,
  } = useWordExplainer();

  const handleLookup = () => {
    if (input.trim()) {
      // Pass dummy sentence for context
      handleWordClick(input, "User looked up manually.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="p-4 flex-1">
        <Text className="text-2xl font-bold text-white mb-4 text-center">
          Dictionary
        </Text>

        {/* Search Input */}
        <View className="flex-row space-x-2 mb-6">
          <TextInput
            className="flex-1 bg-surface text-text p-3 rounded-lg border border-gray-700"
            placeholder="Enter a word..."
            placeholderTextColor="#94a3b8"
            value={input}
            onChangeText={setInput}
            autoCapitalize="none"
          />
          <TouchableOpacity
            className="bg-primary p-3 rounded-lg justify-center"
            onPress={handleLookup}
          >
            <Text className="text-white font-bold">Lookup</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1">
          {/* Status */}
          {(isInspecting || isExplaining) && (
            <View className="mb-4 flex-row items-center justify-center">
              <ActivityIndicator color="#3b82f6" />
              <Text className="text-text-muted ml-2">
                {isInspecting
                  ? "Fetching Dictionary..."
                  : "Generating Explanation..."}
              </Text>
            </View>
          )}

          {/* Dictionary Results */}
          {inspectorData && (
            <View className="bg-surface p-4 rounded-xl mb-4">
              <Text className="text-xl font-bold text-blue-400 mb-2">
                {inspectorData.word}
              </Text>

              {/* Simple rendering of LDOCE definitions */}
              {inspectorData.ldoce?.found && (
                <View className="mb-2">
                  <Text className="text-text font-semibold mb-1">
                    LDOCE:
                  </Text>
                  {inspectorData.ldoce.senses?.slice(0, 2).map((sense: any, i: number) => (
                    <Text key={i} className="text-text-muted ml-2 mb-1">
                      • {sense.definition?.en || "No definition"}
                    </Text>
                  ))}
                </View>
              )}

              {/* Simple rendering of Collins definitions */}
              {inspectorData.collins?.found && (
                <View>
                  <Text className="text-text font-semibold mb-1">
                    Collins:
                  </Text>
                  {inspectorData.collins.senses?.slice(0, 2).map((sense: any, i: number) => (
                    <Text key={i} className="text-text-muted ml-2 mb-1">
                      • {sense.definition?.en || "No definition"}
                    </Text>
                  ))}
                </View>
              )}

              {!inspectorData.ldoce?.found && !inspectorData.collins?.found && (
                <Text className="text-red-400">No definitions found.</Text>
              )}
            </View>
          )}

          {/* AI Explanation */}
          {contextExplanation ? (
            <View className="bg-surface p-4 rounded-xl border border-blue-500/30">
              <Text className="text-lg font-bold text-green-400 mb-2">
                AI Context
              </Text>
              <Text className="text-text-muted leading-6">
                {contextExplanation}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
