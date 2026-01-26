/**
 * =============================================================================
 * NEON-SKETCH DESIGN SYSTEM - FULL COMPONENT LIBRARY
 * =============================================================================
 * * DESIGN TOKENS:
 * - Fonts: 'JetBrains Mono' (System/Data), 'Indie Flower' (Human/Interaction)
 * - Colors: Void (#130f1c), Bloom Pink (#ff6b6b), Cyber Cyan (#4ecdc4), Warning Orange (#ff9f43)
 * - Shapes: Geometric containers vs. Organic scribbles
 */

import React, { useState, useEffect } from 'react';
import {
    Play, Volume2, Heart, Sparkles, Zap, ArrowRight, Activity,
    X, Check, Search, Settings, User, Bell, ChevronDown, Terminal, AlertTriangle
} from 'lucide-react';

/* --- CSS STYLES --- */
const styleSheet = `
@import url('https://fonts.googleapis.com/css2?family=Indie+Flower&family=JetBrains+Mono:wght@400;700&display=swap');

/* --- Animations --- */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
}

@keyframes grid-move {
  0% { background-position: 0 0; }
  100% { background-position: 40px 40px; }
}

@keyframes sketch-wiggle {
  0% { transform: rotate(-1deg); }
  25% { transform: rotate(1deg); }
  75% { transform: rotate(0.5deg); }
  100% { transform: rotate(-1deg); }
}

@keyframes glitch-skew {
  0% { transform: skew(0deg); }
  20% { transform: skew(-2deg); }
  40% { transform: skew(2deg); }
  60% { transform: skew(-1deg); }
  80% { transform: skew(1deg); }
  100% { transform: skew(0deg); }
}

@keyframes scanline {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}

/* --- Utilities --- */
.font-sketch { font-family: 'Indie Flower', cursive; }
.font-cyber { font-family: 'JetBrains Mono', monospace; }

.scrollbar-hide::-webkit-scrollbar { display: none; }

.glass-panel {
  background: rgba(30, 27, 46, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

.input-glow:focus {
  box-shadow: 0 0 15px rgba(78, 205, 196, 0.3);
  border-color: #4ecdc4;
}
`;

// ==========================================
// 1. FOUNDATION ATOMS (基础原子)
// ==========================================

// Layout Wrapper
const VaporGrid = ({ children }) => (
    <div className="relative min-h-screen w-full bg-[#130f1c] overflow-x-hidden flex flex-col font-cyber text-white selection:bg-pink-500/30 selection:text-pink-200">
        <style>{styleSheet}</style>
        {/* Animated Grid */}
        <div className="fixed inset-0 bg-[linear-gradient(rgba(162,155,254,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(162,155,254,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [transform:perspective(500px)_rotateX(20deg)_scale(1.5)] animate-[grid-move_20s_linear_infinite] opacity-40 z-0 pointer-events-none"></div>
        {/* Vignette */}
        <div className="fixed inset-0 bg-radial-gradient from-transparent via-[#130f1c]/50 to-[#130f1c] pointer-events-none z-0"></div>
        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto p-4 md:p-8">
            {children}
        </div>
    </div>
);

// Typography
const SketchHeading = ({ children, className = "" }) => (
    <h2 className={`font-sketch text-3xl md:text-4xl text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] ${className}`}>
        {children}
    </h2>
);

const CyberSubheading = ({ children, className = "" }) => (
    <h3 className={`font-cyber text-sm uppercase tracking-[0.2em] text-cyan-400 mb-4 flex items-center gap-2 ${className}`}>
        <span className="w-2 h-2 bg-cyan-400 rounded-sm shadow-[0_0_8px_rgba(78,205,196,0.8)]"></span>
        {children}
    </h3>
);

// Buttons
const SketchButton = ({ text, onClick, variant = "primary", icon: Icon, className = "" }) => {
    const styles = {
        primary: "text-white group-hover:text-[#ff6b6b]",
        secondary: "text-cyan-100 group-hover:text-cyan-400",
        danger: "text-red-100 group-hover:text-red-500",
    };

    return (
        <button
            onClick={onClick}
            className={`group relative inline-flex items-center gap-3 bg-transparent border-none outline-none cursor-pointer transition-transform active:scale-95 ${className}`}
        >
            <div className="relative">
                <span className={`font-sketch text-2xl tracking-widest animate-[sketch-wiggle_3s_infinite_ease-in-out] transition-colors ${styles[variant]}`}>
                    {text}
                </span>
                {/* Scribble Underline */}
                <div className={`w-full h-0.5 bg-current opacity-50 rounded-full mt-1 group-hover:w-[120%] group-hover:-ml-[10%] transition-all duration-300 ${styles[variant]}`}></div>
            </div>
            {Icon && <Icon className={`w-5 h-5 transition-colors ${styles[variant]}`} />}
        </button>
    );
};

