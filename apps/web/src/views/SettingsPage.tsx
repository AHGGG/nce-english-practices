import type { ComponentType, ReactNode } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Volume2, Gauge, Cloud, Loader2 } from "lucide-react";
import { useGlobalState } from "../context/GlobalContext";
import { probeTranscriptionService } from "../api/podcast";

// --- Reusable Components for Scalability ---

interface SettingsSectionProps {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}

const SettingsSection = ({
  title,
  icon: Icon,
  children,
}: SettingsSectionProps) => (
  <div className="bg-[#0a0f0d]/80 backdrop-blur-xl border border-white/10 p-8 rounded-2xl relative overflow-hidden group shadow-xl">
    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-primary/0 via-accent-primary/30 to-accent-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

    <h2 className="text-xl font-bold font-serif mb-8 flex items-center gap-3 text-white">
      <div className="p-2 rounded-lg bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
        <Icon className="w-5 h-5" />
      </div>
      {title}
    </h2>

    <div className="space-y-8 divide-y divide-white/5">{children}</div>
  </div>
);

interface SettingsRowProps {
  title: string;
  description: string;
  children: ReactNode;
}

const SettingsRow = ({ title, description, children }: SettingsRowProps) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-6 first:pt-0">
    <div className="flex-1">
      <h3 className="font-medium text-white text-base tracking-wide">
        {title}
      </h3>
      <p className="text-sm text-white/50 mt-1.5 max-w-lg leading-relaxed font-light">
        {description}
      </p>
    </div>
    <div className="shrink-0 flex items-center">{children}</div>
  </div>
);

interface ToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
}

const Toggle = ({ value, onChange }: ToggleProps) => (
  <button
    onClick={() => onChange(!value)}
    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:ring-offset-2 focus:ring-offset-[#0a0f0d] ${
      value
        ? "bg-accent-primary shadow-[0_0_15px_rgba(var(--color-accent-primary-rgb),0.4)]"
        : "bg-white/10 border border-white/10"
    }`}
  >
    <span
      className={`${
        value ? "translate-x-6 bg-black" : "translate-x-1 bg-white/80"
      } inline-block h-5 w-5 transform rounded-full transition-transform duration-300`}
    />
  </button>
);

interface SelectProps {
  options: Array<number | string>;
  value: number | string;
  onChange: (value: number | string) => void;
}

interface WebSettings {
  autoPronounce: boolean;
  podcastSpeed: number;
  transcriptionRemoteEnabled: boolean;
  transcriptionRemoteUrl: string;
  transcriptionRemoteApiKey?: string;
}

const Select = ({ options, value, onChange }: SelectProps) => (
  <div className="flex flex-wrap items-center gap-2 bg-black/20 rounded-xl p-1.5 border border-white/10">
    {options.map((opt) => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 ${
          value === opt
            ? "bg-accent-primary text-[#0a0f0d] shadow-lg shadow-accent-primary/20 scale-105"
            : "text-white/40 hover:text-white hover:bg-white/5"
        }`}
      >
        {typeof opt === "number" ? `${opt}x` : opt}
      </button>
    ))}
  </div>
);

// --- Main Page ---

