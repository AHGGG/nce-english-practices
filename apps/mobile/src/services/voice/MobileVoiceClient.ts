import { Audio } from "expo-av";
import { getApiBaseUrl } from "../../lib/platform-init";
import {
  readAsStringAsync,
  writeAsStringAsync,
  deleteAsync,
  cacheDirectory,
  EncodingType,
} from "expo-file-system/legacy";
import { useAuthStore } from "@nce/store";
import { addWavHeaderToBase64, OUTPUT_SAMPLE_RATE } from "./audioUtils";
import { Platform } from "react-native";

interface VoiceConfig {
  voiceName: string;
  systemInstruction: string;
}

type VoiceCallback = (event: VoiceEvent) => void;

interface VoiceEvent {
  type:
    | "transcript"
    | "audio_start"
    | "audio_end"
    | "interrupted"
    | "error"
    | "status";
  payload?: any;
}

export class MobileVoiceClient {
  private ws: WebSocket | null = null;
  private recording: Audio.Recording | null = null;
  private isConnected = false;
  private listeners: VoiceCallback[] = [];
  private audioQueue: string[] = []; // Paths to play
  private isPlaying = false;
  private currentSound: Audio.Sound | null = null;

  // Configuration for recording (Cross-platform)
  // We use AAC for Android (efficient, supported by Gemini) and PCM for iOS (standard)
  // Actually, let's use AAC/M4A for both to save bandwidth if Gemini supports it.
  // Gemini Live supports: audio/pcm, audio/wav, audio/mp3, audio/mpeg, audio/aac, audio/ogg, audio/flac.
  private recordingOptions: Audio.RecordingOptions = {
    android: {
      extension: ".m4a",
      outputFormat: Audio.AndroidOutputFormat.MPEG_4,
      audioEncoder: Audio.AndroidAudioEncoder.AAC,
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 32000,
    },
    ios: {
      extension: ".wav", // iOS likes WAV/PCM
      audioQuality: Audio.IOSAudioQuality.MEDIUM,
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 32000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {},
  };

  async connect(config: VoiceConfig) {
    if (this.ws) this.disconnect();

    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const baseUrl = getApiBaseUrl().replace(/^http/, "ws");
      const url = `${baseUrl}/ws/voice`;

      console.log(`Connecting to Voice Lab: ${url}`);
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log("Voice WS Connected");
        this.isConnected = true;
        this.emit("status", "connected");
        // Handshake
        this.ws?.send(JSON.stringify(config));
      };

      this.ws.onmessage = async (e) => {
        try {
          const msg = JSON.parse(e.data as string);
          this.handleMessage(msg);
        } catch (err) {
          console.error("WS Parse Error", err);
        }
      };

      this.ws.onerror = (e) => {
        console.error("WS Error", e);
        this.emit("error", "Connection error");
      };

      this.ws.onclose = () => {
        console.log("WS Closed");
        this.isConnected = false;
        this.emit("status", "disconnected");
      };
    } catch (e) {
      console.error("Connect Failed", e);
      this.emit("error", "Failed to connect");
    }
  }

  disconnect() {
    if (this.recording) {
      void this.recording.stopAndUnloadAsync().catch(() => {
        // ignore cleanup failures during disconnect
      });
      this.recording = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.stopPlayback();
  }

  async startRecording() {
    if (!this.isConnected) return;
    if (this.recording) return;

    try {
      // Stop playback if any (interrupt)
      this.stopPlayback();
      this.sendInterrupt(); // Tell backend to shut up

      const { recording } = await Audio.Recording.createAsync(
        this.recordingOptions,
      );
      this.recording = recording;
      console.log("Recording started");
    } catch (e) {
      console.error("Start Recording Failed", e);
      this.emit("error", "Recording failed");
    }
  }

  async stopRecordingAndSend() {
    if (!this.recording) return;

    try {
      console.log("Stopping recording...");
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();

      if (uri) {
        // Read file
        const base64Data = await readAsStringAsync(uri, {
          encoding: EncodingType.Base64,
        });

        // Determine mime type
        const mimeType = Platform.OS === "ios" ? "audio/wav" : "audio/aac";

        // Send
        this.ws?.send(
          JSON.stringify({
            type: "audio",
            data: base64Data,
            mimeType: mimeType,
          }),
        );
        console.log(`Sent audio (${base64Data.length} chars)`);
      }

      this.recording = null;
    } catch (e) {
      console.error("Stop/Send Failed", e);
    }
  }

  private sendInterrupt() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "interrupted" }));
    }
    // The current backend might not handle client-side "interrupted" message explicitly in receive_loop,
    // but sending audio usually interrupts the model anyway.
  }

  private async handleMessage(msg: any) {
    switch (msg.type) {
      case "server_ready":
        this.emit("status", "ready");
        break;
      case "transcript":
        this.emit("transcript", msg);
        break;
      case "audio":
        await this.queueAudio(msg.data);
        break;
      case "turnComplete":
        // Maybe visual cue?
        break;
      case "interrupted":
        this.stopPlayback();
        this.audioQueue = [];
        break;
    }
  }

  private async queueAudio(pcmBase64: string) {
    try {
      // 1. Convert PCM -> WAV (Add Header)
      const wavBase64 = addWavHeaderToBase64(pcmBase64, OUTPUT_SAMPLE_RATE);

      // 2. Save to temp file
      const filename = `voice_chunk_${Date.now()}_${Math.random().toString(36).substring(7)}.wav`;
      const path = cacheDirectory + filename;
      await writeAsStringAsync(path, wavBase64, {
        encoding: EncodingType.Base64,
      });

      // 3. Queue
      this.audioQueue.push(path);

      // 4. Trigger Playback if idle
      if (!this.isPlaying) {
        this.playNext();
      }
    } catch (e) {
      console.error("Queue Audio Failed", e);
    }
  }

  private async playNext() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      this.emit("audio_end", null);
      return;
    }

    this.isPlaying = true;
    const path = this.audioQueue.shift();
    if (!path) return;

    try {
      this.emit("audio_start", null);
      const { sound } = await Audio.Sound.createAsync(
        { uri: path },
        { shouldPlay: true },
      );
      this.currentSound = sound;

      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          await sound.unloadAsync();
          // Cleanup file
          deleteAsync(path, { idempotent: true });
          this.playNext();
        }
      });
    } catch (e) {
      console.error("Playback Failed", e);
      this.playNext(); // Skip error
    }
  }

  stopPlayback() {
    this.audioQueue = [];
    if (this.currentSound) {
      void this.currentSound.stopAsync().catch(() => {
        // ignore stop race while tearing down playback
      });
      void this.currentSound.unloadAsync().catch(() => {
        // ignore unload race while tearing down playback
      });
      this.currentSound = null;
    }
    this.isPlaying = false;
  }

  // Event Emitter logic
  on(callback: VoiceCallback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private emit(type: VoiceEvent["type"], payload?: any) {
    this.listeners.forEach((cb) => cb({ type, payload }));
  }
}

export const mobileVoiceClient = new MobileVoiceClient();
