import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useArticleList } from "@nce/shared";
import { BookOpen, CheckCircle, Settings, ChevronDown, X } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState, useMemo, useEffect } from "react";
import { readingApi } from "@nce/api";
import { sentenceStudyApi } from "@nce/api";

interface Book {
  filename: string;
  title: string;
  author?: string;
  article_count: number;
}

export default function LibraryScreen() {
  const [selectedBookFilename, setSelectedBookFilename] = useState<string | null>(null);
  const { articles, isLoading } = useArticleList({ bookId: selectedBookFilename || undefined });
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [isBookModalVisible, setIsBookModalVisible] = useState(false);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);

  useEffect(() => {
    const loadBooks = async () => {
      try {
        const data = await sentenceStudyApi.getBooks();
        setBooks(data.books || []);
        if (data.books && data.books.length > 0 && !selectedBookFilename) {
          setSelectedBookFilename(data.books[0].filename);
        }
      } catch (e) {
        console.error("Failed to load books:", e);
      } finally {
        setIsLoadingBooks(false);
      }
    };
    loadBooks();
  }, []);

  const currentBook = useMemo(() => 
    books.find(b => b.filename === selectedBookFilename), 
    [books, selectedBookFilename]
  );

  const filteredArticles = useMemo(() => {
    if (!selectedBookFilename) return articles;
    return articles.filter(a => {
      const sourceId = a.source_id || "";
      return sourceId.startsWith(`epub:${selectedBookFilename}:`);
    });
  }, [articles, selectedBookFilename]);

  const { completed: completedArticles, nonCompleted: nonCompletedArticles } = useMemo(() => {
    const completed: typeof articles = [];
    const nonCompleted: typeof articles = [];

    filteredArticles.forEach(a => {
      if (a.status === "completed") {
        completed.push(a);
      } else {
        nonCompleted.push(a);
      }
    });

    return { completed, nonCompleted };
  }, [filteredArticles]);

  const sortedNonCompleted = useMemo(() => {
    return [...nonCompletedArticles].sort((a, b) => {
      const idxA = typeof a.index === "number" ? a.index : 0;
      const idxB = typeof b.index === "number" ? b.index : 0;
      return idxA - idxB;
    });
  }, [nonCompletedArticles]);

  const renderSection = (title: string, data: any[]) => (
    <View className="mb-6">
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <CheckCircle size={14} color="#00FF94" style={{ display: title.includes("Completed") ? "flex" : "none" }} />
          <Text className="text-sm font-bold font-mono uppercase tracking-wider ml-2 text-text-muted">
            {title}
          </Text>
        </View>
        <Text className="text-sm font-mono text-text-secondary">
          {data.length}
        </Text>
      </View>
      {data.length === 0 ? (
        <Text className="text-text-muted text-sm italic">No articles</Text>
      ) : (
        data.map((item, idx) => (
          <TouchableOpacity
            key={item.source_id}
            className="bg-bg-surface p-4 rounded-xl border border-border mb-3 active:bg-bg-elevated"
            onPress={() => router.push(`/reading/${encodeURIComponent(item.source_id)}`)}
          >
            <View className="flex-row justify-between items-start">
              <View className="flex-1 mr-4">
                <Text className="text-text-secondary text-xs font-mono mb-1">
                  {item.chapter || `Chapter ${(data.findIndex(d => d.source_id === item.source_id) + 1).toString().padStart(2, '0')}`}
                </Text>
                <Text className="text-text-primary text-lg font-serif mb-2" numberOfLines={2}>
                  {item.title}
                </Text>
                <View className="flex-row items-center space-x-3">
                  <View className="bg-bg-base px-2 py-0.5 rounded border border-border">
                    <Text className="text-text-muted text-[10px] font-mono">{item.word_count} words</Text>
                  </View>
                  {item.status === "completed" && (
                    <View className="flex-row items-center">
                      <CheckCircle size={12} color="#00FF94" />
                      <Text className="text-accent-primary text-[10px] ml-1 font-mono">COMPLETED</Text>
                    </View>
                  )}
                  {item.status === "in_progress" && (
                    <View className="flex-row items-center">
                      <View className="w-2 h-2 rounded-full bg-accent-warning" />
                      <Text className="text-accent-warning text-[10px] ml-1 font-mono">IN PROGRESS</Text>
                    </View>
                  )}
                  {item.status === "read" && (
                    <View className="flex-row items-center">
                      <BookOpen size={12} color="#888888" />
                      <Text className="text-text-secondary text-[10px] ml-1 font-mono">READ</Text>
                    </View>
                  )}
                </View>
              </View>
              <View className="w-2 h-full rounded-full" style={{ backgroundColor: item.difficulty > 3 ? "rgb(var(--color-accent-danger))" : "rgb(var(--color-accent-primary))", opacity: 0.2 }} />
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  if (isLoading || isLoadingBooks) {
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
            <Text className="text-text-primary text-2xl font-bold font-sans">Library</Text>
            <TouchableOpacity
              className="flex-row items-center mt-1"
              onPress={() => setIsBookModalVisible(true)}
            >
              <Text className="text-text-muted text-sm">
                {currentBook?.title || "Select Book"}
              </Text>
              <ChevronDown size={16} color="#666666" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
          <View className="flex-row space-x-3">
            <TouchableOpacity
              className="bg-bg-surface p-2 rounded-full border border-border"
              onPress={() => router.push("/settings")}
            >
              <Settings size={20} color="#E0E0E0" />
            </TouchableOpacity>
          </View>
        </View>

        {filteredArticles.length === 0 ? (
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
                {sortedNonCompleted.length > 0 && renderSection("01. To Read", sortedNonCompleted)}
                {completedArticles.length > 0 && renderSection(`${sortedNonCompleted.length > 0 ? "02." : "01."} Completed`, completedArticles)}
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
        {/* 
          NOTE: NativeWind 不支持 Tailwind 的 alpha 语法 (如 bg-black/50)。
          使用内联样式作为替代方案，避免背景透明问题。
          参考: https://www.nativewind.dev/v4/quick-start/react-native
        */}
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
          <View style={{ backgroundColor: "#0a0f0d", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, width: "100%", borderTopWidth: 1, borderColor: "rgba(255, 255, 255, 0.08)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={{ color: "#e8f5e9", fontSize: 20, fontWeight: "bold", fontFamily: "sans-serif" }}>Select Book</Text>
              <TouchableOpacity onPress={() => setIsBookModalVisible(false)}>
                <X size={24} color="#5c6b60" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={books}
              keyExtractor={(item) => item.filename}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: selectedBookFilename === item.filename ? "rgba(111, 227, 177, 1)" : "rgba(255, 255, 255, 0.08)",
                    backgroundColor: selectedBookFilename === item.filename ? "rgba(111, 227, 177, 0.1)" : "transparent"
                  }}
                  onPress={() => {
                    setSelectedBookFilename(item.filename);
                    setIsBookModalVisible(false);
                  }}
                >
                  <Text style={{
                    fontSize: 18,
                    fontFamily: "serif",
                    fontWeight: "bold",
                    color: selectedBookFilename === item.filename ? "#6fe3b1" : "#e8f5e9"
                  }}>
                    {item.title}
                  </Text>
                  <Text style={{ color: "#5c6b60", fontSize: 12, marginTop: 4 }}>{item.article_count} articles</Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
