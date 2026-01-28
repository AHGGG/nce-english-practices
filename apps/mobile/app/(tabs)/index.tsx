import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useReviewSession } from "@nce/shared";
import { RotateCcw, CheckCircle, Zap } from "lucide-react-native";

export default function ReviewScreen() {
  const { queue, loading, currentItem, currentIndex, submitReview } = useReviewSession();

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-bg-base">
        <ActivityIndicator color="#00FF94" size="large" />
      </View>
    );
  }

  if (queue.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-bg-base items-center justify-center p-6">
        <CheckCircle size={64} color="#00FF94" />
        <Text className="text-text-primary text-xl font-serif mt-4">All Caught Up!</Text>
        <Text className="text-text-secondary text-center mt-2">
          You've finished your reviews for now.
        </Text>
      </SafeAreaView>
    );
  }

  if (!currentItem) return null;

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <View className="flex-1 px-6 pt-10">
        <Text className="text-text-secondary text-sm mb-4">
          Item {currentIndex + 1} of {queue.length}
        </Text>
        
        {/* Card */}
        <View className="bg-bg-surface p-6 rounded-2xl border border-border-default min-h-[300px] justify-center items-center">
          <Text className="text-2xl text-text-primary font-serif text-center leading-relaxed">
            {currentItem.sentence_text}
          </Text>
        </View>
      </View>

      {/* Buttons */}
      <View className="flex-row justify-around p-6 pb-10">
         <TouchableOpacity 
            className="bg-accent-danger/10 p-4 rounded-2xl items-center justify-center w-24 h-24 border border-accent-danger/30"
            onPress={() => submitReview(1)}
         >
            <RotateCcw color="#FF0055" size={24} />
            <Text className="text-accent-danger text-xs mt-2 font-bold uppercase">Forgot</Text>
         </TouchableOpacity>

         <TouchableOpacity 
            className="bg-accent-primary/10 p-4 rounded-2xl items-center justify-center w-24 h-24 border border-accent-primary/30"
            onPress={() => submitReview(3)}
         >
            <CheckCircle color="#00FF94" size={24} />
            <Text className="text-accent-primary text-xs mt-2 font-bold uppercase">Good</Text>
         </TouchableOpacity>

         <TouchableOpacity 
            className="bg-accent-warning/10 p-4 rounded-2xl items-center justify-center w-24 h-24 border border-accent-warning/30"
            onPress={() => submitReview(5)}
         >
            <Zap color="#F59E0B" size={24} />
            <Text className="text-accent-warning text-xs mt-2 font-bold uppercase">Easy</Text>
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
