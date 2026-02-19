import { type ComponentType, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Activity,
  BarChart2,
  BookMarked,
  BookOpen,
  Brain,
  Headphones,
  Mic,
  Radio,
  Settings,
  Target,
} from "lucide-react-native";

type NavItem = {
  title: string;
  path: string;
  description: string;
  icon: ComponentType<{ size?: number; color?: string }>;
};

export default function NavScreen() {
  const router = useRouter();

  const items = useMemo<NavItem[]>(
    () => [
      {
        title: "Voice Mode",
        path: "/voice",
        description: "Real-time AI speaking practice",
        icon: Mic,
      },
      {
        title: "Reading",
        path: "/reading",
        description: "Books and article reading",
        icon: BookOpen,
      },
      {
        title: "Sentence Study",
        path: "/sentence-study",
        description: "4-stage progressive sentence learning",
        icon: Target,
      },
      {
        title: "Performance",
        path: "/performance",
        description: "Memory curve and analytics",
        icon: BarChart2,
      },
      {
        title: "Review Queue",
        path: "/review-queue",
        description: "SM-2 spaced repetition review",
        icon: Brain,
      },
      {
        title: "Proficiency Lab",
        path: "/lab/calibration",
        description: "Calibrate your level profile",
        icon: Activity,
      },
      {
        title: "Voice Lab",
        path: "/voice-lab",
        description: "Voice provider and interaction testing",
        icon: Radio,
      },
      {
        title: "Podcast",
        path: "/podcast",
        description: "Podcast subscription and listening",
        icon: Headphones,
      },
      {
        title: "Audiobook",
        path: "/audiobook",
        description: "Audiobooks with synced subtitles",
        icon: BookOpen,
      },
      {
        title: "Weak Points",
        path: "/weak-points",
        description: "Track your problem distribution",
        icon: BookMarked,
      },
      {
        title: "Settings",
        path: "/settings",
        description: "Account and preference settings",
        icon: Settings,
      },
    ],
    [],
  );

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View className="mb-6">
          <Text className="text-text-primary text-3xl font-bold font-serif">
            English101
          </Text>
          <Text className="text-text-muted mt-2">
            Choose your learning module
          </Text>
        </View>

        {items.map((item) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.path}
              className="bg-bg-surface border border-border-default rounded-2xl px-4 py-4 mb-3"
              onPress={() => router.push(item.path as never)}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-accent-primary/15 items-center justify-center mr-3">
                  <Icon size={18} color="#00FF94" />
                </View>
                <View className="flex-1">
                  <Text className="text-text-primary text-base font-semibold">
                    {item.title}
                  </Text>
                  <Text className="text-text-muted text-xs mt-1">
                    {item.description}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
