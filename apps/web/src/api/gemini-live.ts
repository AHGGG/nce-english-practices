/**
 * Gemini Live API Client (Proxy Mode)
 * Connects to local backend /ws/voice which proxies to Gemini.
 */

interface ConnectOptions {
  systemInstruction: string;
  voiceName?: string;
}

interface ServerMessage {
  type?: "audio" | "transcript" | "interrupted" | "server_ready" | string;
  data?: string;
  text?: string;
  isUser?: boolean;
}

type AudioContextLike = AudioContext;

const getAudioContextCtor = (): typeof AudioContext => {
  const maybeWebkit = (
    window as Window & { webkitAudioContext?: typeof AudioContext }
  ).webkitAudioContext;
  return window.AudioContext || maybeWebkit || AudioContext;
};

export class GeminiLiveClient {
  wsUrl: string;
  ws: WebSocket | null = null;
  audioContext: AudioContextLike | null = null;
  workletNode: AudioWorkletNode | null = null;
  source: MediaStreamAudioSourceNode | null = null;
  stream: MediaStream | null = null;
  isConnected = false;
  nextStartTime = 0;
  outputAudioContext: AudioContextLike | null = null;

  onDisconnect: () => void = () => {};
  onAudioLevel: (level: number) => void = () => {};
  onTranscript: (text: string, isUser?: boolean) => void = () => {};
  onError: (error: unknown) => void = () => {};

  constructor(url = "") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    this.wsUrl = url || `${protocol}//${window.location.host}/ws/voice`;
  }

  async connect({ systemInstruction, voiceName = "Puck" }: ConnectOptions) {
    console.log("Connecting to Voice Proxy:", this.wsUrl);
    try {
      await this.initAudio();
      await this.connectWebSocket(systemInstruction, voiceName);
      await this.startStreaming();
      this.isConnected = true;
      console.log("Voice connection fully established");
    } catch (error) {
      console.error("Connection failed:", error);
      this.onError(error);
      this.disconnect();
      throw error;
    }
  }

  private async initAudio() {
    const AudioContextCtor = getAudioContextCtor();

    try {
      this.audioContext = new AudioContextCtor({ sampleRate: 16000 });
    } catch {
      console.warn("16kHz not supported");
      this.audioContext = new AudioContextCtor();
    }

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    try {
      this.outputAudioContext = new AudioContextCtor();
      if (this.outputAudioContext.state === "suspended") {
        await this.outputAudioContext.resume();
      }
    } catch {
      this.outputAudioContext = this.audioContext;
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  }

  private connectWebSocket(systemInstruction: string, voiceName: string) {
    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      const timeout = window.setTimeout(() => {
        reject(new Error("WebSocket connection timeout"));
      }, 10000);

      this.ws.onopen = () => {
        this.ws?.send(JSON.stringify({ voiceName, systemInstruction }));
      };

      this.ws.onmessage = async (event) => {
        const msg = await this.handleMessage(event.data);
        if (msg?.type === "server_ready") {
          window.clearTimeout(timeout);
          resolve();
        }
      };

      this.ws.onerror = (error) => {
        window.clearTimeout(timeout);
        reject(error);
      };

      this.ws.onclose = () => {
        window.clearTimeout(timeout);
        if (this.isConnected) {
          this.disconnect();
        }
      };
    });
  }

  private async startStreaming() {
    if (!this.audioContext || !this.stream) {
      throw new Error("Audio not initialized");
    }

    this.source = this.audioContext.createMediaStreamSource(this.stream);

    if (this.audioContext.audioWorklet) {
      try {
        await this.audioContext.audioWorklet.addModule("/audio-worklet.js");
        this.workletNode = new AudioWorkletNode(
          this.audioContext,
          "audio-recorder-processor",
        );
        this.workletNode.port.onmessage = (event) => {
          this.processAudioData(event.data as Float32Array);
        };
        this.source.connect(this.workletNode);
        return;
      } catch (error) {
        console.warn("AudioWorklet failed", error);
      }
    }

    console.warn(
      "AudioWorklet failed/not supported. Fallback not implemented in this port yet.",
    );
  }

  private processAudioData(float32Data: Float32Array) {
    if (
      !this.ws ||
      this.ws.readyState !== WebSocket.OPEN ||
      !this.audioContext
    ) {
      return;
    }

    let processedData = float32Data;
    if (this.audioContext.sampleRate !== 16000) {
      processedData = this.resample(
        float32Data,
        this.audioContext.sampleRate,
        16000,
      );
    }

    const int16Array = new Int16Array(processedData.length);
    for (let i = 0; i < processedData.length; i += 1) {
      const sample = Math.max(-1, Math.min(1, processedData[i]));
      int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    const bytes = new Uint8Array(int16Array.buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }

    const base64 = btoa(binary);
    this.ws.send(JSON.stringify({ type: "audio", data: base64 }));

    let sum = 0;
    for (let i = 0; i < float32Data.length; i += 50) {
      sum += Math.abs(float32Data[i]);
    }
    this.onAudioLevel(sum / (float32Data.length / 50));
  }

  private resample(data: Float32Array, fromRate: number, toRate: number) {
    if (fromRate === toRate) return data;

    const ratio = fromRate / toRate;
    const newLength = Math.round(data.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i += 1) {
      const index = Math.floor(i * ratio);
      const frac = i * ratio - index;
      result[i] =
        index + 1 < data.length
          ? data[index] * (1 - frac) + data[index + 1] * frac
          : data[index];
    }

    return result;
  }

  private async handleMessage(data: string): Promise<ServerMessage | null> {
    try {
      const msg = JSON.parse(data) as ServerMessage;
      if (msg.type === "audio" && typeof msg.data === "string") {
        this.playAudioResponse(msg.data);
      } else if (msg.type === "transcript" && typeof msg.text === "string") {
        this.onTranscript(msg.text, msg.isUser);
      } else if (msg.type === "interrupted") {
        this.clearAudioQueue();
      }
      return msg;
    } catch {
      return null;
    }
  }

  private playAudioResponse(base64Data: string) {
    const ctx = this.outputAudioContext;
    if (!ctx) return;

    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i += 1) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i += 1) {
        float32[i] = int16[i] / 32768.0;
      }

      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const startTime = Math.max(ctx.currentTime, this.nextStartTime);
      source.start(startTime);
      this.nextStartTime = startTime + buffer.duration;
    } catch (error) {
      console.error(error);
    }
  }

  clearAudioQueue() {
    this.nextStartTime = this.outputAudioContext
      ? this.outputAudioContext.currentTime
      : 0;
  }

  disconnect() {
    this.isConnected = false;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      void this.audioContext.close();
    }

    if (
      this.outputAudioContext &&
      this.outputAudioContext !== this.audioContext &&
      this.outputAudioContext.state !== "closed"
    ) {
      void this.outputAudioContext.close();
    }

    this.onDisconnect();
  }
}
