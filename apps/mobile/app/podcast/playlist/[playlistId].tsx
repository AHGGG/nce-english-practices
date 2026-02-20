import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ChevronLeft,
  ArrowUp,
  ArrowDown,
  Trash2,
  Pencil,
  Check,
} from "lucide-react-native";
import { podcastApi } from "@nce/api";
import {
  getPlaylistById,
  moveEpisodeInPlaylist,
  removeEpisodeFromPlaylist,
  renamePlaylist,
  type PodcastPlaylist,
} from "../../../src/utils/podcastPlaylists";

interface EpisodeBatchItem {
  episode: {
    id: number;
    title: string;
    image_url?: string | null;
  };
  feed: {
    id: number;
    title: string;
    image_url?: string | null;
  };
}

export default function PodcastPlaylistDetailScreen() {
  const { playlistId = "" } = useLocalSearchParams<{ playlistId: string }>();
  const router = useRouter();
  const [playlist, setPlaylist] = useState<PodcastPlaylist | null>(null);
  const [items, setItems] = useState<EpisodeBatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const episodeIds = useMemo(
    () => playlist?.items.map((item) => item.episodeId) ?? [],
    [playlist],
  );

  const loadPlaylist = useCallback(async () => {
    const current = await getPlaylistById(playlistId);
    setPlaylist(current);
  }, [playlistId]);

  useEffect(() => {
    void loadPlaylist();
  }, [loadPlaylist]);

  useEffect(() => {
    const loadItems = async () => {
      if (!playlist || episodeIds.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = (await podcastApi.getEpisodesBatch(
          episodeIds,
        )) as EpisodeBatchItem[];
        const indexMap = new Map<number, number>();
        episodeIds.forEach((id, index) => indexMap.set(id, index));
        const sorted = [...data].sort(
          (a, b) =>
            (indexMap.get(a.episode.id) ?? Number.MAX_SAFE_INTEGER) -
            (indexMap.get(b.episode.id) ?? Number.MAX_SAFE_INTEGER),
        );
        setItems(sorted);
      } finally {
        setLoading(false);
      }
    };

    void loadItems();
  }, [playlist, episodeIds]);

  const refresh = useCallback(async () => {
    await loadPlaylist();
  }, [loadPlaylist]);

  const handleRename = async () => {
    if (!playlist || !renameValue.trim()) return;
    await renamePlaylist(playlist.id, renameValue.trim());
    await refresh();
    setRenameOpen(false);
  };

  const handleRemove = async (episodeId: number) => {
    if (!playlist) return;
    await removeEpisodeFromPlaylist(playlist.id, episodeId);
    await refresh();
    setItems((prev) => prev.filter((item) => item.episode.id !== episodeId));
  };

  const handleMove = async (episodeId: number, direction: "up" | "down") => {
    if (!playlist) return;
    await moveEpisodeInPlaylist(playlist.id, episodeId, direction);
    await refresh();
  };

  if (!playlist) {
    return (
      <SafeAreaView className="flex-1 bg-bg-base items-center justify-center px-6">
        <Text className="text-text-secondary mb-4">Playlist not found</Text>
        <TouchableOpacity
          onPress={() => router.replace("/podcast/playlists")}
          className="px-4 py-2 rounded-lg bg-bg-surface border border-border-default"
        >
          <Text className="text-text-primary">Back to Playlists</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <View className="h-14 flex-row items-center px-4 border-b border-border-default bg-bg-surface">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2 mr-2"
        >
          <ChevronLeft size={24} color="#E0E0E0" />
        </TouchableOpacity>
        <Text className="text-text-primary font-bold flex-1" numberOfLines={1}>
          {playlist.name}
        </Text>
        <TouchableOpacity
          onPress={() => {
            setRenameValue(playlist.name);
            setRenameOpen(true);
          }}
          className="p-2"
        >
          <Pencil size={16} color="#A0A0A0" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#00FF94" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.episode.id.toString()}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Text className="text-text-muted">This playlist is empty.</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View className="bg-bg-surface border border-border-default rounded-xl p-3 mb-3 flex-row items-center">
              <Text className="text-text-muted text-xs font-mono w-6">
                {index + 1}
              </Text>
              <TouchableOpacity
                className="flex-1"
                onPress={() =>
                  router.push({
                    pathname: "/podcast/player",
                    params: { episodeId: item.episode.id.toString() },
                  })
                }
              >
                <Text className="text-text-primary text-sm" numberOfLines={2}>
                  {item.episode.title}
                </Text>
                <Text
                  className="text-text-muted text-xs mt-1"
                  numberOfLines={1}
                >
                  {item.feed.title}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleMove(item.episode.id, "up")}
                className="p-2"
              >
                <ArrowUp size={16} color="#A0A0A0" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleMove(item.episode.id, "down")}
                className="p-2"
              >
                <ArrowDown size={16} color="#A0A0A0" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleRemove(item.episode.id)}
                className="p-2"
              >
                <Trash2 size={16} color="#FF5A7A" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <Modal visible={renameOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="w-full bg-bg-surface border border-border-default rounded-2xl p-4">
            <Text className="text-text-primary font-bold mb-3">
              Rename Playlist
            </Text>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              className="bg-bg-base border border-border-default rounded-lg px-3 py-2 text-text-primary"
              placeholder="Playlist name"
              placeholderTextColor="#666"
            />
            <View className="flex-row gap-2 mt-3">
              <TouchableOpacity
                onPress={() => setRenameOpen(false)}
                className="flex-1 py-2 rounded-lg bg-bg-base border border-border-default items-center"
              >
                <Text className="text-text-secondary text-xs font-bold uppercase">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRename}
                className="flex-1 py-2 rounded-lg bg-accent-primary/10 border border-accent-primary/30 items-center"
              >
                <View className="flex-row items-center">
                  <Check size={14} color="#00FF94" />
                  <Text className="text-accent-primary text-xs font-bold uppercase ml-1">
                    Save
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
