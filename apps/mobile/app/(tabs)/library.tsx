import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useArticleList } from "@nce/shared";
import { BookOpen, CheckCircle } from "lucide-react-native";
import { useRouter } from "expo-router";

export default function LibraryScreen() {
  const { articles, isLoading } = useArticleList();
  const router = useRouter();

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      className="bg-bg-surface p-4 rounded-xl border border-border mb-3 active:bg-bg-elevated"
      onPress={() => router.push(`/reading/${item.id}`)}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 mr-4">
          <Text className="text-text-secondary text-xs font-mono mb-1">
            {item.book_title} • {item.chapter}
          </Text>
          <Text className="text-text-primary text-lg font-serif mb-2" numberOfLines={2}>
            {item.title}
          </Text>
          <View className="flex-row items-center space-x-3">
             <View className="bg-bg-base px-2 py-0.5 rounded text-xs border border-border">
                <Text className="text-text-muted text-[10px] font-mono">{item.word_count} words</Text>
             </View>
             {item.is_read && (
                 <View className="flex-row items-center">
                    <CheckCircle size={12} color="#00FF94" />
                    <Text className="text-accent-primary text-[10px] ml-1 font-mono">READ</Text>
                 </View>
             )}
          </View>
        </View>
        
        {/* Difficulty Badge (Placeholder) */}
        <View className={`w-2 h-full rounded-full bg-accent-${item.difficulty > 3 ? 'danger' : 'primary'}/20`} />
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-bg-base">
        <ActivityIndicator color="#00FF94" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-base" edges={['top']}>
      <View className="flex-1 px-4 pt-4">
        <View className="flex-row items-center justify-between mb-6">
            <Text className="text-text-primary text-2xl font-bold font-sans">Library</Text>
            <TouchableOpacity className="bg-bg-surface p-2 rounded-full border border-border">
                <BookOpen size={20} color="#E0E0E0" />
            </TouchableOpacity>
        </View>

        <FlatList
          data={articles}
          renderItem={renderItem}
          keyExtractor={(item) => item.source_id || item.id || `article-${Math.random()}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="items-center py-20">
                <Text className="text-text-muted">No articles found.</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