// ==========================================
// 2. FORM COMPONENTS (表单组件)
// ==========================================

const NeonInput = ({ label, placeholder, type = "text", icon: Icon }) => (
    <div className="flex flex-col gap-2 w-full">
        {label && <label className="font-sketch text-white/80 text-lg ml-1">{label}</label>}
        <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {Icon ? <Icon className="h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" /> : <Terminal className="h-4 w-4 text-gray-500" />}
            </div>
            <input
                type={type}
                className="w-full bg-[#1e1b2e]/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white font-cyber placeholder-gray-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all duration-300 input-glow"
                placeholder={placeholder}
            />
            {/* Corner Accents */}
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20 group-hover:border-cyan-400 transition-colors"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/20 group-hover:border-cyan-400 transition-colors"></div>
        </div>
    </div>
);

const NeonCheckbox = ({ label, checked, onChange }) => (
    <label className="flex items-center gap-3 cursor-pointer group select-none">
        <div className={`w-6 h-6 border-2 rounded-md flex items-center justify-center transition-all duration-300 ${checked ? 'border-pink-500 bg-pink-500/20 shadow-[0_0_10px_rgba(255,107,107,0.4)]' : 'border-white/30 group-hover:border-white/60'}`}>
            {checked && <Check className="w-4 h-4 text-pink-500 animate-[bounce_0.3s_ease-out]" strokeWidth={4} />}
        </div>
        <span className={`font-sketch text-xl ${checked ? 'text-white' : 'text-white/60 group-hover:text-white/80'} transition-colors`}>
            {label}
        </span>
    </label>
);

const NeonSwitch = ({ checked, onChange }) => (
    <button onClick={onChange} className="relative w-14 h-8 rounded-full bg-[#0f0c16] border border-white/10 p-1 cursor-pointer transition-colors hover:border-white/30">
        <div className={`absolute top-1/2 -translate-y-1/2 left-1 w-6 h-6 rounded-full bg-gradient-to-br from-white to-gray-400 shadow-md transition-all duration-300 ${checked ? 'translate-x-6 shadow-[0_0_10px_rgba(78,205,196,0.6)] bg-cyan-400' : 'bg-gray-600'}`}></div>
        <div className={`absolute inset-0 rounded-full transition-opacity duration-300 ${checked ? 'bg-cyan-400/10 opacity-100' : 'opacity-0'}`}></div>
    </button>
);

const NeonSlider = ({ value, min = 0, max = 100 }) => (
    <div className="w-full h-8 flex items-center group">
        <div className="relative w-full h-1 bg-gray-800 rounded-full">
            <div className="absolute top-0 left-0 h-full bg-orange-500 rounded-full shadow-[0_0_10px_rgba(255,159,67,0.6)]" style={{ width: `${value}%` }}></div>
            <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-[#130f1c] border-2 border-orange-500 rounded-sm shadow-[0_0_10px_rgba(255,159,67,0.8)] cursor-grab active:cursor-grabbing hover:scale-125 transition-transform" style={{ left: `${value}%`, transform: 'translate(-50%, -50%)' }}></div>
        </div>
    </div>
);

// ==========================================
// 3. NAVIGATION & FEEDBACK (导航与反馈)
// ==========================================

const SketchTabs = ({ tabs, activeTab, onChange }) => (
    <div className="flex gap-6 border-b border-white/10 pb-2">
        {tabs.map(tab => (
            <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={`relative pb-2 px-2 font-sketch text-xl transition-all ${activeTab === tab.id ? 'text-white scale-105' : 'text-white/40 hover:text-white/70'}`}
            >
                {tab.label}
                {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-pink-500 shadow-[0_0_8px_rgba(255,107,107,0.8)] rounded-full animate-[width-grow_0.3s]">
                        {/* Hand-drawn scribble effect overlay */}
                        <svg className="absolute -top-3 left-0 w-full h-4 text-pink-500 opacity-80" viewBox="0 0 100 10" preserveAspectRatio="none">
                            <path d="M0 5 Q 50 10, 100 5" stroke="currentColor" fill="none" strokeWidth="2" />
                        </svg>
                    </div>
                )}
            </button>
        ))}
    </div>
);

