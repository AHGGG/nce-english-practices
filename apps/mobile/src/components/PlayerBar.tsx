import { View, Text, TouchableOpacity, Image, Pressable } from "react-native";
import { useRouter, usePathname } from "expo-router";
import {
  usePodcastStore,
  selectCurrentEpisode,
  selectIsPlaying,
} from "@nce/store";
import { Play, Pause, X } from "lucide-react-native";
import { audioService } from "../services/AudioService";

export default function PlayerBar() {
  const router = useRouter();
  const pathname = usePathname();
  const currentEpisode = usePodcastStore(selectCurrentEpisode);
  const isPlaying = usePodcastStore(selectIsPlaying);

  // Hide on player screen and auth screens
  const isHidden =
    pathname.includes("/podcast/player") ||
    pathname.includes("/podcast/intensive") ||
    pathname.includes("/auth/");

  if (!currentEpisode || isHidden) return null;

  const handlePress = () => {
    router.push({
      pathname: "/podcast/player",
      params: { episodeId: currentEpisode.id.toString() },
    });
  };

  const togglePlay = async (e: any) => {
    e.stopPropagation();
    if (isPlaying) {
      await audioService.pause();
    } else {
      await audioService.resume();
    }
  };

  const closePlayer = async (e: any) => {
    e.stopPropagation();
    await audioService.unload();
    usePodcastStore.getState().reset();
  };

  // Adjust bottom position based on if we are likely showing a tab bar
  // Routes inside (tabs) usually show tab bar
  // Note: pathname often doesn't include group name in Expo Router v3, check your version behavior
  // Assuming standard tabs are: /library, /podcast, /, /voice, /stats
  const isTabScreen =
    [
      "/library",
      "/dictionary",
      "/podcast",
      "/audiobook",
      "/",
      "/voice",
      "/stats",
    ].includes(pathname) || pathname.startsWith("/(tabs)");

  const bottomClass = isTabScreen ? "bottom-[85px]" : "bottom-6";

  return (
    <View className={`absolute ${bottomClass} left-0 right-0 px-3 z-50`}>
      <Pressable
        onPress={handlePress}
        className="bg-zinc-900 border border-border-default rounded-xl p-2 flex-row items-center shadow-lg shadow-black/50"
      >
        <Image
          source={{
            uri: currentEpisode.image_url || "https://via.placeholder.com/50",
          }}
          className="w-10 h-10 rounded-md bg-bg-surface mr-3"
        />

        <View className="flex-1 mr-2">
          <Text
            className="text-text-primary text-xs font-bold font-sans"
            numberOfLines={1}
          >
            {currentEpisode.title}
          </Text>
          <Text
            className="text-accent-primary text-[10px] font-mono"
            numberOfLines={1}
          >
            {isPlaying ? "Playing" : "Paused"} •{" "}
            {Math.floor(
              currentEpisode.duration_seconds
                ? currentEpisode.duration_seconds / 60
                : 0,
            )}
            m
          </Text>
        </View>

        <TouchableOpacity
          onPress={togglePlay}
          className="w-8 h-8 rounded-full bg-accent-primary items-center justify-center mr-2"
        >
          {isPlaying ? (
            <Pause size={16} color="black" fill="black" />
          ) : (
            <Play size={16} color="black" fill="black" className="ml-0.5" />
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={closePlayer} className="p-1">
          <X size={16} color="#666" />
        </TouchableOpacity>
      </Pressable>
    </View>
  );
}
