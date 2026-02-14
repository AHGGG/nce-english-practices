import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Headphones, BookOpen } from "lucide-react-native";
import { audiobookApi, type AudiobookLibraryItem } from "@nce/api";

export default function AudiobookTabScreen() {
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ["audiobook", "library"],
    queryFn: () => audiobookApi.list(),
  });

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-bg-base">
        <ActivityIndicator color="#00FF94" size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-bg-base">
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-accent-danger text-center font-bold mb-2">
            Failed to load audiobooks
          </Text>
          <Text className="text-text-muted text-center text-sm">
            Please check server connection and try again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const books = data || [];

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <View className="flex-1 px-4 pt-4">
        <Text className="text-text-primary text-2xl font-bold font-serif mb-6">
          Audiobooks
        </Text>

        <FlatList
          data={books}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
          renderItem={({ item }: { item: AudiobookLibraryItem }) => (
            <TouchableOpacity
              className="bg-bg-surface p-4 rounded-xl border border-border-default mb-3"
              onPress={() =>
                router.push(`/audiobook/${encodeURIComponent(item.id)}`)
              }
            >
              <View className="flex-row items-start">
                <View className="w-12 h-12 rounded-xl bg-accent-primary/15 items-center justify-center mr-3">
                  <Headphones size={20} color="#00FF94" />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-text-primary text-base font-bold"
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  {!!item.author && (
                    <Text className="text-text-muted text-xs mt-1">
                      by {item.author}
                    </Text>
                  )}
                  <View className="flex-row mt-2">
                    {!!item.has_subtitles && (
                      <View className="bg-accent-info/20 px-2 py-1 rounded-full mr-2">
                        <Text className="text-accent-info text-[10px] font-bold">
                          SUBTITLES
                        </Text>
                      </View>
                    )}
                    {(item.track_count || 0) > 1 && (
                      <View className="bg-accent-primary/20 px-2 py-1 rounded-full">
                        <Text className="text-accent-primary text-[10px] font-bold">
                          {item.track_count} TRACKS
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="items-center py-20">
              <BookOpen size={48} color="#444444" />
              <Text className="text-text-muted mt-4">No audiobooks found</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
