import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DictionaryScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bg-base items-center justify-center">
      <Text className="text-text-primary text-xl font-serif">Dictionary</Text>
      <Text className="text-text-secondary mt-2">Search is coming soon</Text>
    </SafeAreaView>
  );
}
