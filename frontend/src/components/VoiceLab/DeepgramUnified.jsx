
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@deepgram/sdk';
import { Card, Button, Tag } from '../ui';
import { Mic, MicOff, AlertCircle, Settings, Zap, Activity } from 'lucide-react';

const DeepgramUnified = () => {
    // Connection State
    const [isListening, setIsListening] = useState(false);
    const [connectionState, setConnectionState] = useState('disconnected');
    const [error, setError] = useState(null);

    // Model Configuration
    const [model, setModel] = useState('nova-3'); // 'nova-3' or 'flux-general-en'
    const [showConfig, setShowConfig] = useState(false);

    // Flux-specific Configuration
    const [eotThreshold, setEotThreshold] = useState(0.7);
    const [eagerEotThreshold, setEagerEotThreshold] = useState(''); // Optional
    const [eotTimeout, setEotTimeout] = useState(5000);

    // Transcription Results
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [eventLog, setEventLog] = useState([]);

    // Advanced Info
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [lastResult, setLastResult] = useState(null);

    // Refs
    const microphoneRef = useRef(null);
    const connectionRef = useRef(null);
    const eventLogRef = useRef(null);

    const addEvent = (type, message, data = null) => {
        const timestamp = new Date().toLocaleTimeString();
        setEventLog(prev => [...prev, { timestamp, type, message, data }].slice(-50)); // Keep last 50 events
    };

    const startDeepgram = async () => {
        try {
            setConnectionState('connecting');
            setError(null);
            setEventLog([]);
            setTranscript('');
            setInterimTranscript('');

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

            // 3. Create Connection based on model
            let connection;
            const isFlux = model === 'flux-general-en';

            if (isFlux) {
                // Flux uses v2.listen API
                const config = {
                    model: "flux-general-en",
                    encoding: "linear16",
                    sample_rate: "16000",
                    eot_threshold: eotThreshold,
                    eot_timeout_ms: eotTimeout,
                };

                // Add eager_eot_threshold only if set
                if (eagerEotThreshold && parseFloat(eagerEotThreshold) > 0) {
                    config.eager_eot_threshold = parseFloat(eagerEotThreshold);
                }

                addEvent('info', `Connecting to Flux with config:`, config);
                connection = deepgram.listen.v2.connect(config);
            } else {
                // Nova-3 uses v1.live API
                addEvent('info', `Connecting to Nova-3`);
                connection = deepgram.listen.live({
                    model: "nova-3",
                    language: "en-US",
                    smart_format: true,
                    interim_results: true, // Enable interim results
                });
            }

            // 4. Handle Events
            connection.on('Open', () => {
                setConnectionState('connected');
                addEvent('success', 'Connection opened');
            });

            connection.on('Close', () => {
                setConnectionState('disconnected');
                addEvent('info', 'Connection closed');
                stopMicrophone();
            });

            connection.on('Metadata', (data) => {
                addEvent('metadata', 'Metadata received', data);
            });

            connection.on('Transcript', (data) => {
                const result = data.channel?.alternatives?.[0];
                if (!result) return;

                const received = result.transcript;
                if (!received || received.length === 0) return;

                // Store full result for advanced view
                setLastResult(data);

                // Handle interim vs final results
                if (data.is_final) {
                    setTranscript(prev => prev + (prev ? ' ' : '') + received);
                    setInterimTranscript('');
                    addEvent('transcript', `Final: "${received}"`, {
                        confidence: result.confidence,
                        speech_final: data.speech_final,
                        words: result.words?.length || 0
                    });
                } else {
                    setInterimTranscript(received);
                    addEvent('interim', `Interim: "${received}"`, {
                        confidence: result.confidence
                    });
                }
            });

            // Flux-specific events
            if (isFlux) {
                connection.on('EndOfTurn', (data) => {
                    addEvent('eot', '🔴 End of Turn detected', data);
                });

                connection.on('EagerEndOfTurn', (data) => {
                    addEvent('eager-eot', '⚡ Eager End of Turn (start LLM processing)', data);
                });

                connection.on('TurnResumed', (data) => {
                    addEvent('turn-resumed', '🔄 Turn Resumed (cancel LLM)', data);
                });

                connection.on('SpeechStarted', (data) => {
                    addEvent('speech-started', '🎤 Speech Started', data);
                });
            }

            connection.on('Error', (err) => {
                console.error("Deepgram Error:", err);
                setError(err.message || "Deepgram Connection Error");
                setConnectionState('error');
                addEvent('error', `Error: ${err.message}`, err);
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

            // Use 80ms chunks for optimal Flux performance (recommended by docs)
            const chunkInterval = isFlux ? 80 : 100;
            microphoneRef.current.start(chunkInterval);
            setIsListening(true);
            addEvent('success', `Microphone started (${chunkInterval}ms chunks)`);

        } catch (err) {
            console.error("Failed to start Deepgram:", err);
            setError(err.message);
            setConnectionState('error');
            addEvent('error', `Failed to start: ${err.message}`);
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
        addEvent('info', 'Stopped transcription');
    };

    const stopMicrophone = () => {
        if (microphoneRef.current && microphoneRef.current.state !== 'inactive') {
            microphoneRef.current.stop();
            microphoneRef.current.stream.getTracks().forEach(track => track.stop());
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
    }, []);

    const getEventColor = (type) => {
        switch (type) {
            case 'success': return 'text-neon-green';
            case 'error': return 'text-red-500';
            case 'eot': return 'text-neon-pink';
            case 'eager-eot': return 'text-neon-cyan';
            case 'turn-resumed': return 'text-yellow-500';
            case 'speech-started': return 'text-neon-green';
            case 'transcript': return 'text-ink';
            case 'interim': return 'text-ink-muted';
            default: return 'text-ink-muted';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header: Model Selection & Control */}
            <Card title="Deepgram Unified Testing Panel">
                <div className="space-y-6">
                    {/* Model Selection */}
                    <div className="space-y-2">
                        <label className="text-xs font-mono font-bold text-ink-muted uppercase flex items-center gap-2">
                            <Zap size={14} />
                            Model Selection
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setModel('nova-3')}
                                disabled={isListening}
                                className={`p-4 border-2 rounded-lg font-mono text-sm transition-all ${
                                    model === 'nova-3'
                                        ? 'border-neon-green bg-neon-green/10 text-neon-green'
                                        : 'border-ink-faint text-ink-muted hover:border-ink-muted'
                                } ${isListening ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                <div className="font-bold">Nova-3</div>
                                <div className="text-xs mt-1 opacity-70">General Transcription</div>
                            </button>
                            <button
                                onClick={() => setModel('flux-general-en')}
                                disabled={isListening}
                                className={`p-4 border-2 rounded-lg font-mono text-sm transition-all ${
                                    model === 'flux-general-en'
                                        ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan'
                                        : 'border-ink-faint text-ink-muted hover:border-ink-muted'
                                } ${isListening ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                <div className="font-bold">Flux</div>
                                <div className="text-xs mt-1 opacity-70">Conversational AI</div>
                            </button>
                        </div>
                    </div>

                    {/* Flux Configuration */}
                    {model === 'flux-general-en' && (
                        <div className="border border-ink-faint rounded-lg p-4 bg-bg-elevated/50 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-mono font-bold text-ink-muted uppercase flex items-center gap-2">
                                    <Settings size={14} />
                                    Flux Configuration
                                </span>
                                <button
                                    onClick={() => setShowConfig(!showConfig)}
                                    className="text-xs font-mono text-neon-cyan hover:underline"
                                >
                                    {showConfig ? 'Hide' : 'Show'}
                                </button>
                            </div>

                            {showConfig && (
                                <div className="space-y-4 pt-2">
                                    {/* EOT Threshold */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-mono text-ink-muted">
                                                EOT Threshold (0.5 - 0.9)
                                            </label>
                                            <span className="text-xs font-mono font-bold text-neon-cyan">
                                                {eotThreshold}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0.5"
                                            max="0.9"
                                            step="0.05"
                                            value={eotThreshold}
                                            onChange={(e) => setEotThreshold(parseFloat(e.target.value))}
                                            disabled={isListening}
                                            className="w-full"
                                        />
                                        <p className="text-xs text-ink-muted/70">
                                            Higher = more reliable turn detection, slightly higher latency
                                        </p>
                                    </div>

                                    {/* Eager EOT Threshold */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-mono text-ink-muted">
                                                Eager EOT Threshold (optional, 0.3 - 0.9)
                                            </label>
                                            <span className="text-xs font-mono font-bold text-neon-cyan">
                                                {eagerEotThreshold || 'disabled'}
                                            </span>
                                        </div>
                                        <input
                                            type="number"
                                            min="0.3"
                                            max="0.9"
                                            step="0.05"
                                            value={eagerEotThreshold}
                                            onChange={(e) => setEagerEotThreshold(e.target.value)}
                                            disabled={isListening}
                                            placeholder="Leave empty to disable"
                                            className="w-full bg-bg-elevated border border-ink-faint text-ink px-3 py-2 text-xs font-mono"
                                        />
                                        <p className="text-xs text-ink-muted/70">
                                            Enable early LLM response. Lower = earlier triggers, more false starts.
                                        </p>
                                    </div>

                                    {/* EOT Timeout */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-mono text-ink-muted">
                                                EOT Timeout (ms)
                                            </label>
                                            <span className="text-xs font-mono font-bold text-neon-cyan">
                                                {eotTimeout}ms
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="500"
                                            max="10000"
                                            step="500"
                                            value={eotTimeout}
                                            onChange={(e) => setEotTimeout(parseInt(e.target.value))}
                                            disabled={isListening}
                                            className="w-full"
                                        />
                                        <p className="text-xs text-ink-muted/70">
                                            Max silence before forcing end-of-turn
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Connection State & Controls */}
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
                    </div>
                </div>
            </Card>

            {/* Results Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Live Transcript */}
                <Card title="Live Transcript" className="flex flex-col">
                    <div className="flex-grow space-y-4">
                        {/* Final Transcript */}
                        <div className="min-h-[200px] max-h-[300px] overflow-y-auto bg-bg-elevated p-4 rounded border border-ink-faint">
                            {transcript ? (
                                <div className="font-serif text-lg leading-relaxed whitespace-pre-wrap">
                                    {transcript}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-ink-muted/30 font-mono text-sm">
                                    {isListening ? "Listening..." : "Ready to transcribe..."}
                                </div>
                            )}
                        </div>

                        {/* Interim Transcript */}
                        {interimTranscript && (
                            <div className="p-3 bg-neon-cyan/5 border border-neon-cyan/30 rounded">
                                <div className="text-xs font-mono text-neon-cyan mb-1 flex items-center gap-2">
                                    <Activity size={12} className="animate-pulse" />
                                    INTERIM
                                </div>
                                <div className="font-serif text-base text-neon-cyan/80 italic">
                                    {interimTranscript}
                                </div>
                            </div>
                        )}

                        {/* Advanced Info Toggle */}
                        {lastResult && (
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="text-xs font-mono text-ink-muted hover:text-neon-cyan transition-colors"
                            >
                                {showAdvanced ? '▼ Hide' : '▶ Show'} Advanced Info
                            </button>
                        )}

                        {/* Advanced Info Display */}
                        {showAdvanced && lastResult && (
                            <div className="p-3 bg-bg-elevated border border-ink-faint rounded text-xs font-mono space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <span className="text-ink-muted">Confidence:</span>
                                        <span className="ml-2 text-neon-green font-bold">
                                            {(lastResult.channel.alternatives[0].confidence * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-ink-muted">Is Final:</span>
                                        <span className="ml-2 text-neon-cyan font-bold">
                                            {lastResult.is_final ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-ink-muted">Speech Final:</span>
                                        <span className="ml-2 text-neon-cyan font-bold">
                                            {lastResult.speech_final ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-ink-muted">Words:</span>
                                        <span className="ml-2 text-ink font-bold">
                                            {lastResult.channel.alternatives[0].words?.length || 0}
                                        </span>
                                    </div>
                                </div>

                                {/* Word-level Details */}
                                {lastResult.channel.alternatives[0].words && (
                                    <div className="mt-3 pt-3 border-t border-ink-faint">
                                        <div className="text-ink-muted mb-2">Word-level Confidence:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {lastResult.channel.alternatives[0].words.map((word, idx) => (
                                                <span
                                                    key={idx}
                                                    className={`px-2 py-1 rounded ${
                                                        word.confidence >= 0.9 ? 'bg-neon-green/20 text-neon-green' :
                                                        word.confidence >= 0.8 ? 'bg-yellow-500/20 text-yellow-500' :
                                                        word.confidence >= 0.7 ? 'bg-orange-500/20 text-orange-500' :
                                                        'bg-red-500/20 text-red-500'
                                                    }`}
                                                    title={`${word.confidence.toFixed(3)} (${word.start.toFixed(2)}s - ${word.end.toFixed(2)}s)`}
                                                >
                                                    {word.punctuated_word || word.word}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {transcript && (
                            <Button variant="ghost" size="sm" onClick={() => {
                                setTranscript('');
                                setInterimTranscript('');
                                setLastResult(null);
                            }}>
                                Clear Transcript
                            </Button>
                        )}
                    </div>
                </Card>

                {/* Event Log */}
                <Card title="Event Log" className="flex flex-col">
                    <div
                        ref={eventLogRef}
                        className="flex-grow h-[400px] overflow-y-auto bg-bg-elevated p-4 rounded border border-ink-faint font-mono text-xs space-y-1"
                    >
                        {eventLog.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-ink-muted/30">
                                No events yet...
                            </div>
                        ) : (
                            eventLog.map((event, idx) => (
                                <div key={idx} className="border-b border-ink-faint/30 pb-1 mb-1">
                                    <div className="flex items-start gap-2">
                                        <span className="text-ink-muted shrink-0">{event.timestamp}</span>
                                        <span className={`font-bold ${getEventColor(event.type)}`}>
                                            [{event.type.toUpperCase()}]
                                        </span>
                                    </div>
                                    <div className="ml-2 text-ink mt-1">
                                        {event.message}
                                    </div>
                                    {event.data && (
                                        <details className="ml-4 mt-1 text-ink-muted">
                                            <summary className="cursor-pointer hover:text-neon-cyan">
                                                Show data
                                            </summary>
                                            <pre className="mt-1 text-[10px] overflow-x-auto">
                                                {JSON.stringify(event.data, null, 2)}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                    {eventLog.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => setEventLog([])} className="mt-2">
                            Clear Log
                        </Button>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default DeepgramUnified;
