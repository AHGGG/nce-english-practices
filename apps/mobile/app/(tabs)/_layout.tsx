import { Tabs } from "expo-router";
import {
  BookOpen,
  Search,
  Layers,
  BarChart2,
  Mic,
  Headphones,
} from "lucide-react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#050505", // bg-base
          borderTopColor: "#333333", // border-default
          paddingTop: 5,
        },
        tabBarActiveTintColor: "#00FF94", // accent-primary
        tabBarInactiveTintColor: "#666666", // text-muted
        tabBarLabelStyle: {
          fontFamily: "Inter",
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color }) => <BookOpen size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="dictionary"
        options={{
          title: "Dictionary",
          tabBarIcon: ({ color }) => <Search size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="podcast"
        options={{
          title: "Podcast",
          tabBarIcon: ({ color }) => <Headphones size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="audiobook"
        options={{
          title: "Audio",
          tabBarIcon: ({ color }) => <Headphones size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Review",
          tabBarIcon: ({ color }) => <Layers size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="voice"
        options={{
          title: "Voice",
          tabBarIcon: ({ color }) => <Mic size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Stats",
          tabBarIcon: ({ color }) => <BarChart2 size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

