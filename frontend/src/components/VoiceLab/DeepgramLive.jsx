
import React, { useState, useEffect, useRef } from 'react';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
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

            // 1. Get temp token from backend
            const response = await fetch('/api/deepgram/token');
            if (!response.ok) {
                throw new Error("Failed to get Deepgram token from backend");
            }
            const data = await response.json();
            const key = data.key;

            if (!key) throw new Error("No key received from backend");

            // 2. Setup Deepgram Client
            const deepgram = createClient(key);

            // 3. Create Live Connection
            const connection = deepgram.listen.live({
                model: "nova-3",
                language: "en-US",
                smart_format: true,
            });

            // 4. Handle Events
            connection.on(LiveTranscriptionEvents.Open, () => {
                setConnectionState('connected');
                console.log("Deepgram: Connected");
            });

            connection.on(LiveTranscriptionEvents.Close, () => {
                setConnectionState('disconnected');
                console.log("Deepgram: Disconnected");
                stopMicrophone();
            });

            connection.on(LiveTranscriptionEvents.Metadata, (data) => {
                // console.log("Deepgram Metadata:", data);
            });

            connection.on(LiveTranscriptionEvents.Transcript, (data) => {
                const received = data.channel.alternatives[0].transcript;
                if (received && received.length > 0) {
                    setTranscript(prev => prev + (prev ? ' ' : '') + received);
                }
            });

            connection.on(LiveTranscriptionEvents.Error, (err) => {
                console.error("Deepgram Error:", err);
                setError(err.message || "Deepgram Connection Error");
                setConnectionState('error');
            });

            connectionRef.current = connection;

            // 5. Setup Microphone
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            microphoneRef.current = new MediaRecorder(stream);

            microphoneRef.current.ondataavailable = (event) => {
                if (event.data.size > 0 && connection.getReadyState() === 1) {
                    connection.send(event.data);
                }
            };

            microphoneRef.current.start(100); // chunk every 100ms
            setIsListening(true);

        } catch (err) {
            console.error("Failed to start Deepgram:", err);
            setError(err.message);
            setConnectionState('error');
            stopMicrophone();
        }
    };

    const stopDeepgram = () => {
        if (connectionRef.current) {
            connectionRef.current.finish();
            connectionRef.current = null;
        }
        stopMicrophone();
        setConnectionState('disconnected');
        setIsListening(false);
    };

    const stopMicrophone = () => {
        if (microphoneRef.current && microphoneRef.current.state !== 'inactive') {
            microphoneRef.current.stop();
            microphoneRef.current.stream.getTracks().forEach(track => track.stop());
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
                    <div className="p-4 bg-bg-elevated rounded border border-ink-faint">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-mono text-ink-muted uppercase font-bold">State</span>
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
                            <div className="mb-4 p-2 bg-red-500/10 border border-red-500/50 text-red-500 text-xs rounded flex items-start gap-2">
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

                        <p className="mt-3 text-xs text-ink-muted text-center">
                            Uses Deepgram "Nova-3" Model via Browser SDK.
                        </p>
                    </div>
                </div>
            </Card>

            <Card title="Live Transcript" className="min-h-[300px] flex flex-col relative">
                 {transcript ? (
                    <div className="flex-grow bg-bg-elevated p-4 rounded border border-ink-faint font-serif text-lg leading-relaxed whitespace-pre-wrap animate-in fade-in h-64 overflow-y-auto">
                        {transcript}
                    </div>
                ) : (
                    <div className="flex-grow flex items-center justify-center text-ink-muted/30 font-mono text-sm h-64">
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
