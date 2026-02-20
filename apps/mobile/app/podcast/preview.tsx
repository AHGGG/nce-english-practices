import {
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { usePodcastPreview, usePodcastMutations } from "@nce/shared";
import { PodcastDetailView } from "../../src/components/podcast/PodcastDetailView";
import { ChevronLeft } from "lucide-react-native";
import {
  addEpisodeToPlaylist,
  getPlaylists,
} from "../../src/utils/podcastPlaylists";

export default function PodcastPreviewScreen() {
  const { rss_url } = useLocalSearchParams<{ rss_url: string }>();
  const router = useRouter();

  const { data, isLoading, error } = usePodcastPreview(rss_url as string);
  const { subscribe, isSubscribing } = usePodcastMutations();

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-bg-base">
        <Text className="text-accent-danger">{error}</Text>
      </View>
    );
  }

  if (isLoading || !data) {
    return (
      <View className="flex-1 justify-center items-center bg-bg-base">
        <ActivityIndicator color="#00FF94" size="large" />
      </View>
    );
  }

  const handleSubscribe = async () => {
    try {
      await subscribe(data.feed.rss_url);
      // After subscribing, we could redirect to the real feed page or just show subscribed state
      // For simplicity, just stay here and let UI update
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddToPlaylist = async (episodeId: number) => {
    const playlists = await getPlaylists();
    if (playlists.length === 0) {
      Alert.alert(
        "No playlists",
        "Create a playlist first from Podcast > Playlists.",
      );
      return;
    }

    Alert.alert(
      "Add to playlist",
      "Choose destination",
      [
        ...playlists.slice(0, 6).map((playlist) => ({
          text: playlist.name,
          onPress: async () => {
            await addEpisodeToPlaylist(playlist.id, episodeId);
          },
        })),
        { text: "Cancel", style: "cancel" as const },
      ],
      { cancelable: true },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
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
          Preview: {data.feed.title}
        </Text>
      </View>

      <PodcastDetailView
        data={data}
        onSubscribe={handleSubscribe}
        isSubscribing={isSubscribing}
        onPlayEpisode={(episode) => {
          router.push({
            pathname: "/podcast/player",
            params: {
              episodeId: episode.id,
              // Pass initial data if not yet in DB?
              // Ideally player fetches from DB, but preview episodes might not be fully indexed?
              // Backend preview saves feed and episodes to DB, so IDs are valid.
            },
          });
        }}
        onAddToPlaylist={handleAddToPlaylist}
      />
    </SafeAreaView>
  );
}
