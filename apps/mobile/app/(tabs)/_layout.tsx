// apps/mobile/app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Platform } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#1e293b", // slate-800
          borderTopWidth: 0,
        },
        tabBarActiveTintColor: "#3b82f6", // blue-500
        tabBarInactiveTintColor: "#94a3b8", // slate-400
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Study",
          tabBarLabel: "Study",
        }}
      />
      <Tabs.Screen
        name="dictionary"
        options={{
          title: "Dictionary",
          tabBarLabel: "Dictionary",
        }}
      />
    </Tabs>
  );
}
