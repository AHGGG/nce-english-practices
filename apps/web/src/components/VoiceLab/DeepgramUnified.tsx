import React, { useState, useEffect, useRef } from "react";
import { Card, Button, Tag } from "../ui";
import {
  Mic,
  MicOff,
  AlertCircle,
  Settings,
  Zap,
  Activity,
} from "lucide-react";

type ConnectionState = "disconnected" | "connecting" | "connected" | "error";
type ModelType = "nova-3" | "flux";

interface EventItem {
  timestamp: string;
  type: string;
  message: string;
  data?: unknown;
}

interface ProxyMessage {
  type?: string;
  model?: string;
  text?: string;
  is_final?: boolean;
  message?: string;
}

interface PCMController {
  type: "pcm";
  stream: MediaStream;
  audioContext: AudioContext;
  processor: ScriptProcessorNode;
  source: MediaStreamAudioSourceNode;
}

interface MediaRecorderController {
  type: "mediarecorder";
  stream: MediaStream;
  recorder: MediaRecorder;
}

type MicrophoneController = PCMController | MediaRecorderController;

const DeepgramUnified = () => {
  // Connection State
  const [isListening, setIsListening] = useState(false);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [error, setError] = useState<string | null>(null);

  // Model Configuration
  const [model, setModel] = useState<ModelType>("nova-3"); // 'nova-3' or 'flux'

  // Transcription Results
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [eventLog, setEventLog] = useState<EventItem[]>([]);

  // Advanced Info

  // Refs
  const microphoneRef = useRef<MicrophoneController | null>(null);
  const connectionRef = useRef<WebSocket | null>(null);
  const eventLogRef = useRef<HTMLDivElement | null>(null);

  const addEvent = (type: string, message: string, data: unknown = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setEventLog((prev) =>
      [...prev, { timestamp, type, message, data }].slice(-50),
    );
  };

  const startDeepgram = async () => {
    try {
      setConnectionState("connecting");
      setError(null);
      setEventLog([]);
      setTranscript("");
      setInterimTranscript("");

      // 1. Setup Microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 2. Connect to Backend Proxy
      // Note: We don't need a token here, the backend handles it.
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/voice-lab/deepgram/live-stt?model=${model}`;

      addEvent("info", `Connecting to Proxy: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnectionState("connected");
        addEvent("success", "Connection opened");

        // Start sending audio
        startMicrophone(stream, ws);
      };

      ws.onclose = () => {
        setConnectionState("disconnected");
        addEvent("info", "Connection closed");
        stopMicrophone();
      };

      ws.onerror = (err) => {
        console.error("WS Error", err);
        setError("WebSocket Connection Error");
        setConnectionState("error");
        addEvent("error", "WebSocket Error");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as ProxyMessage;

          if (msg.type === "ready") {
            addEvent("success", `Ready: ${msg.model}`);
          } else if (msg.type === "transcript") {
            const text = msg.text || "";
            if (msg.is_final) {
              setTranscript((prev) => prev + (prev ? " " : "") + text);
              setInterimTranscript("");
            } else {
              setInterimTranscript(text);
            }
          } else if (msg.type === "error") {
            addEvent("error", msg.message || "Unknown proxy error");
          } else {
            // console.log("Unknown msg", msg);
          }
        } catch {
          // ignore
        }
      };

      connectionRef.current = ws;
      setIsListening(true);
    } catch (err) {
      console.error("Failed to start:", err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setConnectionState("error");
      addEvent("error", `Failed to start: ${message}`);
      stopMicrophone();
    }
  };

  const startMicrophone = (stream: MediaStream, ws: WebSocket) => {
    if (model === "flux") {
      // Flux requires raw PCM audio (linear16)
      // Use Web Audio API to capture raw samples
      startPCMAudio(stream, ws);
    } else {
      // Nova can handle WebM containers
      startMediaRecorder(stream, ws);
    }
  };

  const startPCMAudio = (stream: MediaStream, ws: WebSocket) => {
    addEvent("info", "Using PCM audio (linear16) for Flux");

    const AudioContextCtor =
      window.AudioContext ||
      ((window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext as typeof AudioContext);
    const audioContext = new AudioContextCtor({
      sampleRate: 16000, // Flux recommended sample rate
    });

    const source = audioContext.createMediaStreamSource(stream);

    // Use ScriptProcessorNode for PCM capture (deprecated but widely supported)
    // Buffer size: 4096 samples at 16kHz = 256ms chunks
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      if (ws.readyState === WebSocket.OPEN) {
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert float32 to int16 PCM
        const pcmData = floatTo16BitPCM(inputData);
        ws.send(pcmData);
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    // Store refs for cleanup
    microphoneRef.current = {
      type: "pcm",
      stream,
      audioContext,
      processor,
      source,
    };

    addEvent(
      "success",
      `Microphone started (PCM @ ${audioContext.sampleRate}Hz)`,
    );
  };

  const floatTo16BitPCM = (float32Array: Float32Array) => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  };

  const startMediaRecorder = (stream: MediaStream, ws: WebSocket) => {
    const mimeType = "audio/webm;codecs=opus";
    addEvent("info", `Using MIME type: ${mimeType}`);

    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    microphoneRef.current = {
      type: "mediarecorder",
      stream,
      recorder: mediaRecorder,
    };

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
        ws.send(event.data);
      }
    };

    mediaRecorder.start(250); // 250ms chunks
    addEvent("success", "Microphone started (MediaRecorder)");
  };

  const stopDeepgram = () => {
    const conn = connectionRef.current;
    if (conn) {
      conn.close();
      connectionRef.current = null;
    }
    stopMicrophone();
    setConnectionState("disconnected");
    setIsListening(false);
    addEvent("info", "Stopped transcription");
  };

  const stopMicrophone = () => {
    const mic = microphoneRef.current;
    if (mic) {
      if (mic.type === "pcm") {
        // Cleanup PCM audio
        mic.processor.disconnect();
        mic.source.disconnect();
        void mic.audioContext.close();
        mic.stream.getTracks().forEach((track) => track.stop());
      } else if (mic.type === "mediarecorder") {
        // Cleanup MediaRecorder
        if (mic.recorder.state !== "inactive") {
          mic.recorder.stop();
        }
        mic.stream.getTracks().forEach((track) => track.stop());
      }
      microphoneRef.current = null;
    }
  };

  // Auto-scroll event log
  useEffect(() => {
    if (eventLogRef.current) {
      eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
    }
  }, [eventLog]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDeepgram();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getEventColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-accent-primary";
      case "error":
        return "text-accent-danger";
      case "transcript":
        return "text-text-primary";
      default:
        return "text-text-muted";
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Deepgram Unified (Proxy Mode)">
        <div className="space-y-6">
          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-text-muted uppercase flex items-center gap-2">
              <Zap size={14} />
              Model Selection
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setModel("nova-3")}
                disabled={isListening}
                className={`p-4 border-2 rounded-lg font-mono text-sm transition-all ${
                  model === "nova-3"
                    ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                    : "border-border text-text-muted hover:border-text-secondary"
                } ${isListening ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="font-bold">Nova-3</div>
                <div className="text-xs mt-1 opacity-70">
                  General Transcription
                </div>
              </button>
              <button
                onClick={() => setModel("flux")}
                disabled={isListening}
                className={`p-4 border-2 rounded-lg font-mono text-sm transition-all ${
                  model === "flux"
                    ? "border-accent-info bg-accent-info/10 text-accent-info"
                    : "border-border text-text-muted hover:border-text-secondary"
                } ${isListening ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="font-bold">Flux</div>
                <div className="text-xs mt-1 opacity-70">Conversational AI</div>
              </button>
            </div>
          </div>

          {/* Connection State & Controls */}
          <div className="p-4 bg-bg-elevated rounded border border-border">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-text-muted uppercase font-bold">
                State
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

            {error && (
              <div className="mb-4 p-2 bg-accent-danger/10 border border-accent-danger/50 text-accent-danger text-xs rounded flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              fullWidth
              variant={isListening ? "danger" : "primary"}
              onClick={isListening ? stopDeepgram : startDeepgram}
              isLoading={connectionState === "connecting"}
            >
              {isListening ? (
                <>
                  {" "}
                  <MicOff size={16} className="mr-2" /> Stop Transcription{" "}
                </>
              ) : (
                <>
                  {" "}
                  <Mic size={16} className="mr-2" /> Start Transcription{" "}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Transcript */}
        <Card title="Live Transcript" className="flex flex-col">
          <div className="flex-grow space-y-4">
            <div className="min-h-[200px] max-h-[300px] overflow-y-auto bg-bg-elevated p-4 rounded border border-border">
              {transcript ? (
                <div className="font-serif text-lg leading-relaxed whitespace-pre-wrap">
                  {transcript}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-text-muted/30 font-mono text-sm">
                  {isListening ? "Listening..." : "Ready to transcribe..."}
                </div>
              )}
            </div>

            {interimTranscript && (
              <div className="p-3 bg-accent-info/5 border border-accent-info/30 rounded">
                <div className="text-xs font-mono text-accent-info mb-1 flex items-center gap-2">
                  <Activity size={12} className="animate-pulse" />
                  INTERIM
                </div>
                <div className="font-serif text-base text-accent-info/80 italic">
                  {interimTranscript}
                </div>
              </div>
            )}

            {transcript && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTranscript("");
                  setInterimTranscript("");
                  // setLastResult(null);
                }}
              >
                Clear Transcript
              </Button>
            )}
          </div>
        </Card>

        {/* Event Log */}
        <Card title="Event Log" className="flex flex-col">
          <div
            ref={eventLogRef}
            className="flex-grow h-[400px] overflow-y-auto bg-bg-elevated p-4 rounded border border-border font-mono text-xs space-y-1"
          >
            {eventLog.length === 0 ? (
              <div className="flex items-center justify-center h-full text-text-muted/30">
                No events yet...
              </div>
            ) : (
              eventLog.map((event, idx) => (
                <div key={idx} className="border-b border-border/30 pb-1 mb-1">
                  <div className="flex items-start gap-2">
                    <span className="text-text-muted shrink-0">
                      {event.timestamp}
                    </span>
                    <span className={`font-bold ${getEventColor(event.type)}`}>
                      [{event.type.toUpperCase()}]
                    </span>
                  </div>
                  <div className="ml-2 text-text-primary mt-1">
                    {event.message}
                  </div>
                </div>
              ))
            )}
          </div>
          {eventLog.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEventLog([])}
              className="mt-2"
            >
              Clear Log
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DeepgramUnified;
