import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Tag, Select } from '../ui';
import { Mic, MicOff, Bot, User, Volume2, Cpu } from 'lucide-react';

const ElevenLabsVoiceAgent = () => {
    const [isActive, setIsActive] = useState(false);
    const [connectionState, setConnectionState] = useState('disconnected');
    const [messages, setMessages] = useState([]);
    const [pendingTranscript, setPendingTranscript] = useState(''); // Live transcript being spoken
    const [error, setError] = useState(null);
    const [config, setConfig] = useState({
        voice_id: 'JBFqnCBsd6RMkjVDRZzb',
        model_id: 'eleven_turbo_v2_5',
        llm_provider: 'deepseek',
        system_prompt: 'You are a helpful and concise AI assistant.'
    });

    const wsRef = useRef(null);
    const microphoneRef = useRef(null);
    const audioContextRef = useRef(null);
    const audioQueueRef = useRef([]);
    const nextStartTimeRef = useRef(0);
    const chatContainerRef = useRef(null);
    const activeSourceRef = useRef(null);

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

        // Schedule playback
        // For barge-in, we want to play ASAP if we just interrupted, or verify timing
        const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
        source.start(startTime);
        nextStartTimeRef.current = startTime + buffer.duration;

        // Track the potentially playing source (only tracks most recent, but better than nothing)
        // Ideally we track all pending sources, but usually they play sequentially.
        // We only really care about stopping the currently hearing one.
        // Since they are sequential, stopping the 'last added' one might not be enough if it hasn't started?
        // Actually, to truly stop all, we need to track them all.
        // But simply closing/suspending worked? No user said it didn't.
        // Maybe "suspend" worked but didn't clear the buffer?

        // BETTER STRATEGY: 
        // 1. Store sources in a list.
        // 2. On interrupt, loop through list and stop() all.
        // 3. Clear list.

        source.onended = () => {
            // Remove from list
            audioQueueRef.current = audioQueueRef.current.filter(s => s !== source);
        };
        audioQueueRef.current.push(source);
    };

    // Interrupt / Stop current playback
    const interruptAudio = () => {
        // Stop all scheduled sources
        if (audioQueueRef.current.length > 0) {
            console.log("Interrupting audio playback...");
            audioQueueRef.current.forEach(source => {
                try {
                    source.stop();
                    source.disconnect();
                } catch (e) {
                    // ignore if already stopped
                }
            });
        }
        audioQueueRef.current = [];

        if (audioContextRef.current) {
            // Reset timing target to "now" so new audio starts immediately
            nextStartTimeRef.current = audioContextRef.current.currentTime;
        }
    };



    const startAgent = async () => {
        try {
            setConnectionState('connecting');
            setError(null);

            // 1. Microphone
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // 2. WebSocket
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const params = new URLSearchParams(config).toString();
            // Point to the correct endpoint
            const wsUrl = `${protocol}//${window.location.host}/api/voice-lab/elevenlabs/voice-agent?${params}`;

            const ws = new WebSocket(wsUrl);
            ws.binaryType = 'arraybuffer';
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('ElevenLabs Agent Connected');
                setConnectionState('connected');
                // ElevenLabs STT expects PCM 16000
                startPCMAudio(stream, ws);
                setIsActive(true);
            };

            ws.onmessage = (event) => {
                if (typeof event.data === 'string') {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'transcript') {
                        if (msg.is_final) {
                            // Final result: add to messages and clear pending
                            addMessage('user', msg.text);
                            setPendingTranscript('');
                        } else {
                            // Interim result: update pending transcript for live display
                            setPendingTranscript(msg.text);
                            // BARGE-IN: User is speaking -> Stop AI audio
                            interruptAudio();
                        }
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

    const startPCMAudio = (stream, ws) => {
        // ElevenLabs Scribe v2 expects 16kHz
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 16000
        });

        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN) {
                const inputData = e.inputBuffer.getChannelData(0);
                // Convert float32 to int16 PCM
                const buffer = new ArrayBuffer(inputData.length * 2);
                const view = new DataView(buffer);
                for (let i = 0; i < inputData.length; i++) {
                    let s = Math.max(-1, Math.min(1, inputData[i]));
                    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                }
                ws.send(buffer);
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

    const stopAgent = () => {
        // 1. Close AudioContext to stop all scheduled audio playback
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        // Reset audio scheduling
        audioQueueRef.current = [];
        nextStartTimeRef.current = 0;

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        const mic = microphoneRef.current;
        if (mic) {
            // Cleanup PCM audio
            mic.processor.disconnect();
            mic.source.disconnect();
            mic.audioContext.close();
            mic.stream.getTracks().forEach(track => track.stop());
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

    // Scroll to bottom whenever messages change
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, pendingTranscript]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px] overflow-hidden">
            {/* Configuration Column */}
            <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-2">
                <Card title="Agent Settings">

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-mono text-ink-muted">Voice ID</label>
                            <input
                                type="text"
                                className="w-full text-xs p-2 bg-bg-base border border-ink-faint rounded font-mono"
                                value={config.voice_id}
                                onChange={e => setConfig({ ...config, voice_id: e.target.value })}
                                disabled={isActive}
                            />
                            <p className="text-[10px] text-ink-muted mt-1">Default: George</p>
                        </div>
                        <div>
                            <label className="text-xs font-mono text-ink-muted">LLM Provider</label>
                            <Select
                                value={config.llm_provider}
                                onChange={e => setConfig({ ...config, llm_provider: e.target.value })}
                                disabled={isActive}
                                options={[
                                    { value: 'deepseek', label: 'DeepSeek' },
                                    { value: 'dashscope', label: 'Dashscope (Qwen)' },
                                    { value: 'gemini', label: 'Gemini' }
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
            <div className="lg:col-span-2 h-full flex flex-col overflow-hidden">
                <div className="h-full flex flex-col bg-bg-elevated/20 border border-ink-faint rounded-lg overflow-hidden">
                    {/* Header simulating Card title */}
                    <div className="p-4 border-b border-ink-faint bg-bg-elevated/30">
                        <h3 className="text-xl font-serif font-bold text-ink flex items-center gap-2">
                            <Bot size={20} className="text-neon-cyan" />
                            ElevenLabs Voice Agent
                        </h3>
                    </div>

                    <div className="flex-grow overflow-hidden relative">
                        <div
                            ref={chatContainerRef}
                            className="absolute inset-0 overflow-y-auto space-y-4 p-4 scroll-smooth"
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
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                </div>
                            ))}

                            {/* Live pending transcript */}
                            {pendingTranscript && (
                                <div className="flex justify-end">
                                    <div className="max-w-[80%] rounded-lg p-3 bg-ink/5 border border-ink/20 border-dashed text-ink/70 animate-pulse">
                                        <div className="flex items-center gap-2 mb-1 opacity-50 text-xs">
                                            <User size={12} />
                                            <span>SPEAKING...</span>
                                        </div>
                                        <p className="text-sm leading-relaxed italic">{pendingTranscript}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ElevenLabsVoiceAgent;
