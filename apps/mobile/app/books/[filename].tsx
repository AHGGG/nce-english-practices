import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ChevronLeft, CheckCircle } from "lucide-react-native";
import { useState, useEffect } from "react";
import { sentenceStudyApi } from "@nce/api";

interface Article {
  source_id: string;
  title: string;
  book_title?: string;
  chapter?: string;
  index: number;
  word_count: number;
  sentence_count: number;
  last_read?: string;
  last_studied_at?: string;
  is_read?: boolean;
}

export default function ArticlesScreen() {
  const { filename } = useLocalSearchParams<{ filename: string }>();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadArticles = async () => {
      try {
        const data = await sentenceStudyApi.getArticles(
          decodeURIComponent(filename),
        );
        setArticles(data.articles || []);
      } catch (e) {
        console.error("Failed to load articles:", e);
      } finally {
        setLoading(false);
      }
    };
    loadArticles();
  }, [filename]);

  const renderArticle = ({ item }: { item: Article }) => {
    const decodedFilename = decodeURIComponent(filename);
    const articleIndex =
      typeof item.index === "number"
        ? item.index
        : parseInt(item.index, 10) || 0;
    const sourceId = `epub:${decodedFilename}:${articleIndex}`;
    const displayTitle = item.title || `Article ${articleIndex + 1}`;

    console.log(
      "[ArticlesScreen] Navigating to study with sourceId:",
      sourceId,
    );

    return (
      <TouchableOpacity
        className="bg-bg-surface p-4 rounded-xl border border-border-default mb-3 active:bg-bg-elevated"
        onPress={() => router.push(`/study/${encodeURIComponent(sourceId)}`)}
      >
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-4">
            <Text className="text-text-secondary text-xs font-mono mb-1">
              {item.chapter || `Chapter ${articleIndex + 1}`}
            </Text>
            <Text
              className="text-text-primary text-lg font-serif mb-2"
              numberOfLines={2}
            >
              {displayTitle}
            </Text>
            <View className="flex-row items-center space-x-3">
              <View className="bg-bg-base px-2 py-0.5 rounded border border-border">
                <Text className="text-text-muted text-[10px] font-mono">
                  {item.sentence_count} sentences
                </Text>
              </View>
              {item.is_read && (
                <View className="flex-row items-center">
                  <CheckCircle size={12} color="#00FF94" />
                  <Text className="text-accent-primary text-[10px] ml-1 font-mono">
                    DONE
                  </Text>
                </View>
              )}
              {item.last_studied_at && !item.is_read && (
                <Text className="text-text-muted text-[10px]">
                  Last: {new Date(item.last_studied_at).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-bg-base">
        <ActivityIndicator color="#00FF94" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <View className="flex-1 px-4 pt-4">
        <View className="flex-row items-center mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 -ml-2 mr-2"
          >
            <ChevronLeft size={24} color="#E0E0E0" />
          </TouchableOpacity>
          <Text
            className="text-text-primary text-xl font-bold font-sans"
            numberOfLines={1}
          >
            Articles
          </Text>
        </View>

        <FlatList
          data={articles}
          renderItem={renderArticle}
          keyExtractor={(item) => item.source_id || `article-${item.index}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Text className="text-text-muted">No articles found</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
