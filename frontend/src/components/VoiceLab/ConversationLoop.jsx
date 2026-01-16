import React, { useState, useRef, useEffect } from 'react';
import { Mic, Volume2, Play, Square, Loader2, Bot, ArrowRight, MessageSquare, RefreshCw } from 'lucide-react';
import { Card, Button } from '../ui';

const ConversationLoop = ({ config }) => {
    // Configuration State
    const [sttProvider, setSttProvider] = useState('deepgram');
    const [ttsProvider, setTtsProvider] = useState('elevenlabs');
    const [llmModel, setLlmModel] = useState(''); // Default from backend

    // Loop State
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState('idle'); // idle, recording, transcribing, thinking, synthesizing, playing

    // Data State
    const [transcript, setTranscript] = useState('');
    const [response, setResponse] = useState('');
    const [audioUrl, setAudioUrl] = useState(null);
    const [logs, setLogs] = useState([]);

    // Refs
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioPlayerRef = useRef(null);

    const addLog = (message, type = 'info') => {
        setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message, type }]);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = processAudioLoop;

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setStatus('recording');
            setTranscript('');
            setResponse('');
            setAudioUrl(null);
            addLog('Started recording...', 'info');
        } catch (err) {
            console.error("Mic Error:", err);
            addLog(`Microphone Error: ${err.message}`, 'error');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            // Processing triggers in onstop
        }
    };

    const processAudioLoop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        try {
            // 1. STT
            setStatus('transcribing');
            addLog(`Transcribing audio via ${sttProvider}...`, 'process');

            const formData = new FormData();
            formData.append('file', audioBlob);
            formData.append('provider', sttProvider);

            const sttRes = await fetch('/api/voice-lab/stt', {
                method: 'POST',
                body: formData,
            });

            if (!sttRes.ok) throw new Error('STT Failed');
            const sttData = await sttRes.json();
            const text = sttData.text;

            setTranscript(text);
            addLog(`Transcript: "${text}"`, 'success');

            if (!text || text.trim().length === 0) {
                addLog('No speech detected.', 'warning');
                setStatus('idle');
                setIsProcessing(false);
                return;
            }

            // 2. LLM
            setStatus('thinking');
            addLog('Sending to LLM...', 'process');

            const llmFormData = new FormData();
            llmFormData.append('text', text);
            if (llmModel) llmFormData.append('model', llmModel);

            const llmRes = await fetch('/api/voice-lab/llm', {
                method: 'POST',
                body: llmFormData
            });

            if (!llmRes.ok) throw new Error('LLM Failed');
            const llmData = await llmRes.json();
            const reply = llmData.text;

            setResponse(reply);
            addLog(`AI Response: "${reply}"`, 'success');

            // 3. TTS
            setStatus('synthesizing');
            addLog(`Synthesizing audio via ${ttsProvider}...`, 'process');

            const ttsFormData = new FormData();
            ttsFormData.append('text', reply);
            ttsFormData.append('provider', ttsProvider);
            // Use defaults for voice/model based on provider
            if (ttsProvider === 'elevenlabs') {
                ttsFormData.append('voice_id', '21m00Tcm4TlvDq8ikWAM'); // Rachel default
                ttsFormData.append('model', 'eleven_turbo_v2_5');
            } else if (ttsProvider === 'deepgram') {
                ttsFormData.append('voice_id', 'aura-asteria-en');
                ttsFormData.append('model', 'aura-asteria-en');
            } else {
                ttsFormData.append('voice_id', 'default');
            }

            const ttsRes = await fetch('/api/voice-lab/tts', {
                method: 'POST',
                body: ttsFormData
            });

            if (!ttsRes.ok) throw new Error('TTS Failed');

            const audioBlobRes = await ttsRes.blob();
            const url = URL.createObjectURL(audioBlobRes);
            setAudioUrl(url);

            // 4. Play
            setStatus('playing');
            addLog('Playing response...', 'info');
            if (audioPlayerRef.current) {
                audioPlayerRef.current.src = url;
                audioPlayerRef.current.play();
                audioPlayerRef.current.onended = () => {
                    setStatus('idle');
                    setIsProcessing(false);
                    addLog('Loop complete.', 'success');
                };
            }

        } catch (err) {
            console.error("Loop Error:", err);
            addLog(`Error: ${err.message}`, 'error');
            setStatus('error');
            setIsProcessing(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
            {/* Control Panel */}
            <div className="lg:col-span-1 space-y-6">
                <Card className="p-6 bg-bg-elevated border-l-4 border-l-accent-primary">
                    <h2 className="text-xl font-serif font-bold text-text-primary mb-6 flex items-center gap-2">
                        <RefreshCw className="text-accent-primary animate-spin-slow" />
                        Loop Control
                    </h2>

                    {/* Config */}
                    <div className="space-y-4 mb-8">
                        <div>
                            <label className="block text-xs font-mono text-text-muted mb-1">STT Provider (Incubator)</label>
                            <select
                                value={sttProvider}
                                onChange={(e) => setSttProvider(e.target.value)}
                                className="w-full bg-bg-base border border-border rounded p-2 text-sm font-mono text-text-primary focus:border-accent-primary outline-none"
                            >
                                <option value="deepgram">Deepgram (Nova-2)</option>
                                <option value="google">Google (Gemini)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-mono text-text-muted mb-1">TTS Provider (Speaker)</label>
                            <select
                                value={ttsProvider}
                                onChange={(e) => setTtsProvider(e.target.value)}
                                className="w-full bg-bg-base border border-border rounded p-2 text-sm font-mono text-text-primary focus:border-accent-primary outline-none"
                            >
                                <option value="elevenlabs">ElevenLabs (Turbo v2.5)</option>
                                <option value="deepgram">Deepgram (Aura)</option>
                                <option value="google">Google (Gemini)</option>
                            </select>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex justify-center">
                        <Button
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={isProcessing && !isRecording}
                            className={`w-full h-16 text-lg font-bold tracking-widest relative overflow-hidden transition-all duration-300 ${isRecording
                                ? 'bg-accent-danger hover:bg-red-600 text-white shadow-[0_0_20px_rgba(255,0,85,0.4)]'
                                : 'bg-accent-primary hover:bg-green-600 text-black shadow-[0_0_20px_rgba(0,255,148,0.4)]'
                                }`}
                        >
                            <div className="flex items-center gap-3 z-10">
                                {isRecording ? <Square fill="currentColor" /> : <Mic />}
                                {isRecording ? "STOP RECORDING" : "START LOOP"}
                            </div>

                            {/* Pulse Effect */}
                            {isRecording && (
                                <span className="absolute inset-0 bg-white/20 animate-pulse rounded-md"></span>
                            )}
                        </Button>
                    </div>

                    {/* Status Indicator */}
                    <div className="mt-6 flex items-center justify-center gap-2 font-mono text-sm">
                        <div className={`w-3 h-3 rounded-full ${status === 'idle' ? 'bg-gray-500' :
                            status === 'recording' ? 'bg-accent-danger animate-pulse' :
                                status === 'error' ? 'bg-red-500' :
                                    'bg-accent-primary animate-bounce'
                            }`} />
                        <span className="uppercase text-text-muted">{status}</span>
                    </div>
                </Card>

                {/* Audio Player (Hidden visually but functional) */}
                <audio ref={audioPlayerRef} className="hidden" controls />
            </div>

            {/* Visualize / Chat */}
            <div className="lg:col-span-2 space-y-6">
                {/* Flow Visualizer */}
                <div className="flex items-center justify-between px-4 py-8 border border-border rounded-lg bg-bg-elevated/50 relative overflow-hidden">
                    {/* Background Grid */}
                    <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                    <FlowStep icon={Mic} label="Input" active={status === 'recording'} />
                    <Arrow active={status === 'transcribing'} />
                    <FlowStep icon={Bot} label="LLM Processing" active={status === 'thinking'} />
                    <Arrow active={status === 'synthesizing'} />
                    <FlowStep icon={Volume2} label="Output" active={status === 'playing'} />
                </div>

                {/* Log / Transcript */}
                <Card className="flex-1 min-h-[400px] flex flex-col bg-bg-base border border-border font-mono text-sm p-4">
                    <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                        {logs.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-text-muted opacity-30">
                                <MessageSquare size={48} className="mb-4" />
                                <p>Ready to start conversation loop...</p>
                            </div>
                        )}

                        {logs.map((log, i) => (
                            <div key={i} className={`flex gap-3 fade-in ${log.type === 'error' ? 'text-accent-danger' :
                                log.type === 'success' ? 'text-accent-primary' :
                                    log.type === 'process' ? 'text-accent-info' :
                                        log.type === 'warning' ? 'text-accent-warning' :
                                            'text-text-muted'
                                }`}>
                                <span className="opacity-50 text-xs mt-0.5 select-none">{log.time}</span>
                                <span>{log.type === 'process' && <Loader2 size={12} className="inline mr-2 animate-spin" />}{log.message}</span>
                            </div>
                        ))}
                    </div>

                    {/* Result Card Preview */}
                    {(transcript || response) && (
                        <div className="mt-4 pt-4 border-t border-border space-y-4">
                            {transcript && (
                                <div className="bg-bg-elevated p-3 rounded border-l-2 border-accent-info">
                                    <div className="text-xs text-accent-info mb-1 font-bold">YOU</div>
                                    <p className="text-text-primary">{transcript}</p>
                                </div>
                            )}
                            {response && (
                                <div className="bg-bg-elevated p-3 rounded border-l-2 border-accent-primary">
                                    <div className="text-xs text-accent-primary mb-1 font-bold">AI</div>
                                    <p className="text-text-primary">{response}</p>
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

const FlowStep = ({ icon: Icon, label, active }) => (
    <div className={`flex flex-col items-center gap-2 z-10 transition-all duration-500 ${active ? 'scale-110' : 'opacity-40'}`}>
        <div className={`p-4 rounded-full border-2 ${active ? 'border-accent-primary bg-accent-primary/10 text-accent-primary shadow-[0_0_15px_rgba(0,255,148,0.3)]' : 'border-text-muted text-text-muted'}`}>
            <Icon size={24} />
        </div>
        <span className={`text-xs font-bold uppercase tracking-wider ${active ? 'text-accent-primary' : 'text-text-muted'}`}>{label}</span>
    </div>
);

const Arrow = ({ active }) => (
    <div className={`flex-1 h-0.5 mx-4 relative ${active ? 'bg-accent-primary/50' : 'bg-border'}`}>
        {active && (
            <div className="absolute inset-0 bg-accent-primary animate-progress-bar"></div>
        )}
        <ArrowRight className={`absolute -right-2 -top-2.5 ${active ? 'text-accent-primary' : 'text-border'}`} size={16} />
    </div>
);

export default ConversationLoop;
