import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";

export default function UnifiedPlayerRoute() {
  const router = useRouter();
  const { sourceType, contentId } = useLocalSearchParams<{
    sourceType: string;
    contentId: string;
  }>();

  useEffect(() => {
    if (!sourceType || !contentId) {
      router.replace("/nav");
      return;
    }

    if (sourceType === "podcast") {
      router.replace({
        pathname: "/podcast/intensive",
        params: { episodeId: contentId },
      });
      return;
    }

    if (sourceType === "audiobook") {
      router.replace(`/audiobook/${encodeURIComponent(contentId)}`);
      return;
    }

    router.replace("/nav");
  }, [sourceType, contentId, router]);

  return (
    <View className="flex-1 items-center justify-center bg-bg-base">
      <ActivityIndicator size="large" color="#00FF94" />
    </View>
  );
}
