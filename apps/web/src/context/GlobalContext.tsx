/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useMemo, useEffect } from "react";
import type { ReactNode } from "react";
import { ToastProvider } from "../components/ui/Toast";

export interface GlobalSettings {
  autoPronounce: boolean;
  podcastSpeed: number;
  podcastKeymapMode: "standard" | "vim";
  collocationDisplayLevel: "basic" | "core" | "full";
  transcriptionRemoteEnabled: boolean;
  transcriptionRemoteUrl: string;
  transcriptionRemoteApiKey?: string;
}

interface GlobalContextValue {
  state: {
    settings: GlobalSettings;
  };
  actions: {
    updateSetting: <K extends keyof GlobalSettings>(
      key: K,
      value: GlobalSettings[K],
    ) => void;
  };
}

const GlobalContext = createContext<GlobalContextValue | null>(null);

const DEFAULT_SETTINGS = {
  autoPronounce: true,
  podcastSpeed: 1.0,
  podcastKeymapMode: "vim" as const,
  collocationDisplayLevel: "core" as const,
  transcriptionRemoteEnabled: false,
  transcriptionRemoteUrl: "",
};

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
  // Load settings from localStorage
  const [settings, setSettings] = useState<GlobalSettings>(() => {
    try {
      const saved = localStorage.getItem("user_settings");
      const parsed = saved
        ? (JSON.parse(saved) as Partial<GlobalSettings>)
        : null;
      return saved ? { ...DEFAULT_SETTINGS, ...parsed } : DEFAULT_SETTINGS;
    } catch (e) {
      console.warn("Failed to load settings:", e);
      return DEFAULT_SETTINGS;
    }
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("user_settings", JSON.stringify(settings));
    } catch (e) {
      console.warn("Failed to save settings:", e);
    }
  }, [settings]);

  const updateSetting = <K extends keyof GlobalSettings>(
    key: K,
    value: GlobalSettings[K],
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const value = useMemo(
    () => ({
      state: { settings },
      actions: { updateSetting },
    }),
    [settings],
  );

  return (
    <GlobalContext.Provider value={value}>
      <ToastProvider>{children}</ToastProvider>
    </GlobalContext.Provider>
  );
};

export const useGlobalState = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error("useGlobalState must be used within a GlobalProvider");
  }
  return context;
};
