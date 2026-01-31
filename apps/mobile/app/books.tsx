import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronRight, BookOpen } from "lucide-react-native";
import { useState, useEffect } from "react";
import { sentenceStudyApi } from "@nce/api";

interface Book {
  filename: string;
  title: string;
  author?: string;
  cover_url?: string;
  article_count: number;
}

export default function BooksScreen() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadBooks = async () => {
      try {
        const data = await sentenceStudyApi.getBooks();
        setBooks(data.books || []);
      } catch (e) {
        console.error("Failed to load books:", e);
      } finally {
        setLoading(false);
      }
    };
    loadBooks();
  }, []);

  const renderBook = ({ item }: { item: Book }) => (
    <TouchableOpacity
      className="bg-bg-surface p-4 rounded-xl border border-border-default mb-3 active:bg-bg-elevated"
      onPress={() => router.push(`/books/${encodeURIComponent(item.filename)}`)}
    >
      <View className="flex-row justify-between items-center">
        <View className="flex-1 mr-4">
          <Text
            className="text-text-primary text-lg font-serif font-bold mb-1"
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {item.author && (
            <Text className="text-text-muted text-xs mb-1">{item.author}</Text>
          )}
          <View className="flex-row items-center space-x-2">
            <View className="bg-bg-base px-2 py-0.5 rounded border border-border">
              <Text className="text-text-muted text-[10px] font-mono">
                {item.article_count} articles
              </Text>
            </View>
          </View>
        </View>
        <ChevronRight size={20} color="#666666" />
      </View>
    </TouchableOpacity>
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
            <Text className="text-text-muted">Back</Text>
          </TouchableOpacity>
          <Text className="text-text-primary text-2xl font-bold font-sans">
            Books
          </Text>
        </View>

        <FlatList
          data={books}
          renderItem={renderBook}
          keyExtractor={(item) => item.filename}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="items-center py-20">
              <BookOpen size={48} color="#444444" />
              <Text className="text-text-muted mt-4">No books found</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
