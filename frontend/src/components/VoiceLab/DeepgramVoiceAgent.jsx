import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Tag, Select } from '../ui';
import { Mic, MicOff, Bot, User, Volume2, Loader2, Radio, Wrench } from 'lucide-react';

/**
 * Deepgram Voice Agent - Unified API Version
 * 
 * Uses Deepgram's Voice Agent API (wss://agent.deepgram.com/v1/agent/converse)
 * for lowest latency STT → LLM → TTS pipeline.
 * 
 * Key features:
 * - Single WebSocket connection
 * - Built-in VAD and barge-in
 * - ~300ms response latency
 */
const DeepgramVoiceAgent = () => {
    const [isActive, setIsActive] = useState(false);
    const [connectionState, setConnectionState] = useState('disconnected');
    const [agentState, setAgentState] = useState('idle'); // idle, listening, thinking, speaking
    const [messages, setMessages] = useState([]);
    const [pendingTranscript, setPendingTranscript] = useState('');
    const [error, setError] = useState(null);
    const [config, setConfig] = useState({
        voice: 'aura-2-asteria-en',
        llm_provider: 'default',  // Default: uses Deepgram's built-in gpt-4o-mini
        system_prompt: 'You are a helpful and concise AI English learning assistant. You can look up words in the dictionary and provide example sentences. Keep responses brief and educational.',
        greeting: 'Hello! I can help you learn English. Ask me to define words or give examples!',
        functions_enabled: true  // Enable function calling by default
    });

    const wsRef = useRef(null);
    const microphoneRef = useRef(null);
    const audioContextRef = useRef(null);
    const nextStartTimeRef = useRef(0);
    const chatContainerRef = useRef(null);
    const pendingAssistantTextRef = useRef('');  // Track assistant turn
    const pendingUserTextRef = useRef('');  // Track user turn

    // Audio settings - must match backend (16kHz linear16)
    const SAMPLE_RATE = 16000;

    // Play 16kHz PCM audio
    const playAudioChunk = (data) => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: SAMPLE_RATE
            });
        }

        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        const ctx = audioContextRef.current;

        // Convert Int16 PCM to Float32
        const rawData = new Int16Array(data);
        const float32Data = new Float32Array(rawData.length);
        for (let i = 0; i < rawData.length; i++) {
            float32Data[i] = rawData[i] / 0x8000;
        }

        const buffer = ctx.createBuffer(1, float32Data.length, SAMPLE_RATE);
        buffer.getChannelData(0).set(float32Data);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
        source.start(startTime);
        nextStartTimeRef.current = startTime + buffer.duration;
    };

    // Stop audio playback immediately (for barge-in)
    const stopAudioPlayback = () => {
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        nextStartTimeRef.current = 0;
    };

    const startAgent = async () => {
        try {
            setConnectionState('connecting');
            setError(null);
            setMessages([]);

            // 1. Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // 2. Connect to unified WebSocket endpoint
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const params = new URLSearchParams(config).toString();
            const wsUrl = `${protocol}//${window.location.host}/api/voice-lab/deepgram/unified-voice-agent?${params}`;

            const ws = new WebSocket(wsUrl);
            ws.binaryType = 'arraybuffer';
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[Agent] WebSocket connected');
                setConnectionState('connected');
                startMicrophone(stream, ws);
                setIsActive(true);
            };

            ws.onmessage = (event) => {
                if (typeof event.data === 'string') {
                    const msg = JSON.parse(event.data);
                    handleAgentMessage(msg);
                } else if (event.data instanceof ArrayBuffer) {
                    // Binary audio from agent
                    playAudioChunk(event.data);
                }
            };

            ws.onerror = (e) => {
                console.error('[Agent] WebSocket error:', e);
                setError('WebSocket connection failed');
                setConnectionState('error');
            };

            ws.onclose = () => {
                console.log('[Agent] WebSocket closed');
                stopAgent();
            };

        } catch (err) {
            console.error('[Agent] Start error:', err);
            setError(err.message);
            setConnectionState('error');
        }
    };

    const handleAgentMessage = (msg) => {
        console.log('[Agent] Message:', msg);

        switch (msg.type) {
            case 'ready':
                console.log(`[Agent] Ready: voice=${msg.voice}, llm=${msg.llm_provider}`);
                setAgentState('listening');
                break;

            case 'connected':
                console.log(`[Agent] Session: ${msg.session_id}`);
                break;

            case 'user_started_speaking':
                // BARGE-IN: Stop playing audio immediately and clear pending text
                stopAudioPlayback();
                pendingAssistantTextRef.current = '';  // Clear any partial response
                setAgentState('listening');
                setPendingTranscript('');
                break;

            case 'user_stopped_speaking':
                setAgentState('thinking');
                break;

            case 'agent_started_speaking':
                setAgentState('speaking');
                break;

            case 'agent_audio_done':
                // Mark current turn as complete - no longer appending to last message
                pendingAssistantTextRef.current = '';
                setAgentState('listening');
                break;

            case 'conversation_text':
                if (msg.role === 'user') {
                    // User messages: merge consecutive messages in same turn
                    setMessages(prev => {
                        const lastMsg = prev[prev.length - 1];

                        // If last message is from user and we're in active user turn, append
                        if (lastMsg && lastMsg.role === 'user' && pendingUserTextRef.current) {
                            const updated = [...prev];
                            updated[updated.length - 1] = {
                                ...lastMsg,
                                text: lastMsg.text + ' ' + msg.content
                            };
                            return updated;
                        } else {
                            // First message in this turn - create new
                            pendingUserTextRef.current = 'active';
                            pendingAssistantTextRef.current = '';  // Reset assistant turn
                            return [...prev, { role: 'user', text: msg.content, timestamp: new Date().toISOString() }];
                        }
                    });
                    setPendingTranscript('');
                } else if (msg.role === 'assistant') {
                    // Assistant messages: merge consecutive messages in same turn
                    setMessages(prev => {
                        const lastMsg = prev[prev.length - 1];

                        // If last message is from AI and we're in the same turn, append
                        if (lastMsg && lastMsg.role === 'ai' && pendingAssistantTextRef.current) {
                            const updated = [...prev];
                            updated[updated.length - 1] = {
                                ...lastMsg,
                                text: lastMsg.text + '\n\n' + msg.content
                            };
                            return updated;
                        } else {
                            // First message in this turn - create new
                            pendingAssistantTextRef.current = 'active';
                            pendingUserTextRef.current = '';  // Reset user turn
                            return [...prev, { role: 'ai', text: msg.content, timestamp: new Date().toISOString() }];
                        }
                    });
                }

                // Auto scroll
                setTimeout(() => {
                    if (chatContainerRef.current) {
                        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                    }
                }, 50);
                break;

            case 'agent_thinking':
                // Optional: show thinking content
                console.log('[Agent] Thinking:', msg.content);
                break;

            case 'function_calling':
                // LLM is deciding to call a function
                console.log('[Agent] Function calling initiated');
                setAgentState('thinking');
                break;

            case 'function_call':
                // Function is being executed
                console.log('[Agent] Function call:', msg.name, msg.parameters);
                setMessages(prev => [...prev, {
                    role: 'function',
                    type: 'call',
                    name: msg.name,
                    parameters: msg.parameters,
                    timestamp: new Date().toISOString()
                }]);
                break;

            case 'function_result':
                // Function returned a result
                console.log('[Agent] Function result:', msg.name, msg.result);
                setMessages(prev => [...prev, {
                    role: 'function',
                    type: 'result',
                    name: msg.name,
                    result: msg.result,
                    timestamp: new Date().toISOString()
                }]);
                // Auto scroll
                setTimeout(() => {
                    if (chatContainerRef.current) {
                        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                    }
                }, 50);
                break;

            case 'error':
                setError(msg.message);
                break;
        }
    };

    // Start microphone with 16kHz PCM output
    const startMicrophone = (stream, ws) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: SAMPLE_RATE
        });

        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN) {
                const inputData = e.inputBuffer.getChannelData(0);

                // Convert Float32 to Int16 PCM
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
            stream,
            audioContext,
            processor,
            source
        };
    };

    const stopAgent = () => {
        // Stop audio playback
        stopAudioPlayback();

        // Close WebSocket
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        // Stop microphone
        const mic = microphoneRef.current;
        if (mic) {
            mic.processor.disconnect();
            mic.source.disconnect();
            mic.audioContext.close();
            mic.stream.getTracks().forEach(track => track.stop());
            microphoneRef.current = null;
        }

        setIsActive(false);
        setConnectionState('disconnected');
        setAgentState('idle');
        setPendingTranscript('');
    };



    useEffect(() => {
        return () => stopAgent();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Agent state indicator
    const getStateIndicator = () => {
        switch (agentState) {
            case 'listening':
                return <Tag variant="success"><Radio size={12} className="mr-1 animate-pulse" /> Listening</Tag>;
            case 'thinking':
                return <Tag variant="warning"><Loader2 size={12} className="mr-1 animate-spin" /> Thinking</Tag>;
            case 'speaking':
                return <Tag variant="info"><Volume2 size={12} className="mr-1 animate-pulse" /> Speaking</Tag>;
            default:
                return <Tag>Idle</Tag>;
        }
    };

    return (
        <div className="w-full">
            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Configuration Column - Left Side */}
                <div className="lg:col-span-4 xl:col-span-3 space-y-4">
                    <Card title="Agent Settings">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-mono text-text-muted">LLM Provider</label>
                                <Select
                                    value={config.llm_provider}
                                    onChange={e => setConfig({ ...config, llm_provider: e.target.value })}
                                    disabled={isActive}
                                    options={[
                                        { value: 'default', label: 'Default (GPT-4o-mini)' },
                                        { value: 'dashscope', label: 'Dashscope (Qwen)' },
                                        { value: 'deepseek', label: 'DeepSeek' }
                                    ]}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-mono text-text-muted">Voice</label>
                                <Select
                                    value={config.voice}
                                    onChange={e => setConfig({ ...config, voice: e.target.value })}
                                    disabled={isActive}
                                    options={[
                                        { value: 'aura-2-asteria-en', label: 'Asteria (Female)' },
                                        { value: 'aura-2-luna-en', label: 'Luna (Female)' },
                                        { value: 'aura-2-thalia-en', label: 'Thalia (Female)' },
                                        { value: 'aura-2-orion-en', label: 'Orion (Male)' },
                                        { value: 'aura-2-arcas-en', label: 'Arcas (Male)' }
                                    ]}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-mono text-text-muted">System Prompt</label>
                                <textarea
                                    className="w-full text-xs p-2 bg-bg-base border border-border rounded resize-none"
                                    value={config.system_prompt}
                                    onChange={e => setConfig({ ...config, system_prompt: e.target.value })}
                                    disabled={isActive}
                                    rows={2}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-mono text-text-muted">Greeting</label>
                                <input
                                    type="text"
                                    className="w-full text-xs p-2 bg-bg-base border border-border rounded"
                                    value={config.greeting}
                                    onChange={e => setConfig({ ...config, greeting: e.target.value })}
                                    disabled={isActive}
                                />
                            </div>
                            <div className="flex items-center justify-between py-1">
                                <div>
                                    <label className="text-xs font-mono text-text-muted">Function Calling</label>
                                    <p className="text-[10px] text-text-muted/60">lookup, examples, end_call</p>
                                </div>
                                <button
                                    type="button"
                                    className={`relative w-10 h-5 rounded-full transition-colors ${config.functions_enabled ? 'bg-accent-info' : 'bg-bg-elevated/50'}`}
                                    onClick={() => setConfig({ ...config, functions_enabled: !config.functions_enabled })}
                                    disabled={isActive}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-light-surface transition-transform ${config.functions_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            <Button
                                fullWidth
                                variant={isActive ? "danger" : "primary"}
                                onClick={isActive ? stopAgent : startAgent}
                                isLoading={connectionState === 'connecting'}
                            >
                                {isActive ? (
                                    <> <MicOff size={16} className="mr-2" /> End Session </>
                                ) : (
                                    <> <Mic size={16} className="mr-2" /> Start Voice Agent </>
                                )}
                            </Button>

                            {/* Agent State */}
                            {isActive && (
                                <div className="flex justify-center">
                                    {getStateIndicator()}
                                </div>
                            )}

                            {error && (
                                <div className="text-accent-danger text-xs p-2 bg-accent-danger/10 rounded">{error}</div>
                            )}
                        </div>
                    </Card>

                    {/* Info Card - Collapsible on smaller screens */}
                    <div className="hidden lg:block">
                        <Card title="ℹ️ Voice Agent">
                            <p className="text-xs text-text-muted leading-relaxed">
                                Using Deepgram's Agent API for lowest latency (~300ms).
                                <br /><br />
                                <strong>Barge-in:</strong> Speak anytime to interrupt.
                                {config.functions_enabled && (
                                    <>
                                        <br /><br />
                                        <strong>Functions:</strong> "Define [word]" or "Examples of [word]"
                                    </>
                                )}
                            </p>
                        </Card>
                    </div>
                </div>

                {/* Chat Column - Right Side */}
                <div className="lg:col-span-8 xl:col-span-9">
                    <Card title="Live Conversation" className="h-full flex flex-col">
                        <div
                            ref={chatContainerRef}
                            className="flex-grow overflow-y-auto space-y-3 p-4 bg-bg-base rounded-md min-h-[400px] max-h-[500px]"
                        >
                            {messages.length === 0 && (
                                <div className="text-center text-text-muted/30 py-10">
                                    <Bot size={48} className="mx-auto mb-2" />
                                    <p>Start speaking to begin</p>
                                    <p className="text-xs mt-2">The agent will greet you first</p>
                                </div>
                            )}

                            {messages.map((msg, i) => {
                                // Function call/result messages
                                if (msg.role === 'function') {
                                    return (
                                        <div key={i} className="flex justify-center">
                                            <div className="max-w-[90%] rounded-lg p-2 bg-accent-secondary/10 border border-accent-secondary/30 text-accent-secondary">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <Wrench size={12} />
                                                    <span className="font-mono truncate">
                                                        {msg.type === 'call'
                                                            ? `⚡ ${msg.name}(${JSON.stringify(msg.parameters)})`
                                                            : `✓ ${msg.name}: ${msg.result?.message || (msg.result?.found !== undefined ? (msg.result.found ? 'Found' : 'Not found') : 'Done')}`
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                // User/AI messages
                                return (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user'
                                            ? 'bg-bg-elevated/50 border border-border/10 text-text-primary'
                                            : 'bg-accent-info/5 border border-accent-info/20 text-accent-info'
                                            }`}>
                                            <div className="flex items-center gap-2 mb-1 opacity-50 text-xs">
                                                {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                                                <span>{msg.role === 'user' ? 'YOU' : 'AI'}</span>
                                            </div>
                                            <p className="text-sm leading-relaxed">{msg.text}</p>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Live pending transcript */}
                            {pendingTranscript && (
                                <div className="flex justify-end">
                                    <div className="max-w-[80%] rounded-lg p-3 bg-bg-elevated/50 border border-border/20 border-dashed text-text-primary/70 animate-pulse">
                                        <div className="flex items-center gap-2 mb-1 opacity-50 text-xs">
                                            <User size={12} />
                                            <span>SPEAKING...</span>
                                        </div>
                                        <p className="text-sm leading-relaxed italic">{pendingTranscript}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default DeepgramVoiceAgent;

