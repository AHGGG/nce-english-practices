import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Tag } from '../components/ui';

import TTSPanel from '../components/VoiceLab/TTSPanel';
import STTPanel from '../components/VoiceLab/STTPanel';
import LivePanel from '../components/VoiceLab/LivePanel';
import DeepgramStreamingTTS from '../components/VoiceLab/DeepgramStreamingTTS';
import DeepgramVoiceAgent from '../components/VoiceLab/DeepgramVoiceAgent';
import DeepgramUnified from '../components/VoiceLab/DeepgramUnified';
import ConversationLoop from '../components/VoiceLab/ConversationLoop';
import ElevenLabsLive from '../components/VoiceLab/ElevenLabsLive';
import ElevenLabsVoiceAgent from '../components/VoiceLab/ElevenLabsVoiceAgent';
import { Mic, Volume2, Radio, Server, Beaker, GraduationCap, Cloud, Zap, Globe, Cpu, Bot, TestTube2, RefreshCw, ChevronLeft } from 'lucide-react';

const TabButton = ({ id, icon: Icon, label, isActive, onClick }) => (
    <button
        role="tab"
        id={`tab-${id}`}
        aria-selected={isActive}
        aria-controls={`panel-${id}`}
        onClick={() => onClick(id)}
        className={`flex items-center gap-2 px-6 py-3 font-mono font-bold uppercase transition-all whitespace-nowrap ${isActive
            ? 'text-accent-primary border-b-2 border-accent-primary bg-accent-primary/5'
            : 'text-text-muted hover:text-text-primary'
            }`}
    >
        <Icon size={18} />
        {label}
    </button>
);

const SectionHeader = ({ title, icon: Icon }) => (
    <div className="flex items-center gap-2 mb-4 mt-8 border-b border-border pb-2">
        <Icon size={20} className="text-accent-primary" />
        <h2 className="text-xl font-serif font-bold text-text-primary">{title}</h2>
    </div>
);