const HoloModal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#0f0c16]/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-full max-w-md bg-[#1e1b2e] border border-white/10 rounded-xl shadow-[0_0_40px_rgba(168,85,247,0.2)] overflow-hidden animate-[float_4s_ease-in-out_infinite]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
                    <h3 className="font-cyber text-pink-400 uppercase tracking-widest text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> {title}
                    </h3>
                    <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {/* Content */}
                <div className="p-6">
                    {children}
                </div>
                {/* Decorative corner */}
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-gradient-to-tl from-purple-500/20 to-transparent"></div>
            </div>
        </div>
    );
};

const CyberToast = ({ message, type = "info" }) => {
    const colors = {
        info: "border-cyan-400 text-cyan-400 shadow-cyan-400/20",
        success: "border-green-400 text-green-400 shadow-green-400/20",
        warning: "border-orange-400 text-orange-400 shadow-orange-400/20",
    };

    return (
        <div className={`flex items-center gap-3 p-4 bg-[#130f1c]/90 border-l-4 backdrop-blur-md rounded-r-lg shadow-lg max-w-sm border-white/10 ${colors[type].replace('text-', 'border-').split(' ')[0]} ${colors[type].split(' ').pop()}`}>
            <div className={`p-1 rounded bg-current/10 ${colors[type].split(' ')[1]}`}>
                {type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <div className="flex flex-col">
                <span className="font-cyber text-xs uppercase opacity-70">System Notification</span>
                <span className="font-sketch text-lg text-white">{message}</span>
            </div>
        </div>
    );
};

// ==========================================
// 4. DATA DISPLAY (数据展示)
// ==========================================

const CyberTable = ({ headers, data }) => (
    <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-[#1e1b2e]/50 backdrop-blur-sm">
        <table className="w-full text-left">
            <thead>
                <tr className="border-b border-white/10 bg-white/5">
                    {headers.map((h, i) => (
                        <th key={i} className="p-4 font-sketch text-xl text-white/70 tracking-wide">{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody className="font-cyber text-sm">
                {data.map((row, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                        {Object.values(row).map((cell, j) => (
                            <td key={j} className="p-4 text-gray-400 group-hover:text-cyan-300 transition-colors">
                                {cell}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

// ==========================================
// 5. COMPLEX MOLECULES (复合组件)
// ==========================================

// SpotlightCard (Enhanced)
const SpotlightCard = ({ children, color = "purple", className = "" }) => {
    const glowColors = {
        purple: "from-purple-500/20 via-purple-500/5 to-transparent",
        orange: "from-orange-500/20 via-orange-500/5 to-transparent",
        pink: "from-pink-500/20 via-pink-500/5 to-transparent",
        cyan: "from-cyan-500/20 via-cyan-500/5 to-transparent",
    };

    return (
        <div className={`relative p-px rounded-3xl group ${className}`}>
            {/* Floor Glow */}
            <div className={`absolute -inset-4 rounded-[3rem] blur-3xl bg-gradient-radial ${glowColors[color]} opacity-40 group-hover:opacity-60 transition-opacity duration-500`}></div>

            {/* Card Border Gradient */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/10 to-transparent p-[1px] mask-image-linear-gradient-to-b">
                <div className="h-full w-full bg-[#1e1b2e] rounded-3xl"></div>
            </div>

            {/* Content */}
            <div className="relative h-full bg-[#1e1b2e]/60 backdrop-blur-xl rounded-3xl p-6 border border-white/5 shadow-2xl flex flex-col gap-4 overflow-hidden">
                {/* Scanline effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-[50%] animate-[scanline_4s_linear_infinite] opacity-0 group-hover:opacity-100 pointer-events-none"></div>
                {children}
            </div>
        </div>
    );
};


// ==========================================
// MAIN APP & DOCUMENTATION (主程序与展示)
// ==========================================

export default function App() {
    const [activeTab, setActiveTab] = useState('forms');
    const [modalOpen, setModalOpen] = useState(false);
    const [demoSwitch, setDemoSwitch] = useState(true);
    const [demoCheck, setDemoCheck] = useState(false);

    // Mock Data
    const tableData = [
        { id: "01", name: "Cyber Deck MK-I", status: "Active", price: "2000 CR" },
        { id: "02", name: "Neon Katana", status: "Out of Stock", price: "5500 CR" },
        { id: "03", name: "Neural Link", status: "Pending", price: "12000 CR" },
    ];

    return (
        <VaporGrid>

            {/* Header Area */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-6">
                <div className="text-left">
                    <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-300 drop-shadow-sm tracking-tighter">
                        NEON SKETCH <span className="text-pink-500 text-6xl">.</span>
                    </h1>
                    <p className="font-sketch text-2xl text-white/60 mt-2">
                        Atomic UI Kit for the Cozy Web
                    </p>
                </div>

                <div className="flex gap-4">
                    <SketchButton text="GitHub" variant="secondary" />
                    <SketchButton text="Download" onClick={() => setModalOpen(true)} icon={ArrowRight} />
                </div>
            </div>

            {/* Main Navigation */}
            <div className="mb-12">
                <SketchTabs
                    tabs={[
                        { id: 'forms', label: 'Inputs & Controls' },
                        { id: 'data', label: 'Data Display' },
                        { id: 'feedback', label: 'Feedback & Modals' },
                    ]}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                />
            </div>

            {/* Dynamic Content Section */}
            <div className="min-h-[400px]">

                {/* SECTION: FORMS */}
                {activeTab === 'forms' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-[float_0.5s_ease-out]">
                        <SpotlightCard color="cyan">
                            <CyberSubheading>Credentials</CyberSubheading>
                            <div className="space-y-6">
                                <NeonInput label="Username" placeholder="Drifter_01" icon={User} />
                                <NeonInput label="Access Key" placeholder="••••••••" type="password" />
                            </div>
                        </SpotlightCard>

                        <SpotlightCard color="orange">
                            <CyberSubheading>System Controls</CyberSubheading>
                            <div className="space-y-8 mt-4">
                                <div className="flex items-center justify-between">
                                    <span className="font-sketch text-xl text-white/80">Main Power</span>
                                    <NeonSwitch checked={demoSwitch} onChange={() => setDemoSwitch(!demoSwitch)} />
                                </div>

                                <NeonCheckbox
                                    label="Enable Holographic Projection"
                                    checked={demoCheck}
                                    onChange={() => setDemoCheck(!demoCheck)}
                                />

                                <div className="space-y-2">
                                    <div className="flex justify-between font-cyber text-xs text-orange-400">
                                        <span>Intensity</span>
                                        <span>75%</span>
                                    </div>
                                    <NeonSlider value={75} />
                                </div>
                            </div>
                        </SpotlightCard>
                    </div>
                )}

                {/* SECTION: DATA */}
                {activeTab === 'data' && (
                    <div className="grid grid-cols-1 gap-8 animate-[float_0.5s_ease-out]">
                        <SpotlightCard color="purple" className="min-h-[300px]">
                            <div className="flex justify-between items-center mb-6">
                                <CyberSubheading>Inventory Manifest</CyberSubheading>
                                <div className="flex gap-2">
                                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                                    <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                </div>
                            </div>
                            <CyberTable
                                headers={["ID", "Item Name", "Status", "Cost"]}
                                data={tableData}
                            />
                        </SpotlightCard>
                    </div>
                )}

                {/* SECTION: FEEDBACK */}
                {activeTab === 'feedback' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-[float_0.5s_ease-out]">
                        <div className="space-y-4">
                            <CyberToast message="System Updated Successfully" type="success" />
                            <CyberToast message="Connection Unstable" type="warning" />
                            <CyberToast message="New Message from @NeonUser" type="info" />
                        </div>

                        <SpotlightCard color="pink">
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-pink-500/20 flex items-center justify-center border border-pink-500/50">
                                    <Heart className="w-8 h-8 text-pink-400 animate-pulse" />
                                </div>
                                <h3 className="font-sketch text-2xl text-white">Interactive Elements</h3>
                                <p className="font-cyber text-gray-400 text-sm max-w-xs">
                                    Click the button below to trigger the holographic modal experience.
                                </p>
                                <SketchButton text="Open Modal" variant="primary" onClick={() => setModalOpen(true)} />
                            </div>
                        </SpotlightCard>
                    </div>
                )}

            </div>

            {/* Global Elements */}
            <HoloModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="System Access">
                <div className="text-center space-y-6">
                    <div className="w-20 h-20 mx-auto bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                        <Zap className="w-10 h-10 text-cyan-400" />
                    </div>
                    <h2 className="font-sketch text-3xl text-white">Ready to Dive?</h2>
                    <p className="font-cyber text-sm text-gray-400 leading-relaxed">
                        You are about to download the full source code for the Neon Sketch UI Kit.
                        Ensure your neural link is stable.
                    </p>
                    <div className="flex gap-4 justify-center pt-2">
                        <SketchButton text="Cancel" variant="danger" onClick={() => setModalOpen(false)} />
                        <SketchButton text="Confirm" variant="secondary" onClick={() => { alert("Downloaded!"); setModalOpen(false); }} />
                    </div>
                </div>
            </HoloModal>

        </VaporGrid>
    );
}