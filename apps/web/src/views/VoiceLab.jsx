import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button, Tag } from "../components/ui";

import { authFetch } from "../api/auth";

import TTSPanel from "../components/VoiceLab/TTSPanel";
import STTPanel from "../components/VoiceLab/STTPanel";
import LivePanel from "../components/VoiceLab/LivePanel";
import DeepgramStreamingTTS from "../components/VoiceLab/DeepgramStreamingTTS";
import DeepgramVoiceAgent from "../components/VoiceLab/DeepgramVoiceAgent";
import DeepgramUnified from "../components/VoiceLab/DeepgramUnified";
import ConversationLoop from "../components/VoiceLab/ConversationLoop";
import ElevenLabsLive from "../components/VoiceLab/ElevenLabsLive";
import ElevenLabsVoiceAgent from "../components/VoiceLab/ElevenLabsVoiceAgent";
import {
  Mic,
  Volume2,
  Radio,
  Server,
  Beaker,
  GraduationCap,
  Cloud,
  Zap,
  Globe,
  Cpu,
  Bot,
  TestTube2,
  RefreshCw,
  ChevronLeft,
} from "lucide-react";

const TabButton = (
  { id, icon: Icon, label, activeTab, setActiveTab }, // eslint-disable-line no-unused-vars
) => (
  <button
    onClick={() => setActiveTab(id)}
    className={`flex items-center gap-2 px-6 py-3 font-mono font-bold uppercase transition-all whitespace-nowrap ${
      activeTab === id
        ? "text-accent-primary border-b-2 border-accent-primary bg-accent-primary/5"
        : "text-white/40 hover:text-white"
    }`}
  >
    <Icon size={18} />
    {label}
  </button>
);

const SectionHeader = (
  { title, icon: Icon }, // eslint-disable-line no-unused-vars
) => (
  <div className="flex items-center gap-2 mb-4 mt-8 border-b border-white/10 pb-2">
    <Icon size={20} className="text-accent-primary" />
    <h2 className="text-xl font-serif font-bold text-white">{title}</h2>
  </div>
);

