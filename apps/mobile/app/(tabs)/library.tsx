import { useRouter } from "expo-router";
import UnifiedArticleListMobile from "../../src/components/UnifiedArticleListMobile";

export default function LibraryScreen() {
  const router = useRouter();

  return (
    <UnifiedArticleListMobile
      title="Reading"
      emptyText="No articles found"
      metricType="words"
      showSettings={true}
      onSettingsPress={() => router.push("/settings")}
      onArticlePress={(sourceId) =>
        router.push(`/reading/${encodeURIComponent(sourceId)}`)
      }
    />
  );
}
