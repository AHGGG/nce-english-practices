import { View, ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { usePodcastFeed, usePodcastMutations } from "@nce/shared";
import { PodcastDetailView } from "../../src/components/podcast/PodcastDetailView";
import { ChevronLeft } from "lucide-react-native";
import { TouchableOpacity } from "react-native";

export default function PodcastDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const feedId = parseInt(id, 10);

  const { data, isLoading, error } = usePodcastFeed(feedId);
  const { subscribe, unsubscribe, isSubscribing } = usePodcastMutations();

  if (isLoading || !data) {
    return (
      <View className="flex-1 justify-center items-center bg-bg-base">
        <ActivityIndicator color="#00FF94" size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-bg-base">
        <Text className="text-accent-danger">{error}</Text>
      </View>
    );
  }

  const handleSubscribe = async () => {
    try {
      await subscribe(data.feed.rss_url);
      // Optimistic update or refetch handled by react-query invalidation
    } catch (e) {
      console.error(e);
    }
  };

  const handleUnsubscribe = async () => {
    try {
      await unsubscribe(data.feed.id);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-base" edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="h-14 flex-row items-center px-4 border-b border-border-default bg-bg-surface">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft color="#E0E0E0" size={24} />
        </TouchableOpacity>
        <Text
          className="text-text-primary font-bold ml-2 text-sm"
          numberOfLines={1}
        >
          {data.feed.title}
        </Text>
      </View>

      <PodcastDetailView
        data={data}
        onSubscribe={handleSubscribe}
        onUnsubscribe={handleUnsubscribe}
        isSubscribing={isSubscribing}
        onPlayEpisode={(episode) => {
          // Open Player Modal
          router.push({
            pathname: "/podcast/player",
            params: { episodeId: episode.id },
          });
        }}
      />
    </SafeAreaView>
  );
}
