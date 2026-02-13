import React, { useState, useEffect, useRef } from "react";
import { Card, Button, Tag, Select } from "../ui";
import { Play } from "lucide-react";

type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

interface ServerMessage {
  type?: string;
  message?: string;
}

const DeepgramStreamingTTS = () => {
  const [textInput, setTextInput] = useState(
    "Hello! This is a streaming Text to Speech test.",
  );
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [voice, setVoice] = useState("aura-2-asteria-en");
  const [bufferStatus, setBufferStatus] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isProcessingRef = useRef(false);
  const nextStartTimeRef = useRef(0);

  const setupAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContextCtor =
        window.AudioContext ||
        ((window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext as typeof AudioContext);
      audioContextRef.current = new AudioContextCtor({ sampleRate: 24000 });
    } else if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const processAudioQueue = async () => {
    if (isProcessingRef.current || audioQueueRef.current.length === 0) return;

    isProcessingRef.current = true;

    try {
      const ctx = setupAudioContext();

      while (audioQueueRef.current.length > 0) {
        const chunk = audioQueueRef.current.shift();
        if (!chunk) continue;
        setBufferStatus((prev) => Math.max(0, prev - 1));

        // Decode audio data
        // Note: The first chunk has WAV header, subsequent chunks might be raw PCM if concatenated?
        // Deepgram Streaming TTS sends raw PCM usually if container=none, OR container=wav sends full wav.
        // Our backend sends WAV header first, then raw PCM chunks.
        // AudioContext.decodeAudioData expects complete file structure usually, or specific frames.
        // Streaming decode is tricky with decodeAudioData.
        // BETTER STRATEGY:
        // Since backend sends linear16 PCM (plus header on first chunk), we can manually parse/play raw PCM
        // to avoid decodeAudioData issues with partial chunks.
        // Or accumulate?
        //
        // Let's rely on decodeAudioData being smart enough if we strip the header from subsequent chunks? No.
        //
        // Correct approach for Raw PCM (Linear16):
        // 1. Convert Int16 bytes to Float32
        // 2. Play with AudioBufferSource

        // Let's assume we receive raw PCM bytes (except first chunk has header).
        // Actually the backend sends header ONLY for the first chunk to act like a WAV file if saved.
        // For live playback, we should ignore header and play raw PCM.
        //
        // Let's just create a raw audio handler.

        const rawData = new Int16Array(
          chunk.buffer,
          chunk.byteOffset,
          chunk.byteLength / 2,
        );
        const float32Data = new Float32Array(rawData.length);
        for (let i = 0; i < rawData.length; i++) {
          float32Data[i] = rawData[i] / 0x8000;
        }

        const buffer = ctx.createBuffer(1, float32Data.length, 24000); // 24kHz match backend
        buffer.getChannelData(0).set(float32Data);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        // Schedule playback
        const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
        source.start(startTime);
        nextStartTimeRef.current = startTime + buffer.duration;
      }
    } catch (err) {
      console.error("Audio processing error:", err);
    }

    isProcessingRef.current = false;

    // Check if more arrived
    if (audioQueueRef.current.length > 0) processAudioQueue();
  };

  const connectWebSocket = () => {
    if (wsRef.current) return;

    try {
      setConnectionState("connecting");
      setError(null);

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/voice-lab/deepgram/streaming-tts?voice=${voice}`;

      const ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("TTS WebSocket Connected");
        setConnectionState("connected");
        // Allow user to click "Speak" now
      };

      ws.onmessage = async (event) => {
        if (typeof event.data === "string") {
          const msg = JSON.parse(event.data) as ServerMessage;
          if (msg.type === "error")
            setError(msg.message || "Unknown server error");
          if (msg.type === "flushed") console.log("Flushed");
        } else if (event.data instanceof ArrayBuffer) {
          // Audio Data received
          // Skip WAV header if present (first 44 bytes usually)
          // Simple check: RIFF header
          let data = event.data;
          const view = new DataView(data);

          // Rudimentary header skip if RIFF present
          if (data.byteLength > 44 && view.getUint32(0) === 0x52494646) {
            // RIFF
            data = data.slice(44);
          }

          audioQueueRef.current.push(new Int16Array(data));
          setBufferStatus((prev) => prev + 1);
          processAudioQueue();
        }
      };

      ws.onclose = () => {
        setConnectionState("disconnected");
        wsRef.current = null;
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      setConnectionState("error");
    }
  };

  const speakText = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connectWebSocket();
      // Wait for open? Or assume user clicks twice.
      // Better to connect on mount or explicitly.
      return;
    }

    // Init Audio Context on user gesture
    setupAudioContext();

    // Send text
    wsRef.current.send(
      JSON.stringify({
        type: "text",
        content: textInput,
      }),
    );

    // Allow chaining, but also we can flush
    wsRef.current.send(JSON.stringify({ type: "flush" }));
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "close" }));
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionState("disconnected");
  };

  // Connect on mount? Or manual? Manual is safer for quotas.
  useEffect(() => {
    return () => disconnect();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card title="Streaming TTS Config">
        <div className="space-y-6">
          <div className="p-4 bg-bg-elevated rounded border border-border">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-text-muted uppercase font-bold">
                Status
              </span>
              <Tag
                color={
                  connectionState === "connected"
                    ? "green"
                    : connectionState === "connecting"
                      ? "amber"
                      : connectionState === "error"
                        ? "pink"
                        : "gray"
                }
              >
                {connectionState.toUpperCase()}
              </Tag>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-mono text-text-muted mb-2">
                Voice
              </label>
              <Select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                disabled={connectionState === "connected"}
                options={[
                  { value: "aura-2-asteria-en", label: "Asteria (US Female)" },
                  { value: "aura-2-luna-en", label: "Luna (US Female)" },
                  { value: "aura-2-stella-en", label: "Stella (US Female)" },
                  { value: "aura-2-athena-en", label: "Athena (UK Female)" },
                ]}
              />
            </div>

            {connectionState !== "connected" ? (
              <Button
                fullWidth
                onClick={connectWebSocket}
                isLoading={connectionState === "connecting"}
              >
                Connect Server
              </Button>
            ) : (
              <Button fullWidth variant="danger" onClick={disconnect}>
                Disconnect
              </Button>
            )}

            <div className="mt-4 text-xs font-mono text-text-muted">
              Buffer Chunks: {bufferStatus}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Streaming Input">
        <div className="flex flex-col h-full space-y-4">
          <textarea
            className="w-full flex-grow p-3 bg-bg-base border border-border rounded font-serif text-lg focus:border-accent-info outline-none resize-none min-h-[150px]"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type text to stream..."
          />

          <div className="flex gap-2">
            <Button
              className="flex-1"
              variant="primary"
              onClick={speakText}
              disabled={connectionState !== "connected" || !textInput}
            >
              <Play size={16} className="mr-2" /> Speak Stream
            </Button>
            <Button variant="ghost" onClick={() => setTextInput("")}>
              Clear
            </Button>
          </div>

          {error && (
            <div className="p-2 bg-accent-danger/10 border border-accent-danger/50 text-accent-danger text-xs rounded">
              {error}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default DeepgramStreamingTTS;
