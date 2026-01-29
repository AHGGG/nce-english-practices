import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore, useSettingsStore } from "@nce/store";
import {
  LogOut,
  ChevronRight,
  User,
  Bell,
  Volume2,
  Moon,
  Clock,
} from "lucide-react-native";
import { useRouter } from "expo-router";

export default function SettingsScreen() {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const { theme, ttsRate, setTheme, setTtsRate } = useSettingsStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/auth/login");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const cycleSpeed = () => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const nextIndex = (speeds.indexOf(ttsRate) + 1) % speeds.length;
    setTtsRate(speeds[nextIndex]);
  };

  const Section = ({ title, children }: any) => (
    <View className="mb-8">
      <Text className="text-text-muted text-xs font-bold uppercase tracking-wider mb-2 ml-4">
        {title}
      </Text>
      <View className="bg-bg-surface rounded-xl border border-border-default overflow-hidden">
        {children}
      </View>
    </View>
  );

  const Item = ({ icon: Icon, label, value, onPress, isLast }: any) => (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center justify-between p-4 ${!isLast ? "border-b border-border-subtle" : ""}`}
    >
      <View className="flex-row items-center">
        <Icon size={20} color="#A0A0A0" />
        <Text className="text-text-primary ml-3 font-medium">{label}</Text>
      </View>
      <View className="flex-row items-center">
        {value && (
          <Text className="text-text-secondary text-sm mr-2">{value}</Text>
        )}
        <ChevronRight size={16} color="#666" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-bg-base" edges={["top"]}>
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-text-primary text-3xl font-serif font-bold mb-8">
          Settings
        </Text>

        <Section title="Account">
          <View className="flex-row items-center p-4 border-b border-border-subtle">
            <View className="w-12 h-12 rounded-full bg-accent-primary/20 items-center justify-center">
              <Text className="text-accent-primary font-bold text-lg">
                {user?.username?.[0]?.toUpperCase() || "U"}
              </Text>
            </View>
            <View className="ml-4">
              <Text className="text-text-primary font-bold text-lg">
                {user?.username || "User"}
              </Text>
              <Text className="text-text-muted text-sm">{user?.email}</Text>
            </View>
          </View>
          <Item icon={User} label="Profile" isLast />
        </Section>

        <Section title="Preferences">
          <Item
            icon={Clock}
            label="TTS Speed"
            value={`${ttsRate}x`}
            onPress={cycleSpeed}
          />
          <Item icon={Bell} label="Notifications" value="On" />
          <Item
            icon={Moon}
            label="Appearance"
            value={theme === "dark" ? "Dark" : "Light"}
            onPress={toggleTheme}
            isLast
          />
        </Section>

        <TouchableOpacity
          onPress={handleLogout}
          className="bg-bg-surface p-4 rounded-xl border border-accent-danger/30 flex-row items-center justify-center mb-10"
        >
          <LogOut size={20} color="#FF0055" />
          <Text className="text-accent-danger font-bold ml-2">Log Out</Text>
        </TouchableOpacity>

        <Text className="text-text-muted text-xs text-center font-mono mb-8">
          NCE Practice v1.0.0 (Mobile)
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
