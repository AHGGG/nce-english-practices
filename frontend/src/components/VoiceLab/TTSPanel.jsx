
import React, { useState, useRef } from 'react';
import { Card, Button, Select, Textarea } from '../ui';
import { Play, Download, Volume2 } from 'lucide-react';
import { authFetch } from '../../api/auth';

const TTSPanel = ({ config, fixedProvider = null }) => {
    const [provider, setProvider] = useState(fixedProvider || 'google');
    const [voice, setVoice] = useState('');
    const [text, setText] = useState('Hello, this is a test of the neural voice synthesis system.');
    const [loading, setLoading] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const audioRef = useRef(null);

    // Get voices for selected provider
    const availableVoices = config?.[provider]?.voices || [];

    const providerOptions = config ? Object.keys(config).map(p => ({ value: p, label: p.toUpperCase() })) : [];

    const voiceOptions = [
        { value: "", label: "-- Select Voice --" },
        ...availableVoices.map(v => {
            const id = typeof v === 'object' ? v.id : v;
            const name = typeof v === 'object' ? v.name : v;
            return { value: id, label: name };
        })
    ];

    const handleGenerate = async () => {
        if (!text || !voice && availableVoices.length > 0) return;

        setLoading(true);
        setAudioUrl(null);

        try {
            const formData = new FormData();
            formData.append('provider', provider);
            formData.append('text', text);
            const firstVoice = availableVoices[0];
            const defaultVoiceId = typeof firstVoice === 'object' ? firstVoice.id : firstVoice;
            formData.append('voice_id', voice || defaultVoiceId);
            formData.append('model', 'default');

            const response = await authFetch('/api/voice-lab/tts', {
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
                    {/* Provider Select - Show only if no fixed provider */}
                    {!fixedProvider && (
                        <Select
                            label="Provider"
                            value={provider}
                            onChange={(e) => { setProvider(e.target.value); setVoice(''); }}
                            options={providerOptions}
                        />
                    )}

                    {/* Voice Select */}
                    <Select
                        label="Voice Model"
                        value={voice}
                        onChange={(e) => setVoice(e.target.value)}
                        options={voiceOptions}
                    />

                    {/* Text Input */}
                    <Textarea
                        label="Input Text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={5}
                        className="font-serif leading-relaxed resize-none"
                    />

                    <Button
                        fullWidth
                        variant="primary"
                        onClick={() => {
                            // Handle default voice if none selected
                            // Logic is handled inside handleGenerate or requires user selection
                            handleGenerate();
                        }}
                        isLoading={loading}
                        disabled={loading}
                    >
                        {loading ? 'Synthesizing...' : 'Generate Audio'}
                    </Button>
                </div>
            </Card>

            <Card title="Output Preview" className="flex flex-col justify-center items-center min-h-[300px]">
                {audioUrl ? (
                    <div className="text-center w-full animate-in fade-in duration-500">
                        <div className="w-24 h-24 rounded-full bg-accent-info/10 flex items-center justify-center mx-auto mb-6 border border-accent-info shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                            <Volume2 className="text-accent-info w-10 h-10 animate-pulse" />
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
                    <div className="text-center text-text-muted/30">
                        <Volume2 size={48} className="mx-auto mb-2" />
                        <p className="font-mono text-sm">Waiting for generation...</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default TTSPanel;
