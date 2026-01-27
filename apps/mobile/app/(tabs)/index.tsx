import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/AuthContext";
import { useBooks, useArticles } from "../../src/modules/study/useStudyData";
import { useState, useEffect } from "react";
import { Book, Article } from "../../src/modules/study/types";
import { useRouter } from "expo-router";

export default function StudyScreen() {
  const { user, signOut } = useAuth();
  const { books, isLoading: booksLoading } = useBooks();
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const { articles, isLoading: articlesLoading } = useArticles(selectedBook || "");
  const router = useRouter();

  // Auto-select first book
  useEffect(() => {
    if (books.length > 0 && !selectedBook) {
      setSelectedBook(books[0].code);
    }
  }, [books]);

  const renderBookItem = ({ item }: { item: Book }) => (
    <TouchableOpacity
      onPress={() => setSelectedBook(item.code)}
      className={`px-4 py-2 mr-2 rounded-full border ${
        selectedBook === item.code
          ? "bg-accent-primary border-accent-primary"
          : "bg-bg-surface border-border"
      }`}
    >
      <Text
        className={`${
          selectedBook === item.code ? "text-bg-base font-bold" : "text-text-muted"
        }`}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderArticleItem = ({ item }: { item: Article }) => (
    <TouchableOpacity 
      className="bg-bg-surface p-4 mb-3 rounded-xl border border-border active:bg-bg-elevated"
      onPress={() => router.push(`/study/${item.source_id}`)}
    >
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-text-primary text-lg font-bold font-serif flex-1 mr-2" numberOfLines={1}>
          {item.title}
        </Text>
        <StatusBadge status={item.status} />
      </View>
      <Text className="text-text-muted text-sm mb-3 font-serif" numberOfLines={2}>
        {item.content}
      </Text>
      
      {/* Progress Bar */}
      {item.study_progress && item.study_progress.total > 0 && (
        <View className="flex-row items-center space-x-2">
           <View className="flex-1 h-1 bg-border rounded-full overflow-hidden">
             <View 
               className="h-full bg-accent-info" 
               style={{ width: `${(item.study_progress.current_index / item.study_progress.total) * 100}%` }}
             />
           </View>
           <Text className="text-[10px] text-text-muted font-mono">
             {Math.round((item.study_progress.current_index / item.study_progress.total) * 100)}%
           </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-bg-base" edges={['top']}>
      <View className="p-4 pb-0 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-text-primary font-serif">Library</Text>
        <TouchableOpacity onPress={signOut}>
          <Text className="text-accent-danger font-medium font-mono text-xs uppercase">Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View className="mt-6">
        {booksLoading ? (
          <ActivityIndicator color="#00FF94" />
        ) : (
          <FlatList
            horizontal
            data={books}
            renderItem={renderBookItem}
            keyExtractor={(item) => item.code}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          />
        )}
      </View>

      <View className="flex-1 px-4">
        {articlesLoading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#00FF94" />
            <Text className="text-text-muted mt-2 font-mono text-xs uppercase">Loading Articles...</Text>
          </View>
        ) : (
          <FlatList
            data={articles}
            renderItem={renderArticleItem}
            keyExtractor={(item) => item.source_id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
                <View className="items-center mt-10">
                    <Text className="text-text-muted font-mono">No articles found.</Text>
                </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function StatusBadge({ status }: { status: Article['status'] }) {
    const colors = {
        new: "bg-border",
        in_progress: "bg-category-blue",
        completed: "bg-category-green", // Wait, green is not in category. Use accent-success
        read: "bg-category-amber"
    };
    
    // Fix mapping for Cyber-Noir
    const badgeStyle = {
        new: "bg-border text-text-muted",
        in_progress: "bg-accent-info/20 border border-accent-info text-accent-info",
        completed: "bg-accent-success/20 border border-accent-success text-accent-success",
        read: "bg-accent-warning/20 border border-accent-warning text-accent-warning"
    };

    const labels = {
        new: "NEW",
        in_progress: "STUDYING",
        completed: "DONE",
        read: "READ"
    };
    
    // Default fallback
    const styleClass = badgeStyle[status] || badgeStyle.new;

    return (
        <View className={`${styleClass} px-2 py-0.5 rounded`}>
            <Text className={`text-[10px] font-bold font-mono ${status === 'new' ? 'text-text-muted' : ''} ${styleClass.includes('text-') ? '' : 'text-text-primary'}`}>
                {labels[status] || status.toUpperCase()}
            </Text>
        </View>
    );
}
