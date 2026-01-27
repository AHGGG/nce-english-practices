import "./global.css";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useWordExplainer } from "@nce/shared";
import { authService } from "@nce/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Configure Auth Service for Mobile
const asyncStorageAdapter = {
  getItem: AsyncStorage.getItem,
  setItem: AsyncStorage.setItem,
  removeItem: AsyncStorage.removeItem,
};

authService.setStorage(asyncStorageAdapter);

// Determine Backend URL (Dev helper)
const getBaseUrl = () => {
  // Use explicit env var if available, otherwise guess based on Expo host
  if (Constants.expoConfig?.hostUri) {
    const ip = Constants.expoConfig.hostUri.split(":")[0];
    // console.log('Detected Host IP:', ip);
    return `http://${ip}:8000`;
  }
  return "http://localhost:8000";
};

const BASE_URL = getBaseUrl();
console.log("Mobile API Base URL:", BASE_URL);
authService.setBaseUrl(BASE_URL);

export default function App() {
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
    <SafeAreaView className="flex-1 bg-background">
      <View className="p-4 flex-1">
        <Text className="text-2xl font-bold text-white mb-4 text-center">
          NCE Mobile
        </Text>

        {/* Search Input */}
        <View className="flex-row space-x-2 mb-6">
          <TextInput
            className="flex-1 bg-slate-800 text-white p-3 rounded-lg border border-slate-700"
            placeholder="Enter a word..."
            placeholderTextColor="#94a3b8"
            value={input}
            onChangeText={setInput}
            autoCapitalize="none"
          />
          <TouchableOpacity
            className="bg-blue-600 p-3 rounded-lg justify-center"
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
              <Text className="text-slate-400 ml-2">
                {isInspecting
                  ? "Fetching Dictionary..."
                  : "Generating Explanation..."}
              </Text>
            </View>
          )}

          {/* Dictionary Results */}
          {inspectorData && (
            <View className="bg-slate-800 p-4 rounded-xl mb-4">
              <Text className="text-xl font-bold text-blue-400 mb-2">
                {inspectorData.word}
              </Text>

              {/* Simple rendering of LDOCE definitions */}
              {inspectorData.ldoce?.found && (
                <View className="mb-2">
                  <Text className="text-slate-300 font-semibold mb-1">
                    LDOCE:
                  </Text>
                  {inspectorData.ldoce.senses?.slice(0, 2).map((sense, i) => (
                    <Text key={i} className="text-slate-400 ml-2 mb-1">
                      • {sense.definition?.en || "No definition"}
                    </Text>
                  ))}
                </View>
              )}

              {/* Simple rendering of Collins definitions */}
              {inspectorData.collins?.found && (
                <View>
                  <Text className="text-slate-300 font-semibold mb-1">
                    Collins:
                  </Text>
                  {inspectorData.collins.senses?.slice(0, 2).map((sense, i) => (
                    <Text key={i} className="text-slate-400 ml-2 mb-1">
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
            <View className="bg-slate-800 p-4 rounded-xl border border-blue-500/30">
              <Text className="text-lg font-bold text-green-400 mb-2">
                AI Context
              </Text>
              <Text className="text-slate-300 leading-6">
                {contextExplanation}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
