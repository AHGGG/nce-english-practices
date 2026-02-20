import { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "@nce/api";
import { ChevronLeft, Beaker, Mic, Volume2, Bot } from "lucide-react-native";

type Provider = "google" | "deepgram" | "elevenlabs" | "dashscope";

interface VoiceLabConfig {
  providers?: Record<string, unknown>;
  [key: string]: unknown;
}

export default function VoiceLabRoute() {
  const router = useRouter();
  const [provider, setProvider] = useState<Provider>("google");
  const [ttsText, setTtsText] = useState("Hello, this is a TTS test.");
  const [llmInput, setLlmInput] = useState("Give me a short speaking tip.");
  const [llmOutput, setLlmOutput] = useState("");
  const [loadingTts, setLoadingTts] = useState(false);
  const [loadingLlm, setLoadingLlm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["voice-lab", "config"],
    queryFn: () => apiGet("/api/voice-lab/config") as Promise<VoiceLabConfig>,
  });

  const availableProviders = useMemo(() => {
    const keys = Object.keys(data || {});
    return keys.length > 0
      ? keys.filter((k) =>
          ["google", "deepgram", "elevenlabs", "dashscope"].includes(k),
        )
      : ["google", "deepgram", "elevenlabs", "dashscope"];
  }, [data]);

  const handleTtsTest = async () => {
    if (!ttsText.trim()) return;
    setLoadingTts(true);
    try {
      await apiPost("/api/voice-lab/llm", {
        text: `Return exactly this sentence without changes: ${ttsText}`,
      });
    } finally {
      setLoadingTts(false);
    }
  };

  const handleLlmTest = async () => {
    if (!llmInput.trim()) return;
    setLoadingLlm(true);
    try {
      const result = (await apiPost("/api/voice-lab/llm", {
        text: llmInput,
      })) as { text?: string };
      setLlmOutput(result?.text || "(empty response)");
    } catch {
      setLlmOutput("Request failed.");
    } finally {
      setLoadingLlm(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <View className="h-14 flex-row items-center px-4 border-b border-border-default bg-bg-surface">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft color="#E0E0E0" size={24} />
        </TouchableOpacity>
        <View className="flex-row items-center ml-2">
          <Beaker size={16} color="#00FF94" />
          <Text className="text-text-primary font-bold ml-2 text-base">
            Voice Lab
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <Text className="text-text-muted text-xs uppercase font-bold mb-2">
          Provider
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {availableProviders.map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setProvider(p as Provider)}
              className={`px-3 py-2 rounded-lg border ${
                provider === p
                  ? "bg-accent-primary/10 border-accent-primary"
                  : "bg-bg-surface border-border-default"
              }`}
            >
              <Text
                className={`text-xs font-bold uppercase ${
                  provider === p ? "text-accent-primary" : "text-text-secondary"
                }`}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="bg-bg-surface border border-border-default rounded-xl p-4 mb-4">
          <View className="flex-row items-center mb-3">
            <Volume2 size={16} color="#00FF94" />
            <Text className="text-text-primary font-bold ml-2">
              Quick TTS Check
            </Text>
          </View>
          <TextInput
            value={ttsText}
            onChangeText={setTtsText}
            className="bg-bg-base border border-border-default rounded-lg px-3 py-2 text-text-primary"
            placeholder="Enter text"
            placeholderTextColor="#666"
            multiline
          />
          <TouchableOpacity
            onPress={handleTtsTest}
            disabled={loadingTts}
            className="mt-3 bg-accent-primary/10 border border-accent-primary/30 rounded-lg py-2 items-center"
          >
            {loadingTts ? (
              <ActivityIndicator size="small" color="#00FF94" />
            ) : (
              <Text className="text-accent-primary text-xs font-bold uppercase">
                Validate Text Path ({provider})
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="bg-bg-surface border border-border-default rounded-xl p-4 mb-4">
          <View className="flex-row items-center mb-3">
            <Bot size={16} color="#00E0FF" />
            <Text className="text-text-primary font-bold ml-2">
              LLM Loop Test
            </Text>
          </View>
          <TextInput
            value={llmInput}
            onChangeText={setLlmInput}
            className="bg-bg-base border border-border-default rounded-lg px-3 py-2 text-text-primary"
            placeholder="Ask something"
            placeholderTextColor="#666"
            multiline
          />
          <TouchableOpacity
            onPress={handleLlmTest}
            disabled={loadingLlm}
            className="mt-3 bg-accent-info/10 border border-accent-info/30 rounded-lg py-2 items-center"
          >
            {loadingLlm ? (
              <ActivityIndicator size="small" color="#00E0FF" />
            ) : (
              <Text className="text-accent-info text-xs font-bold uppercase">
                Run LLM Test
              </Text>
            )}
          </TouchableOpacity>
          {!!llmOutput && (
            <View className="mt-3 p-3 rounded-lg bg-bg-base border border-border-default">
              <Text className="text-text-secondary text-sm leading-6">
                {llmOutput}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={() => router.push("/voice")}
          className="bg-bg-surface border border-border-default rounded-xl p-4 flex-row items-center justify-center"
        >
          <Mic size={16} color="#00FF94" />
          <Text className="text-text-primary font-bold ml-2">
            Open Voice Mode Conversation
          </Text>
        </TouchableOpacity>

        <View className="mt-4">
          <Text className="text-text-muted text-xs">
            Config loaded:{" "}
            {isLoading
              ? "loading..."
              : Object.keys(data || {}).join(", ") || "none"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
