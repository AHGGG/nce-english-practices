import { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@nce/api";
import { ChevronLeft, Search, BookOpen, Link2 } from "lucide-react-native";

type ItemType = "all" | "word" | "phrase";
type SortType = "recent" | "count" | "difficulty";

interface WeakPointItem {
  text: string;
  item_type: "word" | "phrase";
  encounter_count: number;
  last_seen_at?: string | null;
  difficulty_score?: number | null;
  in_review_queue: boolean;
}

interface WeakPointResponse {
  items: WeakPointItem[];
  total: number;
}

export default function WeakPointsRoute() {
  const router = useRouter();
  const [itemType, setItemType] = useState<ItemType>("all");
  const [sort, setSort] = useState<SortType>("recent");
  const [query, setQuery] = useState("");

  const requestUrl = useMemo(() => {
    const params = new URLSearchParams({
      item_type: itemType,
      sort,
      limit: "100",
      offset: "0",
    });
    if (query.trim()) {
      params.set("q", query.trim());
    }
    return `/api/vocabulary/unfamiliar-items?${params.toString()}`;
  }, [itemType, sort, query]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["weak-points", itemType, sort, query.trim()],
    queryFn: () => apiGet(requestUrl) as Promise<WeakPointResponse>,
  });

  const items = data?.items || [];

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <View className="h-14 flex-row items-center px-4 border-b border-border-default bg-bg-surface">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft color="#E0E0E0" size={24} />
        </TouchableOpacity>
        <Text className="text-text-primary font-bold ml-2 text-base">
          Weak Points
        </Text>
      </View>

      <View className="px-4 pt-4 pb-3 border-b border-border-default">
        <View className="bg-bg-surface border border-border-default rounded-xl flex-row items-center px-3 mb-3">
          <Search size={16} color="#888" />
          <TextInput
            className="flex-1 ml-2 text-text-primary h-10"
            placeholder="Search weak points..."
            placeholderTextColor="#666"
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <View className="flex-row gap-2 mb-2">
          {(["all", "word", "phrase"] as const).map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => setItemType(type)}
              className={`px-3 py-2 rounded-lg border ${
                itemType === type
                  ? "bg-accent-primary/10 border-accent-primary"
                  : "bg-bg-surface border-border-default"
              }`}
            >
              <Text
                className={`text-xs font-bold uppercase ${
                  itemType === type
                    ? "text-accent-primary"
                    : "text-text-secondary"
                }`}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="flex-row gap-2">
          {(
            [
              { key: "recent", label: "Recent" },
              { key: "count", label: "Most Seen" },
              { key: "difficulty", label: "Difficulty" },
            ] as const
          ).map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setSort(opt.key)}
              className={`px-3 py-1.5 rounded-full border ${
                sort === opt.key
                  ? "bg-accent-info/10 border-accent-info"
                  : "bg-bg-surface border-border-default"
              }`}
            >
              <Text
                className={`text-[10px] font-bold uppercase ${
                  sort === opt.key ? "text-accent-info" : "text-text-muted"
                }`}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#00FF94" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-accent-danger text-center mb-3">
            Failed to load weak points.
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="px-4 py-2 rounded-lg bg-bg-surface border border-border-default"
          >
            <Text className="text-text-primary text-sm">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.item_type}:${item.text}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          refreshing={isFetching}
          onRefresh={() => refetch()}
          ListEmptyComponent={
            <View className="items-center py-20">
              <BookOpen size={44} color="#555" />
              <Text className="text-text-muted mt-4">No weak points found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="bg-bg-surface border border-border-default rounded-xl p-4 mb-3">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <View
                    className={`px-2 py-0.5 rounded ${
                      item.item_type === "phrase"
                        ? "bg-accent-info/20"
                        : "bg-accent-primary/20"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold uppercase ${
                        item.item_type === "phrase"
                          ? "text-accent-info"
                          : "text-accent-primary"
                      }`}
                    >
                      {item.item_type}
                    </Text>
                  </View>
                  {item.in_review_queue && (
                    <View className="px-2 py-0.5 rounded bg-accent-warning/20">
                      <Text className="text-accent-warning text-[10px] font-bold uppercase">
                        In queue
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-text-muted text-[11px] font-mono">
                  {item.encounter_count}x
                </Text>
              </View>

              <Text className="text-text-primary text-lg font-serif mb-1">
                {item.text}
              </Text>

              <View className="flex-row items-center justify-between">
                <Text className="text-text-muted text-xs">
                  {item.last_seen_at
                    ? new Date(item.last_seen_at).toLocaleDateString()
                    : "No date"}
                </Text>
                {item.difficulty_score != null && (
                  <View className="flex-row items-center gap-1">
                    <Link2 size={12} color="#00E0FF" />
                    <Text className="text-accent-info text-xs font-mono">
                      {item.difficulty_score.toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
