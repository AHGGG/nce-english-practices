import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore, useSettingsStore } from "@nce/store";
import { notificationService } from "../src/services/NotificationService";
import {
  LogOut,
  ChevronRight,
  User,
  Bell,
  Volume2,
  Moon,
  Clock,
  Key,
  X,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState } from "react";

export default function SettingsScreen() {
  const { logout, user, changePassword, isLoading } = useAuthStore();
  const {
    theme,
    ttsRate,
    notificationsEnabled,
    reminderTime,
    autoPronounce,
    setTheme,
    setTtsRate,
    setNotificationsEnabled,
    setReminderTime,
    setAutoPronounce,
  } = useSettingsStore();
  const router = useRouter();

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleLogout = () => {
    logout();
    router.replace("/auth/login");
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("Error", "New password must be at least 8 characters");
      return;
    }

    try {
      await changePassword(oldPassword, newPassword);
      Alert.alert("Success", "Password updated successfully");
      setPasswordModalVisible(false);
      setOldPassword("");
      setNewPassword("");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update password");
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const toggleNotifications = async (value: boolean) => {
    const success = await notificationService.syncDailyReminder(
      reminderTime,
      value,
    );

    if (!success && value) {
      Alert.alert(
        "Notification Unavailable",
        "Notifications are not supported in this runtime or permissions were denied.",
      );
      setNotificationsEnabled(false);
      return;
    }

    setNotificationsEnabled(value);
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

  const Item = ({
    icon: Icon,
    label,
    value,
    onPress,
    isLast,
    isSwitch,
    switchValue,
    onSwitch,
  }: any) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={isSwitch}
      className={`flex-row items-center justify-between p-4 ${!isLast ? "border-b border-border-subtle" : ""}`}
    >
      <View className="flex-row items-center">
        <Icon size={20} color="#A0A0A0" />
        <Text className="text-text-primary ml-3 font-medium">{label}</Text>
      </View>
      <View className="flex-row items-center">
        {isSwitch ? (
          <Switch
            trackColor={{ false: "#333", true: "#00FF94" }}
            thumbColor={switchValue ? "#ffffff" : "#f4f3f4"}
            onValueChange={onSwitch}
            value={switchValue}
          />
        ) : (
          <>
            {value && (
              <Text className="text-text-secondary text-sm mr-2">{value}</Text>
            )}
            <ChevronRight size={16} color="#666" />
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
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
          <Item
            icon={Key}
            label="Change Password"
            onPress={() => setPasswordModalVisible(true)}
            isLast
          />
        </Section>

        <Section title="Preferences">
          <Item
            icon={Volume2}
            label="Auto-Pronounce"
            isSwitch
            switchValue={autoPronounce}
            onSwitch={setAutoPronounce}
          />
          <Item
            icon={Clock}
            label="TTS Speed"
            value={`${ttsRate}x`}
            onPress={cycleSpeed}
          />
          <Item
            icon={Bell}
            label="Daily Reminder"
            isSwitch
            switchValue={notificationsEnabled}
            onSwitch={toggleNotifications}
          />
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

      {/* Password Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={passwordModalVisible}
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/80 p-4">
          <View className="bg-bg-surface w-full max-w-sm rounded-2xl p-6 border border-border-default">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-text-primary">
                Change Password
              </Text>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View className="space-y-4 mb-6">
              <View>
                <Text className="text-text-muted text-xs uppercase mb-2 font-bold">
                  Current Password
                </Text>
                <TextInput
                  secureTextEntry
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  className="bg-bg-base border border-border-default rounded-xl p-4 text-text-primary"
                  placeholderTextColor="#666"
                />
              </View>
              <View>
                <Text className="text-text-muted text-xs uppercase mb-2 font-bold">
                  New Password
                </Text>
                <TextInput
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  className="bg-bg-base border border-border-default rounded-xl p-4 text-text-primary"
                  placeholderTextColor="#666"
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleChangePassword}
              disabled={isLoading}
              className="bg-accent-primary py-4 rounded-xl items-center"
            >
              <Text className="text-bg-base font-bold">
                {isLoading ? "Updating..." : "Update Password"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