const SettingsPage = () => {
  const navigate = useNavigate();
  const [probeLoading, setProbeLoading] = useState(false);
  const [probeMessage, setProbeMessage] = useState<string>("");
  const [probeSuccess, setProbeSuccess] = useState<boolean | null>(null);
  const {
    state: { settings },
    actions: { updateSetting },
  } = useGlobalState() as {
    state: { settings: WebSettings };
    actions: { updateSetting: (key: string, value: unknown) => void };
  };

  const SPEED_OPTIONS: number[] = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  const handleProbeTranscriptionService = async () => {
    const remoteUrl = settings.transcriptionRemoteUrl.trim();
    if (!remoteUrl) {
      setProbeSuccess(false);
      setProbeMessage("Please provide a server URL first.");
      return;
    }

    setProbeLoading(true);
    setProbeMessage("");
    setProbeSuccess(null);

    try {
      const result = await probeTranscriptionService(
        remoteUrl,
        settings.transcriptionRemoteApiKey || null,
      );
      setProbeSuccess(Boolean(result?.ok));
      setProbeMessage(result?.message || "Probe finished.");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Probe failed. Please check server URL and network.";
      setProbeSuccess(false);
      setProbeMessage(message);
    } finally {
      setProbeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f0d] relative overflow-hidden text-white font-sans">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0a1418] via-[#0c1815] to-[#0a0f0d] pointer-events-none" />
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-radial from-emerald-900/20 via-transparent to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-gradient-radial from-teal-900/10 via-transparent to-transparent blur-3xl" />
      </div>
      <div
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto p-6 md:p-12 pb-20">
        {/* Header */}
        <header className="mb-12 flex items-center gap-6">
          <button
            onClick={() => navigate("/nav")}
            className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.03] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all group"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-white flex items-center gap-4 tracking-tight">
              System Settings
            </h1>
            <div className="flex items-center gap-3 mt-3">
              <div className="h-px w-8 bg-accent-primary/50" />
              <p className="text-xs text-accent-primary font-mono uppercase tracking-widest">
                Configuration & Preferences
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-700">
          {/* General Settings */}
          <SettingsSection title="General Preferences" icon={Volume2}>
            <SettingsRow
              title="Auto-Pronunciation"
              description="Automatically play audio pronunciation when clicking words in Reading Mode or Sentence Study."
            >
              <Toggle
                value={settings.autoPronounce}
                onChange={(val) => updateSetting("autoPronounce", val)}
              />
            </SettingsRow>
          </SettingsSection>

          {/* Podcast Settings */}
          <SettingsSection title="Podcast Defaults" icon={Gauge}>
            <SettingsRow
              title="Default Playback Speed"
              description="Set the preferred playback speed for all podcast episodes. This will be applied when starting a new episode."
            >
              <Select
                options={SPEED_OPTIONS}
                value={settings.podcastSpeed}
                onChange={(val) =>
                  updateSetting(
                    "podcastSpeed",
                    typeof val === "number" ? val : 1,
                  )
                }
              />
            </SettingsRow>
          </SettingsSection>

          {/* Transcription Settings */}
          <SettingsSection title="Transcription Service" icon={Cloud}>
            <SettingsRow
              title="Remote Transcription"
              description="Offload transcription to a remote GPU server. Useful if running on a low-power device."
            >
              <Toggle
                value={settings.transcriptionRemoteEnabled}
                onChange={(val) =>
                  updateSetting("transcriptionRemoteEnabled", val)
                }
              />
            </SettingsRow>

            {settings.transcriptionRemoteEnabled && (
              <>
                <SettingsRow
                  title="Server URL"
                  description="The full URL of the remote transcription endpoint (e.g. http://192.168.1.100:8000/transcribe)."
                >
                  <input
                    type="text"
                    value={settings.transcriptionRemoteUrl}
                    onChange={(e) =>
                      updateSetting("transcriptionRemoteUrl", e.target.value)
                    }
                    placeholder="http://server:port/transcribe"
                    className="bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-accent-primary w-full max-w-xs font-mono"
                  />
                </SettingsRow>

                <SettingsRow
                  title="API Key"
                  description="Optional API key if the remote server requires authentication."
                >
                  <input
                    type="password"
                    value={settings.transcriptionRemoteApiKey || ""}
                    onChange={(e) =>
                      updateSetting("transcriptionRemoteApiKey", e.target.value)
                    }
                    placeholder="sk-..."
                    className="bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-accent-primary w-full max-w-xs font-mono"
                  />
                </SettingsRow>

                <SettingsRow
                  title="Connection Probe"
                  description="Manually test whether the configured server URL is reachable."
                >
                  <button
                    onClick={handleProbeTranscriptionService}
                    disabled={probeLoading}
                    className="inline-flex items-center gap-2 bg-accent-primary/20 hover:bg-accent-primary/30 disabled:opacity-60 disabled:cursor-not-allowed border border-accent-primary/40 text-accent-primary rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                  >
                    {probeLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      "Check Now"
                    )}
                  </button>
                </SettingsRow>

                {probeMessage && (
                  <div
                    className={`pt-2 text-sm ${
                      probeSuccess === null
                        ? "text-white/70"
                        : probeSuccess
                          ? "text-emerald-300"
                          : "text-rose-300"
                    }`}
                  >
                    {probeMessage}
                  </div>
                )}
              </>
            )}
          </SettingsSection>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
