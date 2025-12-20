import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Tag } from '../ui';
import { Mic, MicOff, AlertCircle, Activity, Server } from 'lucide-react';

const ElevenLabsLive = () => {
    // Connection State
    const [isListening, setIsListening] = useState(false);
    const [connectionState, setConnectionState] = useState('disconnected');
    const [error, setError] = useState(null);

    // Transcription Results
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [eventLog, setEventLog] = useState([]);

    // Refs
    const microphoneRef = useRef(null);
    const connectionRef = useRef(null);
    const eventLogRef = useRef(null);

    const addEvent = (type, message) => {
        const timestamp = new Date().toLocaleTimeString();
        setEventLog(prev => [...prev, { timestamp, type, message }].slice(-50));
    };

    const startSession = async () => {
        try {
            setConnectionState('connecting');
            setError(null);
            setEventLog([]);
            setTranscript('');
            setInterimTranscript('');

            // 1. Setup Microphone
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // 2. Connect to Backend Proxy
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            // Use the new endpoint
            const wsUrl = `${protocol}//${window.location.host}/api/voice-lab/elevenlabs/live-stt`;

            addEvent('info', `Connecting to: ${wsUrl}`);
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                setConnectionState('connected');
                addEvent('success', 'Connection opened');
                // Start capture
                startMediaRecorder(stream, ws);
            };

            ws.onclose = () => {
                setConnectionState('disconnected');
                addEvent('info', 'Connection closed');
                stopMicrophone();
            };

            ws.onerror = (err) => {
                console.error("WS Error", err);
                setError("WebSocket Connection Error");
                setConnectionState('error');
                addEvent('error', 'WebSocket Error');
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);

                    if (msg.type === 'ready') {
                        addEvent('success', 'Backend Proxy Ready');
                    }
                    else if (msg.type === 'transcript') {
                        const text = msg.text || "";
                        if (msg.is_final) {
                            setTranscript(prev => prev + (prev ? ' ' : '') + text);
                            setInterimTranscript('');
                        } else {
                            setInterimTranscript(text);
                        }
                    }
                    else if (msg.type === 'error') {
                        addEvent('error', msg.message);
                    }
                } catch (e) {
                    console.error("Parse Error", e);
                }
            };

            connectionRef.current = ws;
            setIsListening(true);

        } catch (err) {
            console.error("Failed to start:", err);
            setError(err.message);
            setConnectionState('error');
            addEvent('error', err.message);
            stopMicrophone();
        }
    };

    const startMediaRecorder = (stream, ws) => {
        // ElevenLabs Scribe accepts standard formats, but we send raw bytes to backend 
        // which then base64 encodes them.
        // We use 'audio/webm' as it is widely supported and backend can handle generic bytes usually
        // NOTE: ElevenLabs Scribe usually expects PCM/mp3/etc in chunk uploads?
        // Actually, the API docs say `audio_format` defaults to pcm_16000.
        // But `input_audio_chunk` documentation says "audio_base_64".
        // The backend proxy blindly forwards bytes from webm. 
        // Wait, ElevenLabs might NOT like WebM container if it expects raw PCM.
        // The API specification for `input_audio_chunk` usually implies raw PCM if `audio_format` is pcm_*.
        // Let's check implementation plan again.

        // Strategy: Use ScriptProcessor to get raw PCM float32 -> int16
        // This is safer for "realtime" APIs that expect PCM.
        startPCMAudio(stream, ws);
    };

    const startPCMAudio = (stream, ws) => {
        addEvent('info', 'Using PCM Capture (16kHz)');

        const audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 16000
        });

        const source = audioContext.createMediaStreamSource(stream);

        // Buffer size: 4096 samples = 256ms
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN) {
                const inputData = e.inputBuffer.getChannelData(0);
                // Convert float32 to int16 PCM bytes
                const pcmData = floatTo16BitPCM(inputData);
                ws.send(pcmData);
            }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        microphoneRef.current = {
            type: 'pcm',
            stream,
            audioContext,
            processor,
            source
        };
    };

    const floatTo16BitPCM = (float32Array) => {
        const buffer = new ArrayBuffer(float32Array.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < float32Array.length; i++) {
            let s = Math.max(-1, Math.min(1, float32Array[i]));
            view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        return buffer;
    };

    const stopMicrophone = () => {
        const mic = microphoneRef.current;
        if (mic) {
            if (mic.type === 'pcm') {
                mic.processor.disconnect();
                mic.source.disconnect();
                mic.audioContext.close();
                mic.stream.getTracks().forEach(track => track.stop());
            }
            microphoneRef.current = null;
        }
    };

    const stopSession = () => {
        const conn = connectionRef.current;
        if (conn) {
            conn.close();
            connectionRef.current = null;
        }
        stopMicrophone();
        setConnectionState('disconnected');
        setIsListening(false);
    };

    // Auto-scroll event log
    useEffect(() => {
        if (eventLogRef.current) {
            eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
        }
    }, [eventLog]);

    useEffect(() => {
        return () => {
            stopSession();
        };
    }, []);

    const getEventColor = (type) => {
        switch (type) {
            case 'success': return 'text-neon-green';
            case 'error': return 'text-red-500';
            default: return 'text-ink-muted';
        }
    };

    return (
        <div className="space-y-6">
            <Card title="ElevenLabs Realtime STT (Scribe)">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <Button
                            variant={isListening ? "danger" : "primary"}
                            onClick={isListening ? stopSession : startSession}
                            isLoading={connectionState === 'connecting'}
                        >
                            {isListening ? (
                                <> <MicOff size={16} className="mr-2" /> Stop Scribe </>
                            ) : (
                                <> <Mic size={16} className="mr-2" /> Start Scribe </>
                            )}
                        </Button>

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-ink-muted uppercase font-bold">State</span>
                            <Tag color={connectionState === 'connected' ? 'green' : connectionState === 'error' ? 'red' : 'gray'}>
                                {connectionState.toUpperCase()}
                            </Tag>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-2 bg-red-500/10 border border-red-500/50 text-red-500 text-xs rounded flex items-start gap-2">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-ink-muted font-mono uppercase">Live Transcript</h3>
                        <div className="min-h-[200px] bg-bg-elevated p-4 rounded border border-ink-faint font-serif text-lg leading-relaxed whitespace-pre-wrap">
                            {transcript || <span className="text-ink-muted/30 font-mono text-sm">Listening...</span>}
                            {interimTranscript && (
                                <span className="text-neon-cyan opacity-80 italic ml-1">{interimTranscript}</span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-ink-muted font-mono uppercase">Event Log</h3>
                        <div
                            ref={eventLogRef}
                            className="h-[200px] overflow-y-auto bg-bg-elevated p-4 rounded border border-ink-faint font-mono text-xs space-y-1"
                        >
                            {eventLog.map((event, idx) => (
                                <div key={idx} className="border-b border-ink-faint/30 pb-1 mb-1">
                                    <span className="text-ink-muted mr-2">{event.timestamp}</span>
                                    <span className={`font-bold ${getEventColor(event.type)}`}>
                                        [{event.type.toUpperCase()}]
                                    </span>
                                    <span className="ml-2 text-ink">{event.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ElevenLabsLive;
