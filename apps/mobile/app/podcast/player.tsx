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
import { Audio } from "expo-av";
import { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
} from "lucide-react-native";
import { formatDuration } from "@nce/shared";

export default function PodcastPlayerScreen() {
  const { episodeId } = useLocalSearchParams<{ episodeId: string }>();
  const router = useRouter();
  const id = parseInt(episodeId, 10);

  // Fetch Episode
  const { data: episode, isLoading } = useQuery({
    queryKey: ["podcast", "episode", id],
    queryFn: () => podcastApi.getEpisode(id),
    enabled: !!id,
  });

  // Audio State
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);

  // Initialize Audio
  useEffect(() => {
    if (!episode) return;

    const initAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });

        // Start Session
        const session = await podcastApi.session.start(id);
        setSessionId(session.session_id);

        // Create Sound
        const { sound } = await Audio.Sound.createAsync(
          { uri: episode.audio_url },
          {
            shouldPlay: true,
            positionMillis: (episode.current_position || 0) * 1000,
          },
          onPlaybackStatusUpdate,
        );
        soundRef.current = sound;
        setIsPlaying(true);
      } catch (e) {
        console.error("Audio init failed", e);
      }
    };

    initAudio();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      // End session? Handled by periodically updating or backend timeout?
      // Better to explicit end on unmount if playing?
    };
  }, [episode]);

  // Sync Progress & Session Heartbeat
  useEffect(() => {
    if (!sessionId || !isPlaying) return;

    const interval = setInterval(() => {
      podcastApi.session.update(sessionId, 10, position / 1000); // +10s listened (approx)
    }, 10000);

    return () => clearInterval(interval);
  }, [sessionId, isPlaying, position]);

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 1);
      setIsBuffering(status.isBuffering);
      setIsPlaying(status.isPlaying);

      if (status.didJustFinish) {
        setIsPlaying(false);
        if (sessionId) {
          podcastApi.session.end(
            sessionId,
            0,
            status.positionMillis / 1000,
            true,
          );
        }
      }
    }
  };

  const togglePlay = async () => {
    if (!soundRef.current) return;
    if (isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  };

  const seek = async (millis: number) => {
    if (!soundRef.current) return;
    await soundRef.current.setPositionAsync(millis);
  };

  if (isLoading || !episode) {
    return (
      <View className="flex-1 bg-bg-base justify-center items-center">
        <ActivityIndicator color="#00FF94" size="large" />
      </View>
    );
  }

  const progressPercent = (position / duration) * 100;

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
              uri: episode.image_url || "https://via.placeholder.com/300",
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
            {episode.title}
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
