import {
  View,
  Text,
  FlatList,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, Heart, PlayCircle, Trash2 } from "lucide-react-native";
import { usePodcastFavorites, usePodcastMutations } from "@nce/shared";
import { useMemo, useState } from "react";

export default function PodcastFavoritesScreen() {
  const router = useRouter();
  const { items, isLoading, error } = usePodcastFavorites(200, 0);
  const { removeFavorite } = usePodcastMutations();
  const [removing, setRemoving] = useState<Record<number, boolean>>({});
  const [sortMode, setSortMode] = useState<"favorite-time" | "channel-grouped">(
    "favorite-time",
  );

  const sortedByFavoriteTime = useMemo(() => {
    return [...items].sort((a, b) => {
      const left = a.favorited_at ? Date.parse(a.favorited_at) : 0;
      const right = b.favorited_at ? Date.parse(b.favorited_at) : 0;
      return right - left;
    });
  }, [items]);

  const groupedByFeed = useMemo(() => {
    const groups = new Map<
      number,
      {
        title: string;
        latestFavoritedAt: number;
        data: (typeof items)[number][];
      }
    >();

    for (const item of sortedByFavoriteTime) {
      const favoritedAt = item.favorited_at ? Date.parse(item.favorited_at) : 0;
      const group = groups.get(item.feed.id);
      if (!group) {
        groups.set(item.feed.id, {
          title: item.feed.title,
          latestFavoritedAt: favoritedAt,
          data: [item],
        });
        continue;
      }

      group.data.push(item);
      group.latestFavoritedAt = Math.max(group.latestFavoritedAt, favoritedAt);
    }

    return [...groups.entries()]
      .map(([feedId, group]) => ({ feedId, ...group }))
      .sort((a, b) => {
        if (b.latestFavoritedAt !== a.latestFavoritedAt) {
          return b.latestFavoritedAt - a.latestFavoritedAt;
        }
        return a.title.localeCompare(b.title);
      });
  }, [items, sortedByFavoriteTime]);

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

  const renderFavoriteItem = ({ item }: { item: (typeof items)[number] }) => (
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
        <Text className="text-text-muted text-xs mt-1" numberOfLines={1}>
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
  );

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

      {!isLoading && !error && items.length > 0 && (
        <View className="px-4 pt-3 pb-1 flex-row gap-2">
          <TouchableOpacity
            className={`px-3 py-2 rounded-lg border ${
              sortMode === "favorite-time"
                ? "border-accent-primary bg-bg-surface"
                : "border-border-default bg-bg-surface"
            }`}
            onPress={() => setSortMode("favorite-time")}
          >
            <Text
              className={`text-xs ${
                sortMode === "favorite-time"
                  ? "text-accent-primary"
                  : "text-text-muted"
              }`}
            >
              By favorite time
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`px-3 py-2 rounded-lg border ${
              sortMode === "channel-grouped"
                ? "border-accent-primary bg-bg-surface"
                : "border-border-default bg-bg-surface"
            }`}
            onPress={() => setSortMode("channel-grouped")}
          >
            <Text
              className={`text-xs ${
                sortMode === "channel-grouped"
                  ? "text-accent-primary"
                  : "text-text-muted"
              }`}
            >
              Group by channel
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#00FF94" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-accent-danger text-center">{error}</Text>
        </View>
      ) : (
        <>
          {sortMode === "favorite-time" ? (
            <FlatList
              data={sortedByFavoriteTime}
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
              renderItem={renderFavoriteItem}
            />
          ) : (
            <SectionList
              sections={groupedByFeed}
              keyExtractor={(item) => item.episode.id.toString()}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
              renderItem={renderFavoriteItem}
              renderSectionHeader={({ section }) => (
                <View className="mb-2 mt-1 px-1 flex-row items-center justify-between">
                  <Text className="text-text-primary font-semibold text-sm flex-1 mr-2">
                    {section.title}
                  </Text>
                  <Text className="text-text-muted text-xs">
                    {section.data.length} favorites
                  </Text>
                </View>
              )}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}
