import { View, Text, FlatList, TouchableOpacity, Image, TextInput, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSubscriptions, useTrendingPodcasts, usePodcastSearch } from "@nce/shared";
import { Search, Mic, Download, Heart } from "lucide-react-native";
import { useState } from "react";
import { useRouter } from "expo-router";

const PodcastCard = ({ item, onPress, horizontal = false }: any) => {
  return (
    <TouchableOpacity 
      onPress={onPress}
      className={`bg-bg-surface rounded-xl border border-border-default overflow-hidden ${horizontal ? 'mr-4 w-32' : 'mb-3 flex-row'}`}
    >
      <Image 
        source={{ uri: item.artwork_url || item.image_url || 'https://via.placeholder.com/150' }} 
        className={horizontal ? "w-32 h-32" : "w-20 h-20"}
        resizeMode="cover"
      />
      <View className={`p-3 ${horizontal ? '' : 'flex-1 justify-center'}`}>
        <Text className="text-text-primary font-bold text-sm" numberOfLines={2}>
            {item.title}
        </Text>
        <Text className="text-text-secondary text-xs mt-1" numberOfLines={1}>
            {item.author}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default function PodcastScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { feeds: subscriptions, isLoading: subsLoading } = useSubscriptions();
  const { trending, isLoading: trendingLoading } = useTrendingPodcasts();
  const { results: searchResults, isLoading: searchLoading } = usePodcastSearch(searchQuery);

  const isSearching = searchQuery.length > 0;

  const handlePress = (item: any) => {
      // Navigate to detail
      // item.id might be missing for search results, use itunes_id or rss_url to resolve?
      // For now, assume subscribed items have IDs. Search results need a "preview" flow.
      if (item.id) {
          router.push(`/podcast/${item.id}`);
      } else if (item.rss_url) {
          // Preview flow - encode URL
          router.push(`/podcast/preview?rss_url=${encodeURIComponent(item.rss_url)}`);
      }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <View className="flex-1 px-4 pt-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
            <Text className="text-text-primary text-2xl font-bold font-serif">Podcasts</Text>
            <View className="flex-row">
              <TouchableOpacity 
                onPress={() => router.push("/podcast/downloads")}
                className="bg-bg-surface p-2 rounded-full border border-border-default mr-2"
              >
                  <Download size={20} color="#00FF94" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/podcast/favorites")}
                className="bg-bg-surface p-2 rounded-full border border-border-default mr-2"
              >
                  <Heart size={20} color="#FF5A7A" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/voice")}
                className="bg-bg-surface p-2 rounded-full border border-border-default"
              >
                  <Mic size={20} color="#00FF94" />
              </TouchableOpacity>
            </View>
        </View>

        {/* Search Bar */}
        <View className="bg-bg-surface border border-border-default rounded-xl flex-row items-center px-4 py-3 mb-6">
            <Search size={20} color="#666" />
            <TextInput 
                className="flex-1 ml-3 text-text-primary font-sans"
                placeholder="Search podcasts..."
                placeholderTextColor="#666"
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
        </View>

        {isSearching ? (
            <FlatList
                data={searchResults}
                keyExtractor={(item, index) =>
                  item.rss_url
                    ? `rss-${item.rss_url}`
                    : item.itunes_id
                      ? `itunes-${item.itunes_id}`
                      : `search-${item.title || "unknown"}-${index}`
                }
                renderItem={({ item }) => <PodcastCard item={item} onPress={() => handlePress(item)} />}
                ListEmptyComponent={
                    searchLoading ? (
                        <ActivityIndicator color="#00FF94" className="mt-10" />
                    ) : (
                        <Text className="text-text-muted text-center mt-10">No results found.</Text>
                    )
                }
            />
        ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Subscriptions */}
                {subscriptions.length > 0 && (
                    <View className="mb-8">
                        <Text className="text-text-primary font-bold mb-4 uppercase text-xs tracking-wider">My Subscriptions</Text>
                        <FlatList
                            horizontal
                            data={subscriptions}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => <PodcastCard item={item} horizontal onPress={() => handlePress(item)} />}
                            showsHorizontalScrollIndicator={false}
                        />
                    </View>
                )}

                {/* Trending */}
                <View className="mb-20">
                    <Text className="text-text-primary font-bold mb-4 uppercase text-xs tracking-wider">Trending Now</Text>
                    {trendingLoading ? (
                        <ActivityIndicator color="#00FF94" />
                    ) : (
                        trending.map((item) => (
                            <PodcastCard
                              key={item.rss_url || `trend-${item.itunes_id || item.title}`}
                              item={item}
                              onPress={() => handlePress(item)}
                            />
                        ))
                    )}
                </View>
            </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
