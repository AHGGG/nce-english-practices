export interface SettingsState {
  theme: "dark" | "light";
  ttsRate: number;
  voiceId: string;
  notificationsEnabled: boolean;
  reminderTime: string;
  autoPronounce: boolean;
  setTheme: (theme: "dark" | "light") => void;
  setTtsRate: (rate: number) => void;
  setVoiceId: (id: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setReminderTime: (time: string) => void;
  setAutoPronounce: (enabled: boolean) => void;
}
