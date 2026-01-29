import { View, Text, FlatList, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDownloadStore } from "@nce/store";
import { downloadService } from "../../src/services/DownloadService";
import { useRouter } from "expo-router";
import { Trash2, PlayCircle, ChevronLeft } from "lucide-react-native";
import { formatDuration } from "@nce/shared";

export default function DownloadsScreen() {
  const router = useRouter();
  const downloads = useDownloadStore((state) => Object.values(state.downloads));

  // Sort by recent
  const sortedDownloads = downloads.sort(
    (a, b) => b.downloadedAt - a.downloadedAt,
  );

  const handlePlay = (episodeId: number) => {
    router.push({
      pathname: "/podcast/player",
      params: { episodeId: episodeId.toString() },
    });
  };

  const handleDelete = async (episodeId: number) => {
    await downloadService.deleteDownload(episodeId);
  };

  const formatSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <View className="p-4 flex-row items-center border-b border-border-default">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ChevronLeft color="#E0E0E0" size={24} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-text-primary">Downloads</Text>
      </View>

      <FlatList
        data={sortedDownloads}
        keyExtractor={(item) => item.episode.id.toString()}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View className="mt-20 items-center">
            <Text className="text-text-muted">No downloaded episodes</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="flex-row items-center bg-bg-surface p-3 rounded-lg mb-3 border border-border-default">
            <Image
              source={{
                uri: item.episode.image_url || "https://via.placeholder.com/50",
              }}
              className="w-12 h-12 rounded bg-bg-elevated mr-3"
            />

            <View className="flex-1 mr-2">
              <Text
                className="text-text-primary font-bold text-sm"
                numberOfLines={1}
              >
                {item.episode.title}
              </Text>
              <Text className="text-text-muted text-xs mt-1">
                {formatSize(item.size)} •{" "}
                {formatDuration((item.episode.duration_seconds || 0) / 60)}m
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => handlePlay(item.episode.id)}
              className="mr-3"
            >
              <PlayCircle color="#00FF94" size={28} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleDelete(item.episode.id)}>
              <Trash2 color="#FF4444" size={20} />
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
