import { Text, TouchableOpacity, View } from "react-native";

export type CollocationDisplayLevel = "basic" | "core" | "full";

interface CollocationLevelSwitchProps {
  value: CollocationDisplayLevel;
  onChange: (level: CollocationDisplayLevel) => void;
}

const OPTIONS: Array<{ key: CollocationDisplayLevel; label: string }> = [
  { key: "basic", label: "Basic" },
  { key: "core", label: "Core" },
  { key: "full", label: "Full" },
];

export default function CollocationLevelSwitch({
  value,
  onChange,
}: CollocationLevelSwitchProps) {
  return (
    <View className="self-start flex-row rounded-lg border border-border-default bg-bg-surface overflow-hidden">
      {OPTIONS.map((option) => {
        const active = value === option.key;
        return (
          <TouchableOpacity
            key={option.key}
            onPress={() => onChange(option.key)}
            className={`px-3 py-1.5 ${active ? "bg-accent-primary/20" : "bg-transparent"}`}
          >
            <Text
              className={`text-[10px] font-bold uppercase ${active ? "text-accent-primary" : "text-text-muted"}`}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
