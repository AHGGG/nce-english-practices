import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure how notifications behave when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    // Expo SDK 54 NotificationBehavior includes banner/list flags
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  async isSupported() {
    try {
      await Notifications.getPermissionsAsync();
      return true;
    } catch {
      return false;
    }
  }

  async registerForPushNotificationsAsync() {
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("daily-reminder", {
          name: "Daily Reminder",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }

      if (!Device.isDevice) {
        console.warn("Push notifications require a physical device");
        return false;
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === "granted";
    } catch (error) {
      console.warn(
        "Push notifications are unavailable in this environment",
        error,
      );
      return false;
    }
  }

  async scheduleDailyReminder(
    hour: number,
    minute: number,
    isEnabled: boolean,
  ) {
    // 1. Cancel all existing first to avoid duplicates
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.warn("Failed to clear existing notification schedule", error);
      return false;
    }

    if (!isEnabled) {
      return true;
    }

    // 2. Schedule new
    const trigger = {
      hour,
      minute,
      repeats: true,
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
    } as Notifications.DailyTriggerInput;

    // Fix for type safety if needed, but 'type' is explicit above
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Time to Practice! 🧠",
          body: "Keep your streak alive. 15 minutes a day masters the tense.",
          sound: true,
          data: { url: "/(tabs)/" },
        },
        trigger,
      });
      return true;
    } catch (e) {
      console.warn("Failed to schedule notification", e);
      return false;
    }
  }

  // Debugging helper
  async checkScheduled() {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(
      "Scheduled Notifications:",
      scheduled.map((n) => n.trigger),
    );
  }

  async syncDailyReminder(reminderTime: string, isEnabled: boolean) {
    const [hourRaw, minuteRaw] = reminderTime.split(":");
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);

    if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
      return false;
    }

    if (!isEnabled) {
      return this.scheduleDailyReminder(hour, minute, false);
    }

    const isGranted = await this.registerForPushNotificationsAsync();
    if (!isGranted) {
      return false;
    }

    return this.scheduleDailyReminder(hour, minute, true);
  }
}

export const notificationService = new NotificationService();
