
import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Tag } from '../ui';
import { Radio, Activity, XCircle, Terminal } from 'lucide-react';

const LivePanel = ({ config }) => {
    const [provider, setProvider] = useState('deepgram');
    const [isConnected, setIsConnected] = useState(false);
    const [logs, setLogs] = useState([]);

    const wsRef = useRef(null);

    const appendLog = (msg) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-20)); // Keep last 20
    };

    const toggleConnection = () => {
        if (isConnected) {
            if (wsRef.current) wsRef.current.close();
            setIsConnected(false);
            appendLog("Disconnected.");
        } else {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const url = `${protocol}//${window.location.host}/api/voice-lab/live/${provider}`;

            const ws = new WebSocket(url);

            ws.onopen = () => {
                setIsConnected(true);
                appendLog(`Connected to ${url}`);
                ws.send("Hello from Frontend!");
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                appendLog(`RX: ${data.content}`);
            };

            ws.onclose = () => {
                setIsConnected(false);
                appendLog("Connection closed.");
            };

            ws.onerror = (err) => {
                console.error(err);
                appendLog("Socket Error!");
            };

            wsRef.current = ws;
        }
    };

    useEffect(() => {
        return () => {
            if (wsRef.current) wsRef.current.close();
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
                    <div className="space-y-1">
                        <label className="text-xs font-mono font-bold text-ink-muted uppercase">Provider Target</label>
                        <select
                            value={provider}
                            onChange={(e) => setProvider(e.target.value)}
                            disabled={isConnected}
                            className="w-full bg-bg-elevated border border-ink-faint text-ink px-4 py-2.5 text-sm font-mono focus:border-neon-cyan focus:outline-none disabled:opacity-50"
                        >
                            {config && Object.keys(config).map(p => (
                                <option key={p} value={p}>{p.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>

                    <div className="p-4 bg-bg-elevated rounded border border-ink-faint">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono text-ink-muted uppercase font-bold">Status</span>
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

            <Card className="min-h-[400px] bg-black border-ink-faint font-mono text-xs p-0 overflow-hidden flex flex-col">
                <div className="bg-bg-elevated px-4 py-2 border-b border-ink-faint flex items-center gap-2">
                    <Terminal size={12} className="text-neon-cyan" />
                    <span className="font-bold text-ink-muted">LIVE LOGS</span>
                </div>
                <div className="p-4 flex-grow overflow-y-auto space-y-1 text-neon-green/80">
                    {logs.length === 0 && (
                        <span className="text-ink-muted/30 italic">Target ready. Initiate connection...</span>
                    )}
                    {logs.map((log, i) => (
                        <div key={i} className="break-all border-b border-white/5 pb-0.5 mb-0.5">
                            {log}
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};

export default LivePanel;
