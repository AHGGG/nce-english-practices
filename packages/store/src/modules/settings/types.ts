export interface SettingsState {
  theme: "dark" | "light";
  ttsRate: number; // 0.5 - 2.0
  voiceId: string;
  notificationsEnabled: boolean;
  reminderTime: string; // "HH:MM" format, e.g. "20:00"
  setTheme: (theme: "dark" | "light") => void;
  setTtsRate: (rate: number) => void;
  setVoiceId: (id: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setReminderTime: (time: string) => void;
}
