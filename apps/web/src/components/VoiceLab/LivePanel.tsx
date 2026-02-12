// @ts-nocheck

import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Tag } from '../ui';
import { Radio, Activity, XCircle, Terminal } from 'lucide-react';

const LivePanel = ({ config, fixedProvider = null }) => {
    const [provider, setProvider] = useState(fixedProvider || 'deepgram');
    const [isConnected, setIsConnected] = useState(false);
    const [logs, setLogs] = useState([]);
    const [transcript, setTranscript] = useState([]);
    const [status, setStatus] = useState('');

    const wsRef = useRef(null);
    const voiceClientRef = useRef(null);
    const logsEndRef = useRef(null);
    const transcriptEndRef = useRef(null);

    const appendLog = (msg) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-50));
    };

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    // Auto-scroll transcript
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [transcript]);

    const toggleConnection = async () => {
        if (isConnected) {
            // Disconnect
            if (voiceClientRef.current) {
                voiceClientRef.current.disconnect();
                voiceClientRef.current = null;
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            setIsConnected(false);
            setStatus('');
            appendLog("Disconnected.");
        } else {
            // Connect
            setIsConnected(true);
            setStatus('Initializing...');
            setTranscript([]); // Clear previous transcript

            if (provider === 'google') {
                // Use Real Gemini Live Client
                try {
                    const { GeminiLiveClient } = await import('../../api/gemini-live');
                    const client = new GeminiLiveClient();

                    client.onDisconnect = () => {
                        setIsConnected(false);
                        setStatus('');
                        appendLog("Gemini Client Disconnected.");
                        voiceClientRef.current = null;
                    };

                    client.onTranscript = (text, isUser) => {
                        // Append to transcript
                        setTranscript(prev => {
                            const last = prev[prev.length - 1];
                            // Simple logic: if same role, can stick together or just separate blocks?
                            // Live usually streams chunks.
                            // Let's just append blocks for readability for now, or update last if same role?
                            // For simplicity in this panel: just append everything as new line if it's substantial, 
                            // or update last if it's partial? 
                            // The api implementation sends chunks. Let's accumulate.
                            if (last && last.isUser === isUser) {
                                return [...prev.slice(0, -1), { ...last, text: last.text + text }];
                            }
                            return [...prev, { isUser, text }];
                        });
                        appendLog(`TRX (${isUser ? 'User' : 'AI'}): ${text.substring(0, 20)}...`);
                    };

                    client.onError = (err) => {
                        appendLog(`Error: ${err}`);
                    };

                    await client.connect({
                        systemInstruction: "You are a helpful assistant in the Voice Lab.",
                        voiceName: "Puck"
                    });

                    voiceClientRef.current = client;
                    setStatus('Listening...');
                    appendLog("Connected to Gemini Live (Real)");

                } catch (e) {
                    console.error(e);
                    appendLog(`Failed to connect: ${e.message}`);
                    setIsConnected(false);
                    setStatus('Error');
                }
            } else {
                // Fallback Echo / Other Providers
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const url = `${protocol}//${window.location.host}/api/voice-lab/live/${provider}`;

                const ws = new WebSocket(url);

                ws.onopen = () => {
                    appendLog(`Connected to ${url} (Echo)`);
                    ws.send("Hello from Frontend!");
                    setStatus('Connected (Echo)');
                };

                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    appendLog(`RX: ${data.content}`);
                };

                ws.onclose = () => {
                    if (isConnected) { // Only log if we didn't initiate close
                        setIsConnected(false);
                        setStatus('');
                        appendLog("Connection closed.");
                    }
                };

                ws.onerror = (err) => {
                    console.error(err);
                    appendLog("Socket Error!");
                };

                wsRef.current = ws;
            }
        }
    };

    useEffect(() => {
        return () => {
            if (wsRef.current) wsRef.current.close();
            if (voiceClientRef.current) voiceClientRef.current.disconnect();
        };
    }, []);

    // Simple Input Simulator
    const sendTestMessage = () => {
        if (wsRef.current && isConnected) {
            wsRef.current.send("Ping " + Date.now());
            appendLog("TX: Ping");
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Socket Control">
                <div className="space-y-6">
                    {!fixedProvider && (
                        <div className="space-y-1">
                            <label className="text-xs font-mono font-bold text-text-muted uppercase">Provider Target</label>
                            <select
                                value={provider}
                                onChange={(e) => setProvider(e.target.value)}
                                disabled={isConnected}
                                className="w-full bg-bg-elevated border border-border text-text-primary px-4 py-2.5 text-sm font-mono focus:border-accent-info focus:outline-none disabled:opacity-50"
                            >
                                {config && Object.keys(config).map(p => (
                                    <option key={p} value={p}>{p.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="p-4 bg-bg-elevated rounded border border-border">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono text-text-muted uppercase font-bold">Status</span>
                            <Tag color={isConnected ? 'green' : 'gray'}>
                                {isConnected ? 'LIVE' : 'OFFLINE'}
                            </Tag>
                        </div>

                        <Button
                            fullWidth
                            variant={isConnected ? "danger" : "primary"}
                            onClick={toggleConnection}
                        >
                            {isConnected ? (
                                <> <XCircle size={16} className="mr-2" /> Disconnect </>
                            ) : (
                                <> <Radio size={16} className="mr-2" /> Connect Websocket </>
                            )}
                        </Button>
                    </div>

                    <Button
                        fullWidth
                        variant="ghost"
                        disabled={!isConnected}
                        onClick={sendTestMessage}
                    >
                        <Activity size={16} className="mr-2" /> Send Ping
                    </Button>
                </div>
            </Card>

            <Card className="min-h-[400px] bg-bg-base border-border font-mono text-xs p-0 overflow-hidden flex flex-col">
                <div className="bg-bg-elevated px-4 py-2 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Terminal size={12} className="text-accent-info" />
                        <span className="font-bold text-text-muted">LIVE LOGS</span>
                    </div>
                    <span className="text-xs font-mono text-accent-danger animate-pulse">{status}</span>
                </div>
                <div className="p-4 h-32 overflow-y-auto space-y-1 text-accent-primary/80 border-b border-border">
                    {logs.map((log, i) => (
                        <div key={i} className="break-all border-b border-border/10 pb-0.5 mb-0.5">
                            {log}
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>

                {/* Transcript Area */}
                <div className="flex-1 flex flex-col min-h-0 bg-bg-surface">
                    <div className="bg-bg-elevated px-4 py-2 border-b border-border flex items-center gap-2">
                        <Radio size={12} className="text-accent-danger" />
                        <span className="font-bold text-text-muted">TRANSCRIPT STREAM</span>
                    </div>
                    <div className="p-4 overflow-y-auto space-y-4 flex-1">
                        {transcript.length === 0 && (
                            <div className="text-text-muted/30 italic text-center mt-10">Waiting for speech...</div>
                        )}
                        {transcript.map((msg, i) => (
                            <div key={i} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded text-sm font-mono border ${msg.isUser ? 'bg-bg-elevated border-accent-info text-text-primary' : 'bg-bg-base border-accent-danger text-accent-danger'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={transcriptEndRef} />
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default LivePanel;
