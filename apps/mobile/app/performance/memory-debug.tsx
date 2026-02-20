import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@nce/api";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

export default function MemoryCurveDebugScreen() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["performance", "debug", "memory-curve"],
    queryFn: () => apiGet("/api/review/debug/memory-curve"),
  });

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <View className="h-14 flex-row items-center px-4 border-b border-border-default bg-bg-surface">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft color="#E0E0E0" size={24} />
        </TouchableOpacity>
        <Text className="text-text-primary font-bold ml-2">
          Memory Curve Debug
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#00FF94" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-accent-danger mb-3">
            Failed to load memory debug.
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="px-4 py-2 rounded-lg bg-bg-surface border border-border-default"
          >
            <Text className="text-text-primary">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView className="flex-1 p-4">
          <Text className="text-text-muted text-xs uppercase mb-2">
            Raw Output
          </Text>
          <View className="bg-bg-surface border border-border-default rounded-xl p-3">
            <Text className="text-text-secondary text-xs font-mono leading-5">
              {JSON.stringify(data, null, 2)}
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