const VoiceLab = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('loop');
    const [deepgramSubTab, setDeepgramSubTab] = useState('live');
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

    return (
        <div className="min-h-screen bg-bg-base p-6 pb-24 md:p-8 md:pl-72">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <button
                                onClick={() => navigate('/nav')}
                                className="text-text-secondary hover:text-accent-primary transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <Beaker className="text-accent-primary" size={32} />
                            <h1 className="text-3xl font-serif font-bold text-text-primary">
                                Voice Vendor Lab
                            </h1>
                        </div>
                        <p className="text-text-muted font-mono max-w-2xl">
                            Vendor-specific integration testing for TTS, STT, and Streaming capabilities.
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div
                    role="tablist"
                    aria-label="Voice Lab Vendors"
                    className="flex border-b border-border mb-6 overflow-x-auto no-scrollbar"
                >
                    <TabButton id="loop" icon={RefreshCw} label="Conversation Loop" isActive={activeTab === 'loop'} onClick={setActiveTab} />
                    <TabButton id="google" icon={Globe} label="Google Gemini" isActive={activeTab === 'google'} onClick={setActiveTab} />
                    <TabButton id="deepgram" icon={Zap} label="Deepgram" isActive={activeTab === 'deepgram'} onClick={setActiveTab} />
                    <TabButton id="elevenlabs" icon={Volume2} label="ElevenLabs" isActive={activeTab === 'elevenlabs'} onClick={setActiveTab} />
                    <TabButton id="dashscope" icon={Cloud} label="Dashscope" isActive={activeTab === 'dashscope'} onClick={setActiveTab} />
                </div>

                {/* Content Area */}
                <div className="min-h-[400px]">
                    {loading ? (
                        <div className="text-center py-20 text-text-muted font-mono animate-pulse">
                            Initializing Vendor Configurations...
                        </div>
                    ) : (
                        <div
                            role="tabpanel"
                            id={`panel-${activeTab}`}
                            aria-labelledby={`tab-${activeTab}`}
                            className="space-y-12"
                        >
                            {/* CONVERSATION LOOP VIEW */}
                            {activeTab === 'loop' && (
                                <ConversationLoop config={config} />
                            )}

                            {/* GOOGLE VIEW */}
                            {activeTab === 'google' && (
                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <section>
                                        <SectionHeader title="Text-to-Speech (Multimodal)" icon={Volume2} />
                                        <TTSPanel config={config} fixedProvider="google" />
                                    </section>

                                    <section>
                                        <SectionHeader title="Speech-to-Text (Multimodal)" icon={Mic} />
                                        <STTPanel config={config} fixedProvider="google" />
                                    </section>

                                    <section>
                                        <SectionHeader title="Live Streaming (Native Audio)" icon={Radio} />
                                        <LivePanel config={config} fixedProvider="google" />
                                    </section>
                                </div>
                            )}


                            {/* Deepgram Content */}
                            {activeTab === 'deepgram' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Sub-tabs for Deepgram */}
                                    <div className="flex justify-center space-x-2 mb-6">
                                        {['live', 'agent', 'tools'].map((sub) => (
                                            <button
                                                key={sub}
                                                onClick={() => setDeepgramSubTab(sub)}
                                                className={`px-4 py-2 text-xs font-mono border transition-all duration-300 ${deepgramSubTab === sub
                                                    ? 'bg-accent-primary/20 border-accent-primary text-accent-primary shadow-[0_0_10px_rgba(0,255,148,0.3)]'
                                                    : 'bg-bg-elevated border-border text-text-muted hover:border-accent-primary/50 hover:text-text-primary'
                                                    }`}
                                            >
                                                {sub === 'live' && '🎙️ LIVE STT'}
                                                {sub === 'agent' && '🤖 VOICE AGENT'}
                                                {sub === 'tools' && '🛠️ TOOLS & REST'}
                                            </button>
                                        ))}
                                    </div>

                                    {deepgramSubTab === 'live' && (
                                        <>
                                            <SectionHeader title="Real-time Transcription" icon={Mic} />
                                            <DeepgramUnified />
                                        </>
                                    )}

                                    {deepgramSubTab === 'agent' && (
                                        <>
                                            <SectionHeader title="Voice Agent API (End-to-End)" icon={Bot} />
                                            <div className="p-4 border border-border rounded bg-bg-elevated/50">
                                                <DeepgramVoiceAgent />
                                            </div>
                                        </>
                                    )}

                                    {deepgramSubTab === 'tools' && (
                                        <>
                                            <SectionHeader title="Developer Tools & REST APIs" icon={TestTube2} />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-6">
                                                    <div className="p-4 border border-border rounded bg-bg-elevated/50">
                                                        <h3 className="text-sm font-mono text-accent-primary mb-4">REST: Speech-to-Text</h3>
                                                        <STTPanel fixedProvider="deepgram" />
                                                    </div>
                                                    <div className="p-4 border border-border rounded bg-bg-elevated/50">
                                                        <h3 className="text-sm font-mono text-accent-primary mb-4">REST: Text-to-Speech</h3>
                                                        <TTSPanel fixedProvider="deepgram" />
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    <div className="p-4 border border-border rounded bg-bg-elevated/50">
                                                        <h3 className="text-sm font-mono text-accent-primary mb-4">Streaming TTS Test</h3>
                                                        <DeepgramStreamingTTS />
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* ELEVENLABS VIEW */}
                            {activeTab === 'elevenlabs' && (
                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <section>
                                        <SectionHeader title="Text-to-Speech (Turbo v2.5)" icon={Volume2} />
                                        <TTSPanel config={config} fixedProvider="elevenlabs" />
                                    </section>

                                    <section>
                                        <SectionHeader title="Voice Agent (STT + LLM + TTS)" icon={Bot} />
                                        <div className="p-4 border border-border rounded bg-bg-elevated/50">
                                            <ElevenLabsVoiceAgent />
                                        </div>
                                    </section>

                                    <section>
                                        <SectionHeader title="Real-time STT (WebSocket)" icon={Mic} />
                                        <ElevenLabsLive />
                                    </section>

                                    <section>
                                        <SectionHeader title="REST: Speech-to-Text (Scribe v1)" icon={TestTube2} />
                                        <STTPanel config={config} fixedProvider="elevenlabs" />
                                    </section>
                                </div>
                            )}

                            {/* DASHSCOPE VIEW */}
                            {activeTab === 'dashscope' && (
                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <section>
                                        <SectionHeader title="Text-to-Speech (Qwen3-TTS)" icon={Volume2} />
                                        <TTSPanel config={config} fixedProvider="dashscope" />
                                    </section>
                                    <section>
                                        <SectionHeader title="Speech-to-Text (Qwen3-ASR)" icon={Mic} />
                                        <STTPanel config={config} fixedProvider="dashscope" />
                                    </section>
                                    <div className="p-4 border border-border rounded bg-bg-elevated/50 text-sm text-text-muted">
                                        <p>Note: Currently showing Qwen3 MultiModal Models.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer / Debug Info */}
                <Card variant="outline" className="mt-12 opacity-50">
                    <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
                        <Server size={14} />
                        <span>Available Configs:</span>
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
