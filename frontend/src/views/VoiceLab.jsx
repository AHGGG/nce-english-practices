
import React, { useState, useEffect } from 'react';
import { Card, Button, Tag } from '../components/ui';
import { Mic, Volume2, Radio, Server, Beaker } from 'lucide-react';
import TTSPanel from '../components/VoiceLab/TTSPanel';
import STTPanel from '../components/VoiceLab/STTPanel';
import LivePanel from '../components/VoiceLab/LivePanel';

const VoiceLab = () => {
    const [activeTab, setActiveTab] = useState('tts');
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/voice-lab/config')
            .then(res => res.json())
            .then(data => {
                setConfig(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load generic config", err);
                setLoading(false);
            });
    }, []);

    const TabButton = ({ id, icon: Icon, label }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-6 py-3 font-mono font-bold uppercase transition-all ${activeTab === id
                    ? 'text-neon-cyan border-b-2 border-neon-cyan bg-neon-cyan/5'
                    : 'text-ink-muted hover:text-ink'
                }`}
        >
            <Icon size={18} />
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-canvas p-6 pb-24 md:p-8 md:pl-72">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-ink mb-2 flex items-center gap-3">
                            <Beaker className="text-neon-pink" size={32} />
                            Voice Vendor Lab
                        </h1>
                        <p className="text-ink-muted font-mono max-w-2xl">
                            Integration testing environment for voice synthesis (TTS), recognition (STT),
                            and real-time streaming capabilities across different providers.
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-ink-faint mb-6 overflow-x-auto">
                    <TabButton id="tts" icon={Volume2} label="Text-to-Speech" />
                    <TabButton id="stt" icon={Mic} label="Speech-to-Text" />
                    <TabButton id="live" icon={Radio} label="Live / Streaming" />
                </div>

                {/* Content Area */}
                <div className="min-h-[400px]">
                    {loading ? (
                        <div className="text-center py-20 text-ink-muted font-mono animate-pulse">
                            Initializing Vendor Configurations...
                        </div>
                    ) : (
                        <>
                            {activeTab === 'tts' && <TTSPanel config={config} />}
                            {activeTab === 'stt' && <STTPanel config={config} />}
                            {activeTab === 'live' && <LivePanel config={config} />}
                        </>
                    )}
                </div>

                {/* Footer / Debug Info */}
                <Card variant="outline" className="mt-12 opacity-50">
                    <div className="flex items-center gap-2 text-xs font-mono text-ink-muted">
                        <Server size={14} />
                        <span>Connected Providers:</span>
                        {config && Object.keys(config).map(provider => (
                            <Tag key={provider} variant="outline" color="gray" className="mr-1">
                                {provider}
                            </Tag>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default VoiceLab;
