
import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Tag } from '../ui';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

const DeepgramLive = () => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [connectionState, setConnectionState] = useState('disconnected'); // disconnected, connecting, connected, error
    const [error, setError] = useState(null);

    const microphoneRef = useRef(null);
    const connectionRef = useRef(null);

    const startDeepgram = async () => {
        try {
            setConnectionState('connecting');
            setError(null);
            setTranscript('');

            // 1. Setup Microphone
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // 2. Setup WebSocket Proxy
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            // Use nova-3 as default model
            const wsUrl = `${protocol}//${window.location.host}/api/voice-lab/deepgram/live-stt?model=nova-3`;

            const ws = new WebSocket(wsUrl);
            connectionRef.current = ws;

            ws.onopen = () => {
                setConnectionState('connected');
                console.log("Deepgram: Connected via Proxy");
                startMicrophone(stream, ws);
            };

            ws.onclose = () => {
                setConnectionState('disconnected');
                console.log("Deepgram: Disconnected");
                stopMicrophone(); // Ensure mic stops
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'transcript') {
                        if (msg.text) {
                            setTranscript(prev => prev + (prev ? ' ' : '') + msg.text);
                        }
                    } else if (msg.type === 'error') {
                        setError(msg.message);
                    }
                } catch (e) {
                    // ignore
                }
            };

            ws.onerror = (err) => {
                console.error("Deepgram Error:", err);
                setError("Connection Error");
                setConnectionState('error');
            };

            setIsListening(true);

        } catch (err) {
            console.error("Failed to start Deepgram:", err);
            setError(err.message);
            setConnectionState('error');
            stopMicrophone();
        }
    };

    const startMicrophone = (stream, ws) => {
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        microphoneRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                ws.send(event.data);
            }
        };

        mediaRecorder.start(250);
    };

    const stopDeepgram = () => {
        if (connectionRef.current) {
            connectionRef.current.close();
            connectionRef.current = null;
        }
        stopMicrophone();
        setConnectionState('disconnected');
        setIsListening(false);
    };

    const stopMicrophone = () => {
        if (microphoneRef.current) {
            if (microphoneRef.current.state !== 'inactive') {
                microphoneRef.current.stop();
                microphoneRef.current.stream.getTracks().forEach(track => track.stop());
            }
            microphoneRef.current = null;
        }
    };

    useEffect(() => {
        return () => {
            stopDeepgram();
        };
    }, []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Deepgram Control">
                <div className="space-y-6">
                    <div className="p-4 bg-bg-elevated rounded border border-border">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-mono text-text-muted uppercase font-bold">State</span>
                            <Tag
                                color={
                                    connectionState === 'connected' ? 'green' :
                                        connectionState === 'connecting' ? 'yellow' :
                                            connectionState === 'error' ? 'red' : 'gray'
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
                            isLoading={connectionState === 'connecting'}
                        >
                            {isListening ? (
                                <> <MicOff size={16} className="mr-2" /> Stop Transcription </>
                            ) : (
                                <> <Mic size={16} className="mr-2" /> Start Transcription </>
                            )}
                        </Button>

                        <p className="mt-3 text-xs text-text-muted text-center">
                            Uses Deepgram "Nova-3" Model via Proxy.
                        </p>
                    </div>
                </div>
            </Card>

            <Card title="Live Transcript" className="min-h-[300px] flex flex-col relative">
                {transcript ? (
                    <div className="flex-grow bg-bg-elevated p-4 rounded border border-border font-serif text-lg leading-relaxed whitespace-pre-wrap animate-in fade-in h-64 overflow-y-auto">
                        {transcript}
                    </div>
                ) : (
                    <div className="flex-grow flex items-center justify-center text-text-muted/30 font-mono text-sm h-64">
                        {isListening ? "Listening..." : "Ready to transcribe..."}
                    </div>
                )}
                {transcript && (
                    <div className="absolute top-4 right-4">
                        <Button variant="ghost" size="sm" onClick={() => setTranscript('')}>
                            Clear
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default DeepgramLive;
