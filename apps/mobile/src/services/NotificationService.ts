import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useSettingsStore } from "@nce/store";

// Configure how notifications behave when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  async registerForPushNotificationsAsync() {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("daily-reminder", {
        name: "Daily Reminder",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Failed to get push token for push notification!");
        return false;
      }
      return true;
    } else {
      console.log("Must use physical device for Push Notifications");
      return false;
    }
  }

  async scheduleDailyReminder(
    hour: number,
    minute: number,
    isEnabled: boolean,
  ) {
    // 1. Cancel all existing first to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!isEnabled) {
      console.log("Notifications disabled, cleared schedule.");
      return;
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
      console.log(`Scheduled daily reminder for ${hour}:${minute}`);
    } catch (e) {
      console.error("Failed to schedule notification", e);
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
}

export const notificationService = new NotificationService();
