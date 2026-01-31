import { View, TextInput, TouchableOpacity, Text, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useWordExplainer } from "@nce/shared";
import { DictionaryResultView } from "../../src/components/DictionaryResultView";
import { Search, X } from "lucide-react-native";

export default function DictionaryScreen() {
  const [query, setQuery] = useState("");
  const { 
    handleWordClick, 
    inspectorData, 
    contextExplanation, 
    isInspecting, 
    isExplaining 
  } = useWordExplainer();

  const handleSearch = () => {
    if (query.trim()) {
      Keyboard.dismiss();
      handleWordClick(query.trim(), "", ""); 
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-base" edges={['top']}>
      {/* Search Header */}
      <View className="p-4 border-b border-border-default">
        <Text className="text-2xl font-bold font-serif text-text-primary mb-4">Dictionary</Text>
        <View className="flex-row items-center bg-bg-surface border border-border-default rounded-xl px-3 py-2">
          <Search size={20} color="#666" />
          <TextInput
            className="flex-1 ml-2 text-text-primary font-sans text-base h-10"
            placeholder="Type a word..."
            placeholderTextColor="#666"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <X size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results */}
      <DictionaryResultView 
        inspectorData={inspectorData}
        contextExplanation={contextExplanation}
        isLoading={isInspecting || isExplaining}
      />
    </SafeAreaView>
  );
}
