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
} from "lucide-react-native";
import { formatDuration } from "@nce/shared";
import {
  usePodcastStore,
  selectCurrentEpisode,
  selectIsPlaying,
  selectProgress,
} from "@nce/store";
import { audioService } from "../../src/services/AudioService";

export default function PodcastPlayerScreen() {
  const { episodeId } = useLocalSearchParams<{ episodeId: string }>();
  const router = useRouter();
  const id = parseInt(episodeId, 10);

  // Fetch Episode Details (ensure we have full data)
  const { data: episode, isLoading } = useQuery({
    queryKey: ["podcast", "episode", id],
    queryFn: () => podcastApi.getEpisode(id),
    enabled: !!id,
  });

  // Global State
  const currentEpisode = usePodcastStore(selectCurrentEpisode);
  const isPlaying = usePodcastStore(selectIsPlaying);
  const { position, duration } = usePodcastStore(selectProgress);
  const isBuffering = usePodcastStore((state) => state.isBuffering);

  // Display Episode (Prefer store if matching, else fetched)
  const displayEpisode = currentEpisode?.id === id ? currentEpisode : episode;

  // Initialize Audio if needed
  useEffect(() => {
    if (!episode) return;

    // If no episode playing, or playing different episode, start this one
    if (!currentEpisode || currentEpisode.id !== episode.id) {
      audioService.playEpisode(episode);
    }
  }, [episode, currentEpisode]);

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
        <View className="w-8" />
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
