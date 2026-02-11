import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { podcastApi } from "@nce/api";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Download,
  CheckCircle,
} from "lucide-react-native";
import { formatDuration } from "@nce/shared";
import {
  usePodcastStore,
  selectCurrentEpisode,
  selectIsPlaying,
  selectProgress,
  useDownloadStore,
} from "@nce/store";
import { audioService } from "../../src/services/AudioService";
import { downloadService } from "../../src/services/DownloadService";

export default function PodcastPlayerScreen() {
  const { episodeId } = useLocalSearchParams<{ episodeId: string }>();
  const router = useRouter();
  const id = parseInt(episodeId, 10);

  // Guard against invalid ID
  if (!episodeId || isNaN(id)) {
    return (
      <SafeAreaView className="flex-1 bg-bg-base items-center justify-center px-4">
        <Text className="text-accent-danger text-center mb-4">
          Invalid episode ID
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-bg-surface px-6 py-3 rounded-xl"
        >
          <Text className="text-text-primary">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Fetch Episode Details (ensure we have full data)
  const {
    data: episode,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["podcast", "episode", id],
    queryFn: () => podcastApi.getEpisode(id),
    enabled: true, // Always enabled since we validated ID above
  });

  // Global State
  const currentEpisode = usePodcastStore(selectCurrentEpisode);
  const isPlaying = usePodcastStore(selectIsPlaying);
  const { position, duration } = usePodcastStore(selectProgress);
  const isBuffering = usePodcastStore((state) => state.isBuffering);

  // Download State
  const download = useDownloadStore((state) => state.downloads[id]);
  const activeDownload = useDownloadStore((state) => state.activeDownloads[id]);

  // Display Episode: Prefer podcast store > downloaded episode > fetched from API
  const displayEpisode =
    currentEpisode?.id === id ? currentEpisode : download?.episode || episode;

  // Initialize Audio if needed
  useEffect(() => {
    // Use displayEpisode which includes download.episode fallback
    if (!displayEpisode) return;

    // If no episode playing, or playing different episode, start this one
    if (!currentEpisode || currentEpisode.id !== displayEpisode.id) {
      audioService.playEpisode(displayEpisode);
    }
  }, [displayEpisode, currentEpisode]);

  const togglePlay = async () => {
    if (isPlaying) {
      await audioService.pause();
    } else {
      await audioService.resume();
    }
  };

  const seek = async (millis: number) => {
    await audioService.seek(millis);
  };

  const handleDownload = () => {
    if (download) {
      downloadService.deleteDownload(id);
    } else if (displayEpisode) {
      downloadService.downloadEpisode(displayEpisode);
    }
  };

  if (isLoading && !displayEpisode) {
    return (
      <View className="flex-1 bg-bg-base justify-center items-center">
        <ActivityIndicator color="#00FF94" size="large" />
      </View>
    );
  }

  if (!displayEpisode) return null;

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      {/* Header */}
      <View className="p-4 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronDown color="#E0E0E0" size={30} />
        </TouchableOpacity>
        <Text className="text-text-muted text-xs font-bold tracking-widest">
          NOW PLAYING
        </Text>
        <TouchableOpacity onPress={handleDownload}>
          {download ? (
            <CheckCircle color="#00FF94" size={24} />
          ) : activeDownload ? (
            <ActivityIndicator size="small" color="#00FF94" />
          ) : (
            <Download color="#E0E0E0" size={24} />
          )}
        </TouchableOpacity>
      </View>

      <View className="flex-1 justify-center items-center px-8">
        {/* Artwork */}
        <View className="w-72 h-72 rounded-2xl bg-bg-surface border border-border-default shadow-xl mb-10 overflow-hidden">
          <Image
            source={{
              uri:
                displayEpisode.image_url || "https://via.placeholder.com/300",
            }}
            className="w-full h-full"
          />
        </View>

        {/* Info */}
        <View className="w-full mb-8">
          <Text
            className="text-text-primary text-2xl font-bold font-serif text-center mb-2"
            numberOfLines={2}
          >
            {displayEpisode.title}
          </Text>
          <Text
            className="text-text-secondary text-sm text-center"
            numberOfLines={1}
          >
            Podcast Episode
          </Text>
        </View>

        {/* Progress */}
        <View className="w-full mb-10">
          <View className="h-1 bg-bg-elevated rounded-full mb-2 overflow-hidden">
            <View
              className="h-full bg-accent-primary"
              style={{ width: `${progressPercent}%` }}
            />
          </View>
          <View className="flex-row justify-between">
            <Text className="text-text-muted text-xs font-mono">
              {formatDuration(position / 60000)}
            </Text>
            <Text className="text-text-muted text-xs font-mono">
              {formatDuration((duration - position) / 60000)}
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View className="flex-row items-center justify-between w-full px-4">
          <TouchableOpacity onPress={() => seek(position - 15000)}>
            <SkipBack color="#E0E0E0" size={32} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={togglePlay}
            className="w-20 h-20 bg-accent-primary rounded-full items-center justify-center shadow-lg shadow-accent-primary/50"
          >
            {isBuffering ? (
              <ActivityIndicator color="#000" />
            ) : isPlaying ? (
              <Pause color="#000" size={32} fill="#000" />
            ) : (
              <Play color="#000" size={32} fill="#000" className="ml-1" />
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => seek(position + 30000)}>
            <SkipForward color="#E0E0E0" size={32} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
