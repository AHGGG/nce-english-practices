// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Tag, Select } from '../ui';
import { Mic, MicOff, AlertCircle, Activity } from 'lucide-react';

const DeepgramFlux = () => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [connectionState, setConnectionState] = useState('disconnected');
    const [error, setError] = useState(null);
    const [model, setModel] = useState('nova-3');
    const [metrics, setMetrics] = useState({ confidence: null, finality: 0 });

    const wsRef = useRef(null);
    const microphoneRef = useRef(null);
    const transcriptRef = useRef('');

    const startStreaming = async () => {
        try {
            setConnectionState('connecting');
            setError(null);
            setTranscript('');
            setInterimTranscript('');

            // 1. Get Microphone Access (16kHz mono)
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000
                }
            });

            // 2. Setup WebSocket
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/api/voice-lab/deepgram/live-stt?model=${model}`;

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('WebSocket Connected');
                setConnectionState('connected');

                // Start recording/sending audio
                startMicrophone(stream, ws);
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === 'transcript') {
                    if (data.is_final) {
                        setTranscript(prev => {
                            const newText = prev + (prev ? ' ' : '') + data.text;
                            transcriptRef.current = newText;
                            return newText;
                        });
                        setInterimTranscript('');

                        // Update metrics
                        setMetrics({
                            confidence: data.confidence,
                            finality: prev => prev + 1
                        });
                    } else {
                        setInterimTranscript(data.text);
                    }
                } else if (data.type === 'error') {
                    setError(data.message);
                } else if (data.type === 'ready') {
                    console.log(`Deepgram Ready: ${data.model}`);
                }
            };

            ws.onerror = (e) => {
                console.error('WebSocket Error:', e);
                setError('WebSocket connection error');
                setConnectionState('error');
            };

            ws.onclose = () => {
                console.log('WebSocket Closed');
                if (isListening) stopStreaming();
                setConnectionState('disconnected');
            };

        } catch (err) {
            console.error("Failed to start:", err);
            setError(err.message);
            setConnectionState('error');
            setInterimTranscript('');
            setIsListening(false);
        }
    };

    const startMicrophone = (stream, ws) => {
        // Use MediaRecorder to get raw audio blobs
        // Note: For best results with Deepgram, we often need raw PCM.
        // But the browser's MediaRecorder typically gives WebM/Ogg.
        // Our backend handler is using Deepgram SDK's smart decoding, 
        // OR we should ensure we send what Deepgram expects.
        // The backend `deepgram_websocket.py` sets encoding="linear16" which expects raw PCM.
        // Sending WebM blob directly to `linear16` endpoint might fail if Deepgram doesn't auto-detect container.
        // However, Deepgram *can* handle container formats if we don't force 'linear16' or if we use valid container.
        // Let's try sending raw blobs first. If it fails, we need AudioWorklet for PCM.
        // 
        // WAIT: The backend code sets `encoding="linear16"`. This implies raw PCM.
        // WebM is NOT linear16. We need to convert or change backend to "multistream" or remove encoding param.
        // BUT, let's look at the implementation plan again.
        // 
        // Simple Solution: Use MediaRecorder but send small chunks.
        // Better Solution for "linear16": Use ScriptProcessor or AudioWorklet to get Float32, convert to Int16.

        const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN) {
                const inputData = e.inputBuffer.getChannelData(0);
                // Convert Float32 to Int16
                const int16Data = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]));
                    int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                ws.send(int16Data.buffer);
            }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        microphoneRef.current = {
            stop: () => {
                processor.disconnect();
                source.disconnect();
                stream.getTracks().forEach(track => track.stop());
                audioContext.close();
            }
        };

        setIsListening(true);
    };

    const stopStreaming = () => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (microphoneRef.current) {
            microphoneRef.current.stop();
            microphoneRef.current = null;
        }
        setIsListening(false);
        setConnectionState('disconnected');
    };

    useEffect(() => {
        return () => {
            stopStreaming();
        };
    }, []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Configuration">
                <div className="space-y-6">
                    <div className="p-4 bg-bg-elevated rounded border border-border">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-mono text-text-muted uppercase font-bold">Status</span>
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

                        <div className="mb-4">
                            <label className="block text-xs font-mono text-text-muted mb-2">Model</label>
                            <Select
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                disabled={isListening}
                                options={[
                                    { value: 'nova-3', label: 'Nova-3 (General)' },
                                    { value: 'flux', label: 'Flux (Conversational)' },
                                    { value: 'nova-2', label: 'Nova-2 (Legacy)' }
                                ]}
                            />
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
                            onClick={isListening ? stopStreaming : startStreaming}
                            isLoading={connectionState === 'connecting'}
                        >
                            {isListening ? (
                                <> <MicOff size={16} className="mr-2" /> Stop Live STT </>
                            ) : (
                                <> <Mic size={16} className="mr-2" /> Start Live STT </>
                            )}
                        </Button>

                        {metrics.confidence && (
                            <div className="mt-4 pt-4 border-t border-border">
                                <div className="flex justify-between text-xs font-mono mb-1">
                                    <span className="text-text-muted">Last Confidence</span>
                                    <span className={metrics.confidence > 0.8 ? "text-accent-primary" : "text-accent-warning"}>
                                        {(metrics.confidence * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs font-mono">
                                    <span className="text-text-muted">Utterances</span>
                                    <span>{metrics.finality}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <Card title="Real-time Transcript" className="min-h-[300px] flex flex-col relative">
                <div className="flex-grow bg-bg-elevated p-4 rounded border border-border font-serif text-lg leading-relaxed whitespace-pre-wrap h-64 overflow-y-auto">
                    {transcript}
                    <span className="text-text-muted italic">{interimTranscript}</span>
                    {isListening && !interimTranscript && (
                        <span className="animate-pulse inline-block w-2 h-4 bg-accent-primary ml-1 align-middle"></span>
                    )}
                </div>

                <div className="absolute top-4 right-4 flex gap-2">
                    <span className="text-xs font-mono bg-bg-base px-2 py-1 rounded border border-border text-text-muted flex items-center gap-1">
                        <Activity size={12} />
                        WebSocket
                    </span>
                </div>

                {transcript && (
                    <div className="absolute bottom-4 right-4">
                        <Button variant="ghost" size="sm" onClick={() => setTranscript('')}>
                            Clear
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default DeepgramFlux;
