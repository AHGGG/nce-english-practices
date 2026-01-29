import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "../../lib/storage";
import type { SettingsState } from "./types";

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dark",
      ttsRate: 1.0,
      voiceId: "en-US-AndrewMultilingualNeural",
      notificationsEnabled: false,
      reminderTime: "20:00",
      autoPronounce: true,
      setTheme: (theme) => set({ theme }),
      setTtsRate: (ttsRate) => set({ ttsRate }),
      setVoiceId: (voiceId) => set({ voiceId }),
      setNotificationsEnabled: (notificationsEnabled) =>
        set({ notificationsEnabled }),
      setReminderTime: (reminderTime) => set({ reminderTime }),
      setAutoPronounce: (autoPronounce) => set({ autoPronounce }),
    }),
    {
      name: "nce-settings",
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
