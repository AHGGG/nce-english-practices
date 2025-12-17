
import React, { useState, useRef } from 'react';
import { Card, Button } from '../ui';
import { Mic, StopCircle, Upload, FileAudio, RefreshCw } from 'lucide-react';

const STTPanel = ({ config, fixedProvider = null }) => {
    const [provider, setProvider] = useState(fixedProvider || 'deepgram');
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [transcript, setTranscript] = useState('');
    const [loading, setLoading] = useState(false);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                const tracks = stream.getTracks();
                tracks.forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Mic Access Error:", err);
            alert("Could not access microphone");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleTranscribe = async () => {
        if (!audioBlob) return;
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('provider', provider);
            formData.append('file', audioBlob, 'recording.webm');

            const response = await fetch('/api/voice-lab/stt', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error("STT Failed");

            const data = await response.json();
            setTranscript(data.text);
        } catch (err) {
            console.error(err);
            alert("Transcription Failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Input Source">
                <div className="space-y-6">
                    {/* Provider Select */}
                    {!fixedProvider && (
                        <div className="space-y-1">
                            <label className="text-xs font-mono font-bold text-ink-muted uppercase">Provider</label>
                            <select
                                value={provider}
                                onChange={(e) => setProvider(e.target.value)}
                                className="w-full bg-bg-elevated border border-ink-faint text-ink px-4 py-2.5 text-sm font-mono focus:border-neon-cyan focus:outline-none"
                            >
                                {config && Object.keys(config).map(p => (
                                    <option key={p} value={p}>{p.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Recorder */}
                    <div className="border border-dashed border-ink-faint bg-bg-elevated/50 p-8 rounded-lg text-center transition-all hover:border-ink-muted">
                        {!audioBlob ? (
                            isRecording ? (
                                <div className="space-y-4">
                                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto animate-pulse">
                                        <Mic className="text-red-500 w-8 h-8" />
                                    </div>
                                    <p className="font-mono text-sm text-red-500 font-bold">Recording...</p>
                                    <Button variant="danger" onClick={stopRecording}>
                                        <StopCircle className="mr-2 h-4 w-4" /> Stop Recording
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="w-16 h-16 rounded-full bg-ink-faint/20 flex items-center justify-center mx-auto">
                                        <Mic className="text-ink-muted w-8 h-8" />
                                    </div>
                                    <p className="font-mono text-sm text-ink-muted">Click to start recording</p>
                                    <Button variant="outline" onClick={startRecording}>
                                        <Mic className="mr-2 h-4 w-4" /> Start Microphone
                                    </Button>
                                </div>
                            )
                        ) : (
                            <div className="space-y-4">
                                <div className="w-16 h-16 rounded-full bg-neon-green/20 flex items-center justify-center mx-auto">
                                    <FileAudio className="text-neon-green w-8 h-8" />
                                </div>
                                <p className="font-mono text-sm text-ink-muted">Audio capture ready</p>
                                <div className="flex justify-center gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setAudioBlob(null)}>
                                        <RefreshCw size={14} className="mr-2" /> Reset
                                    </Button>
                                    <Button variant="primary" onClick={handleTranscribe} isLoading={loading}>
                                        <Upload size={14} className="mr-2" /> Transcribe
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <Card title="Transcription Result" className="min-h-[300px] flex flex-col">
                {transcript ? (
                    <div className="flex-grow bg-bg-elevated p-4 rounded border border-ink-faint font-serif text-lg leading-relaxed whitespace-pre-wrap animate-in fade-in slide-in-from-bottom-2">
                        {transcript}
                    </div>
                ) : (
                    <div className="flex-grow flex items-center justify-center text-ink-muted/30 font-mono text-sm">
                        No transcription yet...
                    </div>
                )}
            </Card>
        </div>
    );
};

export default STTPanel;
