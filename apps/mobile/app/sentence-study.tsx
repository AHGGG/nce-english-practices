import { useRouter } from "expo-router";
import UnifiedArticleListMobile from "../src/components/UnifiedArticleListMobile";

export default function SentenceStudyEntryScreen() {
  const router = useRouter();

  return (
    <UnifiedArticleListMobile
      title="Sentence Study"
      emptyText="No study articles available"
      metricType="sentences"
      onArticlePress={(sourceId) =>
        router.push(`/study/${encodeURIComponent(sourceId)}` as never)
      }
    />
  );
}
