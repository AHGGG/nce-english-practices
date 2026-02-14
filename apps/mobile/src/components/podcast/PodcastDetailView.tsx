import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { FeedDetailResponse, PodcastEpisode } from "@nce/api";
import {
  PlayCircle,
  Plus,
  Check,
  Clock,
  Download,
  CheckCircle,
} from "lucide-react-native";
import { formatDuration } from "@nce/shared";
import { useDownloadStore } from "@nce/store";
import { downloadService } from "../../services/DownloadService";

interface Props {
  data: FeedDetailResponse;
  onSubscribe?: () => void;
  onUnsubscribe?: () => void;
  isSubscribing?: boolean;
  onPlayEpisode: (episode: PodcastEpisode) => void;
  onIntensiveEpisode?: (episode: PodcastEpisode) => void;
}

const DownloadButton = ({ episode }: { episode: PodcastEpisode }) => {
  const download = useDownloadStore((s) => s.downloads[episode.id]);
  const active = useDownloadStore((s) => s.activeDownloads[episode.id]);

  if (download) {
    return (
      <TouchableOpacity
        onPress={() => downloadService.deleteDownload(episode.id)}
        className="p-2"
      >
        <CheckCircle size={20} color="#00FF94" />
      </TouchableOpacity>
    );
  }

  if (active) {
    return (
      <View className="flex-row items-center p-2">
        <ActivityIndicator size="small" color="#00FF94" />
        <Text className="text-text-muted text-[10px] ml-1">
          {Math.round(active.progress * 100)}%
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => downloadService.downloadEpisode(episode)}
      className="p-2"
    >
      <Download size={20} color="#666" />
    </TouchableOpacity>
  );
};

export const PodcastDetailView = ({
  data,
  onSubscribe,
  onUnsubscribe,
  isSubscribing,
  onPlayEpisode,
  onIntensiveEpisode,
}: Props) => {
  const { feed, episodes, is_subscribed } = data;

  const renderHeader = () => (
    <View className="p-6 pb-2">
      <View className="flex-row mb-6">
        <Image
          source={{ uri: feed.image_url || "https://via.placeholder.com/150" }}
          className="w-32 h-32 rounded-xl border border-border-default bg-bg-surface"
        />
        <View className="flex-1 ml-4 justify-center">
          <Text
            className="text-text-primary text-xl font-bold font-serif mb-2"
            numberOfLines={2}
          >
            {feed.title}
          </Text>
          <Text className="text-text-secondary text-sm mb-4" numberOfLines={1}>
            {feed.author}
          </Text>

          {onSubscribe && (
            <TouchableOpacity
              onPress={is_subscribed ? onUnsubscribe : onSubscribe}
              disabled={isSubscribing}
              className={`flex-row items-center justify-center py-2 px-4 rounded-full border ${
                is_subscribed
                  ? "bg-transparent border-border-default"
                  : "bg-accent-primary border-accent-primary"
              }`}
            >
              {isSubscribing ? (
                <ActivityIndicator
                  size="small"
                  color={is_subscribed ? "#FFF" : "#000"}
                />
              ) : is_subscribed ? (
                <>
                  <Check size={16} color="#A0A0A0" />
                  <Text className="text-text-muted text-xs font-bold ml-2">
                    SUBSCRIBED
                  </Text>
                </>
              ) : (
                <>
                  <Plus size={16} color="#000" />
                  <Text className="text-bg-base text-xs font-bold ml-2">
                    SUBSCRIBE
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text
        className="text-text-secondary text-sm leading-relaxed mb-6"
        numberOfLines={3}
      >
        {feed.description?.replace(/<[^>]*>/g, "")}
      </Text>

      <Text className="text-text-primary font-bold uppercase text-xs tracking-wider mb-2">
        Episodes ({episodes.length})
      </Text>
    </View>
  );

  return (
    <FlatList
      data={episodes}
      keyExtractor={(item) => item.guid}
      ListHeaderComponent={renderHeader}
      renderItem={({ item }) => (
        <TouchableOpacity
          className="px-6 py-4 border-b border-border-subtle active:bg-bg-surface"
          onPress={() => onPlayEpisode(item)}
        >
          <Text className="text-text-muted text-[10px] mb-1 font-mono">
            {new Date(item.published_at || "").toLocaleDateString()} •{" "}
            {formatDuration((item.duration_seconds || 0) / 60)}
          </Text>
          <Text
            className="text-text-primary font-medium text-base mb-1"
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text className="text-text-secondary text-xs mb-3" numberOfLines={2}>
            {item.description?.replace(/<[^>]*>/g, "")}
          </Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="bg-bg-elevated rounded-full p-1 mr-2">
                <PlayCircle size={16} color="#00FF94" />
              </View>
              <Text className="text-accent-primary text-xs font-bold">
                PLAY
              </Text>

              {onIntensiveEpisode && (
                <TouchableOpacity
                  className="ml-3 px-2 py-1 border border-accent-info/40 rounded"
                  onPress={(e) => {
                    e.stopPropagation();
                    onIntensiveEpisode(item);
                  }}
                >
                  <Text className="text-accent-info text-[10px] font-bold">
                    INTENSIVE
                  </Text>
                </TouchableOpacity>
              )}

              {item.current_position > 0 && (
                <View className="ml-4 flex-row items-center">
                  <Clock size={12} color="#F59E0B" />
                  <Text className="text-accent-warning text-[10px] ml-1">
                    RESUME {Math.round(item.current_position / 60)}m
                  </Text>
                </View>
              )}
            </View>
            <DownloadButton episode={item} />
          </View>
        </TouchableOpacity>
      )}
    />
  );
};
