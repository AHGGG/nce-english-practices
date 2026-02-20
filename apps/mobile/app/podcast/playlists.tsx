import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, Plus, ListMusic, Trash2, X } from "lucide-react-native";
import {
  createPlaylist,
  deletePlaylist,
  getPlaylists,
  type PodcastPlaylist,
} from "../../src/utils/podcastPlaylists";

export default function PodcastPlaylistsScreen() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<PodcastPlaylist[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PodcastPlaylist | null>(
    null,
  );

  const load = useCallback(async () => {
    const data = await getPlaylists();
    setPlaylists(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const playlist = await createPlaylist(trimmed);
    setName("");
    setCreateOpen(false);
    await load();
    router.push(`/podcast/playlist/${playlist.id}`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deletePlaylist(deleteTarget.id);
    setDeleteTarget(null);
    await load();
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <View className="h-14 flex-row items-center px-4 border-b border-border-default bg-bg-surface">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={24} color="#E0E0E0" />
        </TouchableOpacity>
        <Text className="text-text-primary font-bold ml-2 flex-1">
          Playlists
        </Text>
        <TouchableOpacity
          onPress={() => setCreateOpen(true)}
          className="px-3 py-1.5 rounded-lg bg-accent-primary/10 border border-accent-primary/30"
        >
          <View className="flex-row items-center">
            <Plus size={14} color="#00FF94" />
            <Text className="text-accent-primary text-xs font-bold ml-1">
              New
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ListEmptyComponent={
          <View className="items-center py-20">
            <ListMusic size={40} color="#666" />
            <Text className="text-text-muted mt-3">No playlists yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="bg-bg-surface border border-border-default rounded-xl p-4 mb-3 flex-row items-center">
            <TouchableOpacity
              className="flex-1"
              onPress={() => router.push(`/podcast/playlist/${item.id}`)}
            >
              <Text className="text-text-primary font-bold" numberOfLines={1}>
                {item.name}
              </Text>
              <Text className="text-text-muted text-xs mt-1">
                {item.items.length} episodes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="p-2"
              onPress={() => setDeleteTarget(item)}
            >
              <Trash2 size={16} color="#FF5A7A" />
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={createOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="w-full bg-bg-surface border border-border-default rounded-2xl p-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-text-primary font-bold">
                Create Playlist
              </Text>
              <TouchableOpacity onPress={() => setCreateOpen(false)}>
                <X size={18} color="#999" />
              </TouchableOpacity>
            </View>
            <TextInput
              value={name}
              onChangeText={setName}
              className="bg-bg-base border border-border-default rounded-lg px-3 py-2 text-text-primary"
              placeholder="Playlist name"
              placeholderTextColor="#666"
            />
            <TouchableOpacity
              onPress={handleCreate}
              className="mt-3 py-2 rounded-lg bg-accent-primary/10 border border-accent-primary/30 items-center"
            >
              <Text className="text-accent-primary text-xs font-bold uppercase">
                Create
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!deleteTarget} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="w-full bg-bg-surface border border-border-default rounded-2xl p-4">
            <Text className="text-text-primary font-bold mb-2">
              Delete Playlist
            </Text>
            <Text className="text-text-secondary text-sm">
              Delete "{deleteTarget?.name}"?
            </Text>
            <View className="flex-row gap-2 mt-4">
              <TouchableOpacity
                onPress={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-lg bg-bg-base border border-border-default items-center"
              >
                <Text className="text-text-secondary text-xs font-bold uppercase">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                className="flex-1 py-2 rounded-lg bg-accent-danger/10 border border-accent-danger/30 items-center"
              >
                <Text className="text-accent-danger text-xs font-bold uppercase">
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
