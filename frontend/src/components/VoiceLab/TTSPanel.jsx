
import React, { useState, useRef } from 'react';
import { Card, Button, Input } from '../ui';
import { Play, Download, Loader2, StopCircle } from 'lucide-react';

const TTSPanel = ({ config }) => {
    const [provider, setProvider] = useState('google');
    const [voice, setVoice] = useState('');
    const [text, setText] = useState('Hello, this is a test of the neural voice synthesis system.');
    const [loading, setLoading] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const audioRef = useRef(null);

    // Get voices for selected provider
    const availableVoices = config?.[provider]?.voices || [];

    const handleGenerate = async () => {
        if (!text || !voice && availableVoices.length > 0) return;

        setLoading(true);
        setAudioUrl(null);

        try {
            const formData = new FormData();
            formData.append('provider', provider);
            formData.append('text', text);
            formData.append('voice_id', voice || availableVoices[0]);
            formData.append('model', 'default');

            const response = await fetch('/api/voice-lab/tts', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error("TTS Failed");

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);

            // Auto play
            setTimeout(() => {
                if (audioRef.current) audioRef.current.play();
            }, 100);

        } catch (err) {
            console.error(err);
            alert("Generation Failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Configuration">
                <div className="space-y-4">
                    {/* Provider Select */}
                    <div className="space-y-1">
                        <label className="text-xs font-mono font-bold text-ink-muted uppercase">Provider</label>
                        <select
                            value={provider}
                            onChange={(e) => { setProvider(e.target.value); setVoice(''); }}
                            className="w-full bg-bg-elevated border border-ink-faint text-ink px-4 py-2.5 text-sm font-mono focus:border-neon-cyan focus:outline-none"
                        >
                            {config && Object.keys(config).map(p => (
                                <option key={p} value={p}>{p.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>

                    {/* Voice Select */}
                    <div className="space-y-1">
                        <label className="text-xs font-mono font-bold text-ink-muted uppercase">Voice Model</label>
                        <select
                            value={voice}
                            onChange={(e) => setVoice(e.target.value)}
                            className="w-full bg-bg-elevated border border-ink-faint text-ink px-4 py-2.5 text-sm font-mono focus:border-neon-cyan focus:outline-none"
                        >
                            <option value="">-- Select Voice --</option>
                            {availableVoices.map(v => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                    </div>

                    {/* Text Input */}
                    <div className="space-y-1">
                        <label className="text-xs font-mono font-bold text-ink-muted uppercase">Input Text</label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            rows={5}
                            className="w-full bg-bg-elevated border border-ink-faint text-ink px-4 py-3 text-sm focus:border-neon-cyan focus:outline-none resize-none font-serif leading-relaxed"
                        />
                    </div>

                    <Button
                        fullWidth
                        variant="primary"
                        onClick={handleGenerate}
                        isLoading={loading}
                        disabled={!voice && availableVoices.length > 0}
                    >
                        {loading ? 'Synthesizing...' : 'Generate Audio'}
                    </Button>
                </div>
            </Card>

            <Card title="Output Preview" className="flex flex-col justify-center items-center min-h-[300px]">
                {audioUrl ? (
                    <div className="text-center w-full animate-in fade-in duration-500">
                        <div className="w-24 h-24 rounded-full bg-neon-cyan/10 flex items-center justify-center mx-auto mb-6 border border-neon-cyan shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                            <Volume2 className="text-neon-cyan w-10 h-10 animate-pulse" />
                        </div>

                        <audio ref={audioRef} controls src={audioUrl} className="w-full mb-6" />

                        <div className="flex justify-center gap-4">
                            <Button size="sm" variant="outline" onClick={() => audioRef.current.play()}>
                                <Play size={14} className="mr-2" /> Replay
                            </Button>
                            <a href={audioUrl} download={`tts-${provider}-${Date.now()}.mp3`}>
                                <Button size="sm" variant="ghost">
                                    <Download size={14} className="mr-2" /> Download
                                </Button>
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-ink-muted/30">
                        <Volume2 size={48} className="mx-auto mb-2" />
                        <p className="font-mono text-sm">Waiting for generation...</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default TTSPanel;
