export interface SettingsState {
  theme: "dark" | "light";
  ttsRate: number; // 0.5 - 2.0
  voiceId: string;
  setTheme: (theme: "dark" | "light") => void;
  setTtsRate: (rate: number) => void;
  setVoiceId: (id: string) => void;
}
