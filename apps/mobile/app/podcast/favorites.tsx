import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, Heart, PlayCircle, Trash2 } from "lucide-react-native";
import { usePodcastFavorites, usePodcastMutations } from "@nce/shared";
import { useState } from "react";

export default function PodcastFavoritesScreen() {
  const router = useRouter();
  const { items, isLoading, error } = usePodcastFavorites(200, 0);
  const { removeFavorite } = usePodcastMutations();
  const [removing, setRemoving] = useState<Record<number, boolean>>({});

  const handleRemove = async (episodeId: number) => {
    try {
      setRemoving((prev) => ({ ...prev, [episodeId]: true }));
      await removeFavorite(episodeId);
    } catch (e) {
      console.error(e);
    } finally {
      setRemoving((prev) => ({ ...prev, [episodeId]: false }));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <View className="h-14 flex-row items-center px-4 border-b border-border-default bg-bg-surface">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft color="#E0E0E0" size={24} />
        </TouchableOpacity>
        <Text className="text-text-primary font-bold ml-2 text-base">
          Favorites
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#00FF94" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-accent-danger text-center">{error}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.episode.id.toString()}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="mt-20 items-center">
              <Heart size={42} color="#666" />
              <Text className="text-text-muted mt-3">
                No favorite episodes yet
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="flex-row items-center bg-bg-surface p-3 rounded-xl border border-border-default mb-3">
              <Image
                source={{
                  uri:
                    item.episode.image_url ||
                    item.feed.image_url ||
                    "https://via.placeholder.com/80",
                }}
                className="w-14 h-14 rounded-lg mr-3 bg-bg-elevated"
              />

              <View className="flex-1 mr-2">
                <Text
                  className="text-text-primary font-semibold text-sm"
                  numberOfLines={2}
                >
                  {item.episode.title}
                </Text>
                <Text
                  className="text-text-muted text-xs mt-1"
                  numberOfLines={1}
                >
                  {item.feed.title}
                </Text>
              </View>

              <TouchableOpacity
                className="p-2 mr-1"
                onPress={() =>
                  router.push({
                    pathname: "/podcast/player",
                    params: { episodeId: item.episode.id.toString() },
                  })
                }
              >
                <PlayCircle size={22} color="#00FF94" />
              </TouchableOpacity>

              <TouchableOpacity
                className="p-2"
                disabled={!!removing[item.episode.id]}
                onPress={() => handleRemove(item.episode.id)}
              >
                {removing[item.episode.id] ? (
                  <ActivityIndicator size="small" color="#A0A0A0" />
                ) : (
                  <Trash2 size={18} color="#FF4D6D" />
                )}
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
