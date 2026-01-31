import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ChevronLeft, CheckCircle, BookOpen } from "lucide-react-native";
import { useState, useEffect, useMemo } from "react";
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
  status?: string;
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

  const { completed: completedArticles, nonCompleted: nonCompletedArticles } =
    useMemo(() => {
      const completed: Article[] = [];
      const nonCompleted: Article[] = [];

      articles.forEach((a) => {
        if (a.status === "completed") {
          completed.push(a);
        } else {
          nonCompleted.push(a);
        }
      });

      return { completed, nonCompleted };
    }, [articles]);

  const sortedNonCompleted = useMemo(() => {
    return [...nonCompletedArticles].sort((a, b) => {
      const idxA = typeof a.index === "number" ? a.index : 0;
      const idxB = typeof b.index === "number" ? b.index : 0;
      return idxA - idxB;
    });
  }, [nonCompletedArticles]);

  const renderArticle = ({ item }: { item: Article }) => {
    const decodedFilename = decodeURIComponent(filename);
    const articleIndex =
      typeof item.index === "number"
        ? item.index
        : parseInt(item.index, 10) || 0;
    const sourceId = `epub:${decodedFilename}:${articleIndex}`;
    const displayTitle = item.title || `Article ${articleIndex + 1}`;

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
              {item.status === "completed" && (
                <View className="flex-row items-center">
                  <CheckCircle size={12} color="#00FF94" />
                  <Text className="text-accent-primary text-[10px] ml-1 font-mono">
                    COMPLETED
                  </Text>
                </View>
              )}
              {item.status === "in_progress" && (
                <View className="flex-row items-center">
                  <View className="w-2 h-2 rounded-full bg-accent-warning" />
                  <Text className="text-accent-warning text-[10px] ml-1 font-mono">
                    IN PROGRESS
                  </Text>
                </View>
              )}
              {item.status === "read" && (
                <View className="flex-row items-center">
                  <BookOpen size={12} color="#888888" />
                  <Text className="text-text-secondary text-[10px] ml-1 font-mono">
                    READ
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSection = (title: string, data: Article[]) => (
    <View className="mb-6">
      <View className="flex-row items-center mb-4">
        <CheckCircle
          size={14}
          color="#00FF94"
          style={{ display: title.includes("Completed") ? "flex" : "none" }}
        />
        <Text className="text-sm font-bold font-mono uppercase tracking-wider ml-2 text-text-muted">
          {title}
        </Text>
        <Text className="text-sm font-mono ml-2 text-text-secondary">
          ({data.length})
        </Text>
      </View>
      {data.length === 0 ? (
        <Text className="text-text-muted text-sm italic">No articles</Text>
      ) : (
        data.map((item) => (
          <TouchableOpacity
            key={item.source_id || `article-${item.index}`}
            className="bg-bg-surface p-4 rounded-xl border border-border-default mb-3 active:bg-bg-elevated"
            onPress={() => {
              const decodedFilename = decodeURIComponent(filename);
              const articleIndex =
                typeof item.index === "number"
                  ? item.index
                  : parseInt(item.index, 10) || 0;
              const sourceId = `epub:${decodedFilename}:${articleIndex}`;
              router.push(`/study/${encodeURIComponent(sourceId)}`);
            }}
          >
            <View className="flex-row justify-between items-start">
              <View className="flex-1 mr-4">
                <Text className="text-text-secondary text-xs font-mono mb-1">
                  {item.chapter || `Chapter ${item.index + 1}`}
                </Text>
                <Text
                  className="text-text-primary text-lg font-serif mb-2"
                  numberOfLines={2}
                >
                  {item.title || `Article ${item.index + 1}`}
                </Text>
                <View className="flex-row items-center space-x-3">
                  <View className="bg-bg-base px-2 py-0.5 rounded border border-border">
                    <Text className="text-text-muted text-[10px] font-mono">
                      {item.sentence_count} sentences
                    </Text>
                  </View>
                  {item.status === "completed" && (
                    <View className="flex-row items-center">
                      <CheckCircle size={12} color="#00FF94" />
                      <Text className="text-accent-primary text-[10px] ml-1 font-mono">
                        COMPLETED
                      </Text>
                    </View>
                  )}
                  {item.status === "in_progress" && (
                    <View className="flex-row items-center">
                      <View className="w-2 h-2 rounded-full bg-accent-warning" />
                      <Text className="text-accent-warning text-[10px] ml-1 font-mono">
                        IN PROGRESS
                      </Text>
                    </View>
                  )}
                  {item.status === "read" && (
                    <View className="flex-row items-center">
                      <BookOpen size={12} color="#888888" />
                      <Text className="text-text-secondary text-[10px] ml-1 font-mono">
                        READ
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

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

        {articles.length === 0 ? (
          <View className="items-center py-20">
            <BookOpen size={48} color="#444444" />
            <Text className="text-text-muted mt-4">No articles found</Text>
          </View>
        ) : (
          <FlatList
            data={[]}
            renderItem={null}
            keyExtractor={() => "dummy"}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListHeaderComponent={
              <View>
                {sortedNonCompleted.length > 0 &&
                  renderSection("01. To Read", sortedNonCompleted)}
                {completedArticles.length > 0 &&
                  renderSection(
                    `${sortedNonCompleted.length > 0 ? "02." : "01."} Completed`,
                    completedArticles,
                  )}
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
