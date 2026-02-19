import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  BookOpen,
  CheckCircle,
  ChevronDown,
  Settings,
  X,
} from "lucide-react-native";
import { sentenceStudyApi } from "@nce/api";

type ArticleStatus = "completed" | "in_progress" | "read" | "new";

interface BookItem {
  id?: string;
  filename?: string;
  title: string;
  article_count?: number;
}

interface ArticleItem {
  source_id?: string;
  title: string;
  chapter?: string;
  index?: number | string;
  word_count?: number;
  sentence_count?: number;
  status?: ArticleStatus;
  difficulty?: number;
}

interface UnifiedArticleListMobileProps {
  title: string;
  emptyText: string;
  showSettings?: boolean;
  metricType: "words" | "sentences";
  onSettingsPress?: () => void;
  onArticlePress: (sourceId: string) => void;
}

export default function UnifiedArticleListMobile({
  title,
  emptyText,
  showSettings = false,
  metricType,
  onSettingsPress,
  onArticlePress,
}: UnifiedArticleListMobileProps) {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [isLoadingArticles, setIsLoadingArticles] = useState(false);
  const [isBookModalVisible, setIsBookModalVisible] = useState(false);

  useEffect(() => {
    const loadBooks = async () => {
      try {
        const data = await sentenceStudyApi.getBooks();
        const items = (data.items || data.books || []) as BookItem[];
        setBooks(items);
        if (items.length > 0) {
          setSelectedBookId(items[0].id || items[0].filename || null);
        }
      } catch (error) {
        console.error("Failed to load books:", error);
      } finally {
        setIsLoadingBooks(false);
      }
    };
    void loadBooks();
  }, []);

  useEffect(() => {
    if (!selectedBookId) {
      setArticles([]);
      return;
    }

    const loadArticles = async () => {
      setIsLoadingArticles(true);
      try {
        const data = await sentenceStudyApi.getArticles(selectedBookId);
        setArticles((data.units || data.articles || []) as ArticleItem[]);
      } catch (error) {
        console.error("Failed to load articles:", error);
        setArticles([]);
      } finally {
        setIsLoadingArticles(false);
      }
    };
    void loadArticles();
  }, [selectedBookId]);

  const currentBook = useMemo(
    () => books.find((book) => (book.id || book.filename) === selectedBookId),
    [books, selectedBookId],
  );

  const { completedArticles, nonCompletedArticles } = useMemo(() => {
    const completed: ArticleItem[] = [];
    const nonCompleted: ArticleItem[] = [];
    articles.forEach((article) => {
      if (article.status === "completed") {
        completed.push(article);
      } else {
        nonCompleted.push(article);
      }
    });

    const sortByIndex = (a: ArticleItem, b: ArticleItem) => {
      const idxA = Number(a.index);
      const idxB = Number(b.index);
      return idxA - idxB;
    };

    return {
      completedArticles: completed.sort(sortByIndex),
      nonCompletedArticles: nonCompleted.sort(sortByIndex),
    };
  }, [articles]);

  const resolveSourceId = (item: ArticleItem) => {
    if (item.source_id) return item.source_id;
    const idx = Number(item.index);
    if (!selectedBookId || !Number.isFinite(idx)) return null;
    return `epub:${selectedBookId}:${idx}`;
  };

  const metricLabel = (item: ArticleItem) => {
    if (metricType === "sentences") {
      return `${item.sentence_count || 0} sentences`;
    }
    const sentenceCount = Number(item.sentence_count || 0);
    const wordCount = Number(item.word_count || 0);
    const resolvedWordCount = wordCount > 0 ? wordCount : sentenceCount * 15;
    return `${sentenceCount} sentences · ${resolvedWordCount} words`;
  };

  const renderSection = (sectionTitle: string, data: ArticleItem[]) => (
    <View className="mb-6">
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <CheckCircle
            size={14}
            color="#00FF94"
            style={{
              display: sectionTitle.includes("Completed") ? "flex" : "none",
            }}
          />
          <Text className="text-sm font-bold font-mono uppercase tracking-wider ml-2 text-text-muted">
            {sectionTitle}
          </Text>
        </View>
        <Text className="text-sm font-mono text-text-secondary">
          {data.length}
        </Text>
      </View>

      {data.length === 0 ? (
        <Text className="text-text-muted text-sm italic">No articles</Text>
      ) : (
        data.map((item) => {
          const sourceId = resolveSourceId(item);
          if (!sourceId) return null;
          return (
            <TouchableOpacity
              key={sourceId}
              className="bg-bg-surface p-4 rounded-xl border border-border mb-3 active:bg-bg-elevated"
              onPress={() => onArticlePress(sourceId)}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1 mr-4">
                  <Text className="text-text-secondary text-xs font-mono mb-1">
                    {item.chapter ||
                      `Chapter ${(Number(item.index) + 1).toString().padStart(2, "0")}`}
                  </Text>
                  <Text
                    className="text-text-primary text-lg font-serif mb-2"
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  <View className="flex-row items-center space-x-3">
                    <View className="bg-bg-base px-2 py-0.5 rounded border border-border">
                      <Text className="text-text-muted text-[10px] font-mono">
                        {metricLabel(item)}
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
                <View
                  className="w-2 h-full rounded-full"
                  style={{
                    backgroundColor:
                      (item.difficulty || 0) > 3
                        ? "rgb(var(--color-accent-danger))"
                        : "rgb(var(--color-accent-primary))",
                    opacity: 0.2,
                  }}
                />
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );

  if (isLoadingBooks || isLoadingArticles) {
    return (
      <View className="flex-1 justify-center items-center bg-bg-base">
        <ActivityIndicator color="#00FF94" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <View className="flex-1 px-4 pt-4">
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-1">
            <Text className="text-text-primary text-2xl font-bold font-sans">
              {title}
            </Text>
            <TouchableOpacity
              className="flex-row items-center mt-1"
              onPress={() => setIsBookModalVisible(true)}
            >
              <Text className="text-text-muted text-sm">
                {currentBook?.title || "Select Book"}
              </Text>
              <ChevronDown
                size={16}
                color="#666666"
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
          </View>
          {showSettings && onSettingsPress && (
            <TouchableOpacity
              className="bg-bg-surface p-2 rounded-full border border-border"
              onPress={onSettingsPress}
            >
              <Settings size={20} color="#E0E0E0" />
            </TouchableOpacity>
          )}
        </View>

        {articles.length === 0 ? (
          <View className="items-center py-20">
            <BookOpen size={48} color="#444444" />
            <Text className="text-text-muted mt-4">{emptyText}</Text>
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
                {nonCompletedArticles.length > 0 &&
                  renderSection("01. To Read", nonCompletedArticles)}
                {completedArticles.length > 0 &&
                  renderSection(
                    `${nonCompletedArticles.length > 0 ? "02." : "01."} Completed`,
                    completedArticles,
                  )}
              </View>
            }
          />
        )}
      </View>

      <Modal
        visible={isBookModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsBookModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <View
            style={{
              backgroundColor: "#0a0f0d",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              width: "100%",
              borderTopWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.08)",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: "#e8f5e9",
                  fontSize: 20,
                  fontWeight: "bold",
                  fontFamily: "sans-serif",
                }}
              >
                Select Book
              </Text>
              <TouchableOpacity onPress={() => setIsBookModalVisible(false)}>
                <X size={24} color="#5c6b60" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={books}
              keyExtractor={(item) => item.id || item.filename || item.title}
              renderItem={({ item }) => {
                const key = item.id || item.filename;
                const isSelected = key === selectedBookId;
                return (
                  <TouchableOpacity
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: isSelected
                        ? "rgba(111, 227, 177, 1)"
                        : "rgba(255, 255, 255, 0.08)",
                      backgroundColor: isSelected
                        ? "rgba(111, 227, 177, 0.1)"
                        : "transparent",
                    }}
                    onPress={() => {
                      setSelectedBookId(key || null);
                      setIsBookModalVisible(false);
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 18,
                        fontFamily: "serif",
                        fontWeight: "bold",
                        color: isSelected ? "#6fe3b1" : "#e8f5e9",
                      }}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={{ color: "#5c6b60", fontSize: 12, marginTop: 4 }}
                    >
                      {item.article_count || 0} articles
                    </Text>
                  </TouchableOpacity>
                );
              }}
              style={{ maxHeight: 400 }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