// Main Component
const VoiceLab = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("loop");
  const [deepgramSubTab, setDeepgramSubTab] = useState("live");
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/voice-lab/config")
      .then((res) => res.json())
      .then((data) => {
        setConfig(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load generic config", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white p-6 pb-24 md:p-8 md:pl-72 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0a1418] via-[#0c1815] to-[#0a0f0d] pointer-events-none" />
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-radial from-emerald-900/20 via-transparent to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-gradient-radial from-teal-900/10 via-transparent to-transparent blur-3xl" />
      </div>
      <div
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => navigate("/nav")}
                className="text-white/60 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="p-2 bg-accent-primary/10 rounded-lg border border-accent-primary/20">
                <Beaker className="text-accent-primary w-6 h-6" />
              </div>
              <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
                Voice Vendor Lab
              </h1>
            </div>
            <p className="text-white/40 font-mono max-w-2xl text-sm pl-14">
              Vendor-specific integration testing for TTS, STT, and Streaming
              capabilities.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 mb-6 overflow-x-auto no-scrollbar gap-1">
          <TabButton
            id="loop"
            icon={RefreshCw}
            label="Conversation Loop"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <TabButton
            id="google"
            icon={Globe}
            label="Google Gemini"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <TabButton
            id="deepgram"
            icon={Zap}
            label="Deepgram"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <TabButton
            id="elevenlabs"
            icon={Volume2}
            label="ElevenLabs"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <TabButton
            id="dashscope"
            icon={Cloud}
            label="Dashscope"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>

        {/* Content Area */}
        <div className="min-h-[400px] bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          {loading ? (
            <div className="text-center py-20 text-white/30 font-mono animate-pulse">
              Initializing Vendor Configurations...
            </div>
          ) : (
            <div className="space-y-12">
              {/* CONVERSATION LOOP VIEW */}
              {activeTab === "loop" && <ConversationLoop config={config} />}

              {/* GOOGLE VIEW */}
              {activeTab === "google" && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <section>
                    <SectionHeader
                      title="Text-to-Speech (Multimodal)"
                      icon={Volume2}
                    />
                    <TTSPanel config={config} fixedProvider="google" />
                  </section>

                  <section>
                    <SectionHeader
                      title="Speech-to-Text (Multimodal)"
                      icon={Mic}
                    />
                    <STTPanel config={config} fixedProvider="google" />
                  </section>

                  <section>
                    <SectionHeader
                      title="Live Streaming (Native Audio)"
                      icon={Radio}
                    />
                    <LivePanel config={config} fixedProvider="google" />
                  </section>
                </div>
              )}

              {/* Deepgram Content */}
              {activeTab === "deepgram" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Sub-tabs for Deepgram */}
                  <div className="flex justify-center space-x-2 mb-6 bg-black/20 p-1 rounded-xl w-fit mx-auto border border-white/10">
                    {["live", "agent", "tools"].map((sub) => (
                      <button
                        key={sub}
                        onClick={() => setDeepgramSubTab(sub)}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${
                          deepgramSubTab === sub
                            ? "bg-accent-primary text-black shadow-lg"
                            : "text-white/60 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {sub === "live" && "🎙️ LIVE STT"}
                        {sub === "agent" && "🤖 VOICE AGENT"}
                        {sub === "tools" && "🛠️ TOOLS & REST"}
                      </button>
                    ))}
                  </div>

                  {deepgramSubTab === "live" && (
                    <>
                      <SectionHeader
                        title="Real-time Transcription"
                        icon={Mic}
                      />
                      <DeepgramUnified />
                    </>
                  )}

                  {deepgramSubTab === "agent" && (
                    <>
                      <SectionHeader
                        title="Voice Agent API (End-to-End)"
                        icon={Bot}
                      />
                      <div className="p-6 border border-white/10 rounded-xl bg-black/20">
                        <DeepgramVoiceAgent />
                      </div>
                    </>
                  )}

                  {deepgramSubTab === "tools" && (
                    <>
                      <SectionHeader
                        title="Developer Tools & REST APIs"
                        icon={TestTube2}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-6">
                          <div className="p-6 border border-white/10 rounded-xl bg-black/20">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-accent-primary mb-4 border-b border-white/5 pb-2">
                              REST: Speech-to-Text
                            </h3>
                            <STTPanel fixedProvider="deepgram" />
                          </div>
                          <div className="p-6 border border-white/10 rounded-xl bg-black/20">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-accent-primary mb-4 border-b border-white/5 pb-2">
                              REST: Text-to-Speech
                            </h3>
                            <TTSPanel fixedProvider="deepgram" />
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="p-6 border border-white/10 rounded-xl bg-black/20">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-accent-primary mb-4 border-b border-white/5 pb-2">
                              Streaming TTS Test
                            </h3>
                            <DeepgramStreamingTTS />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ELEVENLABS VIEW */}
              {activeTab === "elevenlabs" && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <section>
                    <SectionHeader
                      title="Text-to-Speech (Turbo v2.5)"
                      icon={Volume2}
                    />
                    <TTSPanel config={config} fixedProvider="elevenlabs" />
                  </section>

                  <section>
                    <SectionHeader
                      title="Voice Agent (STT + LLM + TTS)"
                      icon={Bot}
                    />
                    <div className="p-6 border border-white/10 rounded-xl bg-black/20">
                      <ElevenLabsVoiceAgent />
                    </div>
                  </section>

                  <section>
                    <SectionHeader
                      title="Real-time STT (WebSocket)"
                      icon={Mic}
                    />
                    <ElevenLabsLive />
                  </section>

                  <section>
                    <SectionHeader
                      title="REST: Speech-to-Text (Scribe v1)"
                      icon={TestTube2}
                    />
                    <STTPanel config={config} fixedProvider="elevenlabs" />
                  </section>
                </div>
              )}

              {/* DASHSCOPE VIEW */}
              {activeTab === "dashscope" && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <section>
                    <SectionHeader
                      title="Text-to-Speech (Qwen3-TTS)"
                      icon={Volume2}
                    />
                    <TTSPanel config={config} fixedProvider="dashscope" />
                  </section>
                  <section>
                    <SectionHeader
                      title="Speech-to-Text (Qwen3-ASR)"
                      icon={Mic}
                    />
                    <STTPanel config={config} fixedProvider="dashscope" />
                  </section>
                  <div className="p-4 border border-white/10 rounded-xl bg-accent-warning/5 text-sm text-accent-warning flex items-center gap-2">
                    <Info size={16} />
                    <p>Note: Currently showing Qwen3 MultiModal Models.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer / Debug Info */}
        <Card
          variant="outline"
          className="mt-12 opacity-50 border-white/5 bg-transparent"
        >
          <div className="flex items-center gap-2 text-xs font-mono text-white/30">
            <Server size={14} />
            <span className="uppercase tracking-wider">Available Configs:</span>
            {config &&
              Object.keys(config).map((provider) => (
                <span
                  key={provider}
                  className="px-2 py-0.5 rounded bg-white/10 text-white/50 border border-white/10"
                >
                  {provider}
                </span>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default VoiceLab;
