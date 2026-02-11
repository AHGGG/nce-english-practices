import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDownloadStore } from "@nce/store";
import { downloadService } from "../../src/services/DownloadService";
import { useRouter } from "expo-router";
import {
  Trash2,
  PlayCircle,
  ChevronLeft,
  XCircle,
  Download,
  RefreshCw,
  Pause,
} from "lucide-react-native";
import { formatDuration } from "@nce/shared";

export default function DownloadsScreen() {
  const router = useRouter();
  const downloads = useDownloadStore((state) => Object.values(state.downloads));
  const activeDownloads = useDownloadStore((state) =>
    Object.values(state.activeDownloads),
  );

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

  const handleCancelDownload = async (episodeId: number) => {
    await downloadService.cancelDownload(episodeId);
  };

  const handleRetryDownload = async (episodeId: number) => {
    await downloadService.retryDownload(episodeId);
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

      {/* Active Downloads Section */}
      {activeDownloads.length > 0 && (
        <View className="px-4 pt-4">
          <Text className="text-text-muted text-xs font-bold uppercase tracking-wider mb-3">
            In Progress
          </Text>
          {activeDownloads.map((item) => (
            <View
              key={item.episodeId}
              className={`flex-row items-center bg-bg-surface p-3 rounded-lg mb-3 border ${
                item.status === "error"
                  ? "border-accent-danger/30"
                  : item.status === "paused"
                    ? "border-accent-warning/30"
                    : "border-accent-primary/30"
              }`}
            >
              <View className="w-12 h-12 rounded bg-bg-elevated mr-3 items-center justify-center">
                {item.status === "downloading" ? (
                  <Download color="#00FF94" size={20} />
                ) : item.status === "paused" ? (
                  <Pause color="#F59E0B" size={20} />
                ) : (
                  <XCircle color="#FF4444" size={20} />
                )}
              </View>

              <View className="flex-1 mr-2">
                <Text
                  className="text-text-primary font-bold text-sm"
                  numberOfLines={1}
                >
                  {item.episode?.title || `Episode ${item.episodeId}`}
                </Text>
                <View className="flex-row items-center mt-1">
                  {item.status === "downloading" ? (
                    <>
                      <View className="flex-1 h-1.5 bg-bg-elevated rounded-full mr-2 overflow-hidden">
                        <View
                          className="h-full bg-accent-primary rounded-full"
                          style={{ width: `${(item.progress || 0) * 100}%` }}
                        />
                      </View>
                      <Text className="text-accent-primary text-xs font-mono">
                        {Math.round((item.progress || 0) * 100)}%
                      </Text>
                    </>
                  ) : item.status === "error" ? (
                    <Text className="text-accent-danger text-xs">
                      {item.error || "Download failed"}
                    </Text>
                  ) : item.status === "paused" ? (
                    <Text className="text-accent-warning text-xs">
                      {item.error || "Paused"} - Tap retry to resume
                    </Text>
                  ) : (
                    <Text className="text-text-muted text-xs capitalize">
                      {item.status}
                    </Text>
                  )}
                </View>
              </View>

              {/* Retry button for paused/error */}
              {(item.status === "paused" || item.status === "error") && (
                <TouchableOpacity
                  onPress={() => handleRetryDownload(item.episodeId)}
                  className="mr-2"
                >
                  <RefreshCw color="#00FF94" size={22} />
                </TouchableOpacity>
              )}

              {/* Cancel/Remove button */}
              <TouchableOpacity
                onPress={() => handleCancelDownload(item.episodeId)}
              >
                <XCircle color="#FF4444" size={24} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Completed Downloads Section */}
      {(sortedDownloads.length > 0 || activeDownloads.length === 0) && (
        <View className="flex-1">
          {activeDownloads.length > 0 && sortedDownloads.length > 0 && (
            <Text className="text-text-muted text-xs font-bold uppercase tracking-wider px-4 pt-4 mb-3">
              Completed
            </Text>
          )}
          <FlatList
            data={sortedDownloads}
            keyExtractor={(item) => item.episode.id.toString()}
            contentContainerStyle={{
              padding: 16,
              paddingTop: activeDownloads.length > 0 ? 0 : 16,
            }}
            ListEmptyComponent={
              activeDownloads.length === 0 ? (
                <View className="mt-20 items-center">
                  <Text className="text-text-muted">
                    No downloaded episodes
                  </Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <View className="flex-row items-center bg-bg-surface p-3 rounded-lg mb-3 border border-border-default">
                <Image
                  source={{
                    uri:
                      item.episode.image_url ||
                      "https://via.placeholder.com/50",
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
        </View>
      )}
    </SafeAreaView>
  );
}
