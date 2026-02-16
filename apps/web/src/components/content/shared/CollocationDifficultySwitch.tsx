import { useMemo } from "react";
import { useGlobalState } from "../../../context/GlobalContext";

const OPTIONS = [
  { value: "basic", label: "Basic", hint: "Hard Only" },
  { value: "core", label: "Core", hint: "Hard + Medium" },
  { value: "full", label: "Full", hint: "All" },
] as const;

export default function CollocationDifficultySwitch({
  compact = false,
}: {
  compact?: boolean;
}) {
  const {
    state: { settings },
    actions: { updateSetting },
  } = useGlobalState();

  const selected = useMemo(
    () => settings.collocationDisplayLevel || "core",
    [settings.collocationDisplayLevel],
  );

  return (
    <div
      className={`inline-flex items-center rounded-xl border border-white/10 bg-white/[0.03] p-1 ${compact ? "gap-1" : "gap-1.5"}`}
      title="Global collocation complexity level"
    >
      {OPTIONS.map((opt) => {
        const isActive = selected === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => updateSetting("collocationDisplayLevel", opt.value)}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
              isActive
                ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/40"
                : "text-white/55 hover:text-white hover:bg-white/8 border border-transparent"
            }`}
            title={`${opt.label} (${opt.hint})`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
