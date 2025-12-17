import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Tag, Select } from '../ui';
import { Mic, MicOff, Bot, User, Volume2, Cpu } from 'lucide-react';

const DeepgramVoiceAgent = () => {
    const [isActive, setIsActive] = useState(false);
    const [connectionState, setConnectionState] = useState('disconnected');
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState(null);
    const [config, setConfig] = useState({
        stt_model: 'nova-3',
        tts_voice: 'aura-2-asteria-en',
        llm_provider: 'deepseek',
        system_prompt: 'You are a helpful and concise AI assistant.'
    });

    const wsRef = useRef(null);
    const microphoneRef = useRef(null);
    const audioContextRef = useRef(null);
    const audioQueueRef = useRef([]);
    const nextStartTimeRef = useRef(0);
    const chatContainerRef = useRef(null);

    // Audio Playback Logic (Shared with TTS Streaming)
    const playAudioChunk = (data) => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        const ctx = audioContextRef.current;

        // Skip header if RIFF
        let bufferData = data;
        const view = new DataView(data);
        if (data.byteLength > 44 && view.getUint32(0) === 0x52494646) {
            bufferData = data.slice(44);
        }

        const rawData = new Int16Array(bufferData);
        const float32Data = new Float32Array(rawData.length);
        for (let i = 0; i < rawData.length; i++) {
            float32Data[i] = rawData[i] / 0x8000;
        }

        const buffer = ctx.createBuffer(1, float32Data.length, 24000);
        buffer.getChannelData(0).set(float32Data);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
        source.start(startTime);
        nextStartTimeRef.current = startTime + buffer.duration;
    };

    const startAgent = async () => {
        try {
            setConnectionState('connecting');
            setError(null);

            // 1. Microphone
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { channelCount: 1, sampleRate: 16000 }
            });

            // 2. WebSocket
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const params = new URLSearchParams(config).toString();
            const wsUrl = `${protocol}//${window.location.host}/api/voice-lab/deepgram/voice-agent?${params}`;

            const ws = new WebSocket(wsUrl);
            ws.binaryType = 'arraybuffer';
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('Agent Connected');
                setConnectionState('connected');
                startMicrophone(stream, ws);
                setIsActive(true);
            };

            ws.onmessage = (event) => {
                if (typeof event.data === 'string') {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'transcript') {
                        addMessage('user', msg.text);
                    } else if (msg.type === 'llm_response') {
                        addMessage('ai', msg.text);
                    } else if (msg.type === 'error') {
                        setError(msg.message);
                    }
                } else if (event.data instanceof ArrayBuffer) {
                    playAudioChunk(event.data);
                }
            };

            ws.onerror = (e) => {
                console.error(e);
                setError('WebSocket Error');
                setConnectionState('error');
            };

            ws.onclose = () => {
                stopAgent();
            };

        } catch (err) {
            setError(err.message);
            setConnectionState('error');
        }
    };

    const startMicrophone = (stream, ws) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN) {
                const inputData = e.inputBuffer.getChannelData(0);
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
    };

    const stopAgent = () => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (microphoneRef.current) {
            microphoneRef.current.stop();
            microphoneRef.current = null;
        }
        setIsActive(false);
        setConnectionState('disconnected');
    };

    const addMessage = (role, text) => {
        setMessages(prev => [...prev, { role, text, timestamp: new Date().toISOString() }]);
        // Auto scroll
        setTimeout(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
        }, 100);
    };

    useEffect(() => {
        return () => stopAgent();
    }, []);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
            {/* Configuration Column */}
            <div className="lg:col-span-1 space-y-6">
                <Card title="Agent Settings">
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-mono text-ink-muted">STT Model</label>
                            <Select
                                value={config.stt_model}
                                onChange={e => setConfig({ ...config, stt_model: e.target.value })}
                                disabled={isActive}
                                options={[
                                    { value: 'nova-3', label: 'Nova-3' },
                                    { value: 'flux', label: 'Flux' }
                                ]}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-mono text-ink-muted">LLM Provider</label>
                            <Select
                                value={config.llm_provider}
                                onChange={e => setConfig({ ...config, llm_provider: e.target.value })}
                                disabled={isActive}
                                options={[
                                    { value: 'deepseek', label: 'DeepSeek' },
                                    { value: 'gemini', label: 'Gemini' }
                                ]}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-mono text-ink-muted">Voice</label>
                            <Select
                                value={config.tts_voice}
                                onChange={e => setConfig({ ...config, tts_voice: e.target.value })}
                                disabled={isActive}
                                options={[
                                    { value: 'aura-2-asteria-en', label: 'Asteria' },
                                    { value: 'aura-2-luna-en', label: 'Luna' }
                                ]}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-mono text-ink-muted">Prompt</label>
                            <textarea
                                className="w-full text-xs p-2 bg-bg-base border border-ink-faint rounded"
                                value={config.system_prompt}
                                onChange={e => setConfig({ ...config, system_prompt: e.target.value })}
                                disabled={isActive}
                                rows={3}
                            />
                        </div>

                        <Button
                            fullWidth
                            variant={isActive ? "danger" : "neon"}
                            onClick={isActive ? stopAgent : startAgent}
                            isLoading={connectionState === 'connecting'}
                        >
                            {isActive ? (
                                <> <MicOff size={16} className="mr-2" /> End Session </>
                            ) : (
                                <> <Mic size={16} className="mr-2" /> Start Voice Agent </>
                            )}
                        </Button>

                        {error && (
                            <div className="text-red-500 text-xs mt-2">{error}</div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Chat Column */}
            <div className="lg:col-span-2 h-full">
                <Card title="Live Conversation" className="h-full flex flex-col">
                    <div
                        ref={chatContainerRef}
                        className="flex-grow overflow-y-auto space-y-4 p-4 bg-bg-base rounded-md"
                    >
                        {messages.length === 0 && (
                            <div className="text-center text-ink-muted/30 py-10">
                                <Bot size={48} className="mx-auto mb-2" />
                                <p>Start speaking to begin conversation</p>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user'
                                        ? 'bg-ink/5 border border-ink/10 text-ink'
                                        : 'bg-neon-cyan/5 border border-neon-cyan/20 text-neon-cyan'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-1 opacity-50 text-xs">
                                        {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                                        <span>{msg.role.toUpperCase()}</span>
                                    </div>
                                    <p className="text-sm leading-relaxed">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default DeepgramVoiceAgent;
