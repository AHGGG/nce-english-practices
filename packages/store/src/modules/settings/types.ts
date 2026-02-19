export interface SettingsState {
  theme: "dark" | "light";
  ttsRate: number;
  podcastSpeed: number;
  voiceId: string;
  notificationsEnabled: boolean;
  reminderTime: string;
  autoPronounce: boolean;
  collocationDisplayLevel: "basic" | "core" | "full";
  transcriptionRemoteEnabled: boolean;
  transcriptionRemoteUrl: string;
  transcriptionRemoteApiKey?: string;
  setTheme: (theme: "dark" | "light") => void;
  setTtsRate: (rate: number) => void;
  setPodcastSpeed: (rate: number) => void;
  setVoiceId: (id: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setReminderTime: (time: string) => void;
  setAutoPronounce: (enabled: boolean) => void;
  setCollocationDisplayLevel: (level: "basic" | "core" | "full") => void;
  setTranscriptionRemoteEnabled: (enabled: boolean) => void;
  setTranscriptionRemoteUrl: (url: string) => void;
  setTranscriptionRemoteApiKey: (apiKey: string) => void;
}
