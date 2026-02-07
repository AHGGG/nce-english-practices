/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
} from "react";
import { ToastProvider } from "../components/ui/Toast";

const GlobalContext = createContext(null);

const DEFAULT_SETTINGS = {
  autoPronounce: true,
  podcastSpeed: 1.0,
  transcriptionRemoteEnabled: false,
  transcriptionRemoteUrl: "",
};

export const GlobalProvider = ({ children }) => {
  // Load settings from localStorage
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("user_settings");
      return saved
        ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
        : DEFAULT_SETTINGS;
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

  const updateSetting = (key, value) => {
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
