import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useRef, useEffect } from "react";
import {
  Mic,
  Volume2,
  X,
  MessageSquare,
  Zap,
} from "lucide-react-native";
import { mobileVoiceClient } from "../../src/services/voice/MobileVoiceClient";
import { useSettingsStore } from "@nce/store";

interface TranscriptItem {
  id: string;
  text: string;
  isUser: boolean;
}

const GEMINI_VOICES = new Set(["Puck", "Charon", "Kore", "Fenrir", "Aoede"]);

function getGeminiVoiceName(voiceId: string) {
  if (GEMINI_VOICES.has(voiceId)) {
    return voiceId;
  }
  return "Puck";
}

export default function VoiceLabScreen() {
  const [status, setStatus] = useState<
    "disconnected" | "connecting" | "ready" | "listening" | "speaking"
  >("disconnected");
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Settings
  const { voiceId } = useSettingsStore();

  useEffect(() => {
    // Subscribe to events
    const unsubscribe = mobileVoiceClient.on((event) => {
      switch (event.type) {
        case "status":
          if (event.payload === "connected") setStatus("connecting");
          if (event.payload === "ready") setStatus("ready");
          if (event.payload === "disconnected") setStatus("disconnected");
          break;
        case "transcript":
          handleTranscript(event.payload.text, event.payload.isUser);
          break;
        case "audio_start":
          setStatus("speaking");
          break;
        case "audio_end":
          setStatus("ready");
          break;
        case "error":
          console.error("Voice Error:", event.payload);
          setStatus("disconnected");
          break;
      }
    });

    return () => {
      unsubscribe();
      mobileVoiceClient.disconnect();
    };
  }, []);

  const handleTranscript = (text: string, isUser: boolean) => {
    // Gemini sends partials or fulls? The backend sends "text" chunks.
    // We'll append to current if same speaker, or new bubble if switched.
    
    // Simplification: Just add new bubble for each message for now.
    // Ideally we debounce/stream update.
    
    setTranscripts((prev) => [
      ...prev,
      { id: Date.now().toString(), text, isUser },
    ]);
    
    // Auto-scroll
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const toggleSession = () => {
    if (status === "disconnected") {
      setStatus("connecting");
      const voiceName = getGeminiVoiceName(voiceId);
      mobileVoiceClient.connect({
        voiceName,
        systemInstruction: "You are a friendly English tutor. Keep responses concise.",
      });
    } else {
      mobileVoiceClient.disconnect();
      setStatus("disconnected");
    }
  };

  const handlePressIn = () => {
    if (status !== "ready" && status !== "speaking") return;
    setStatus("listening");
    mobileVoiceClient.startRecording();
  };

  const handlePressOut = () => {
    if (status !== "listening") return;
    setStatus("ready"); // Will switch to "speaking" when audio arrives
    mobileVoiceClient.stopRecordingAndSend();
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      {/* Header */}
      <View className="h-14 flex-row items-center justify-between px-4 border-b border-border-default bg-bg-surface">
        <View className="flex-row items-center">
          <Zap size={20} color="#00FF94" fill={status === "disconnected" ? "none" : "#00FF94"} />
          <Text className="text-text-primary font-bold ml-2 font-mono">
            NEURAL LINK
          </Text>
        </View>
        <View className="flex-row items-center">
          <View className={`w-2 h-2 rounded-full mr-2 ${
            status === "disconnected" ? "bg-red-500" : 
            status === "connecting" ? "bg-yellow-500" : "bg-green-500"
          }`} />
          <Text className="text-text-muted text-xs uppercase font-bold">
            {status}
          </Text>
        </View>
      </View>

      {/* Transcript Area */}
      <ScrollView 
        ref={scrollViewRef}
        className="flex-1 px-4 py-4"
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {transcripts.length === 0 && (
          <View className="items-center justify-center mt-20 opacity-30">
            <MessageSquare size={48} color="#fff" />
            <Text className="text-text-muted mt-4 text-center">
              Start the session to practice speaking.
            </Text>
          </View>
        )}

        {transcripts.map((t) => (
          <View
            key={t.id}
            className={`mb-4 max-w-[85%] rounded-2xl p-4 ${
              t.isUser
                ? "self-end bg-accent-primary/20 rounded-tr-none"
                : "self-start bg-bg-elevated rounded-tl-none border border-border-default"
            }`}
          >
            <Text className={`font-serif ${t.isUser ? "text-accent-primary" : "text-text-secondary"}`}>
              {t.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Controls */}
      <View className="p-6 pb-8 bg-bg-surface border-t border-border-default items-center">
        {status === "disconnected" ? (
          <TouchableOpacity
            className="w-full bg-accent-primary py-4 rounded-full flex-row items-center justify-center shadow-lg shadow-accent-primary/20"
            onPress={toggleSession}
          >
            <Mic size={24} color="#050505" />
            <Text className="text-bg-base font-bold text-lg ml-2">
              CONNECT
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="flex-row items-center gap-6 w-full justify-center">
            <TouchableOpacity
              className="w-12 h-12 rounded-full bg-bg-elevated border border-border-default items-center justify-center"
              onPress={() => {
                 mobileVoiceClient.disconnect();
                 setStatus("disconnected");
              }}
            >
              <X size={20} color="#FF0055" />
            </TouchableOpacity>

            <TouchableOpacity
              className={`w-24 h-24 rounded-full items-center justify-center border-4 ${
                status === "listening" 
                  ? "bg-accent-danger/20 border-accent-danger" 
                  : status === "speaking"
                  ? "bg-accent-info/20 border-accent-info"
                  : "bg-accent-primary/20 border-accent-primary"
              }`}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={0.8}
            >
              {status === "listening" ? (
                <Mic size={40} color="#FF0055" />
              ) : status === "speaking" ? (
                <Volume2 size={40} color="#00E0FF" />
              ) : (
                <Mic size={40} color="#00FF94" />
              )}
            </TouchableOpacity>
             
             <View className="w-12 h-12" /> 
          </View>
        )}
        
        {status !== "disconnected" && (
          <Text className="text-text-muted text-xs mt-4 font-mono">
            {status === "listening" ? "LISTENING..." : "HOLD TO SPEAK"}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}
