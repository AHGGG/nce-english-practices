import React, { useState } from 'react';
import {
    Terminal, BookOpen, Zap, Activity,
    ChevronRight, Search, Check, X, Shield
} from 'lucide-react';

/**
 * 🌌 UNIFIED DESIGN SYSTEM: "CYBER-NOIR" (赛博黑色电影/电子墨水矩阵)
 * =============================================================================
 * 
 * 核心理念 (Core Philosophy):
 * 将 Synthwave 的“酷炫”收敛为 Ink & Paper 的“秩序”。
 * 去除“光污染”(Blur/Glow)，保留“光线条”(Sharp Neon)。
 * 
 * 1. 色彩策略 (Color Strategy):
 *    - 背景: 纯粹的 OLED 黑 (#000000) 或 极深灰 (#050505)。
 *    - 前景: 纯白 (#FFFFFF) 用于主要阅读，高对比度。
 *    - 强调色: 并不是大面积晕染，而是像“荧光笔”一样只在关键处出现。
 *      - Primary: #00FF94 (Matrix Green / Cyber Mint) - 极度醒目，用于正确/通过。
 *      - Secondary: #FF0055 (Razor Pink) - 用于错误/警告/重点行动。
 * 
 * 2. 形状与质感 (Shape & Texture):
 *    - 边框: 1px 实线 (Solid)，无圆角 (0px) 或极小圆角 (2px)。硬朗工业风。
 *    - 阴影: 摒弃 Soft Shadow，使用 "Hard Drop Shadow" (硬投影) 但带有霓虹色。
 *      例如: box-shadow: 4px 4px 0px 0px #333;
 * 
 * 3. 排版 (Typography):
 *    - 标题: Serif (衬线体)如 Merriweather/Playfair -> 传达“知识的厚重感”。
 *    - 正文/UI: Monospace (等宽体)如 JetBrains/Roboto Mono -> 传达“训练的精确感”。
 * =============================================================================
 */

const CyberNoirSystem = () => {
    const [activeTab, setActiveTab] = useState('drill');

    return (
        <div className="min-h-screen bg-[#050505] text-[#E0E0E0] p-8 md:p-12 font-mono selection:bg-[#00FF94] selection:text-black">
            {/* GLOBAL NOISE TEXTURE OVERLAY */}
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

            {/* HEADER SECTION */}
            <header className="mb-16 border-b border-[#333] pb-8 flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-6 h-6 bg-[#00FF94] flex items-center justify-center">
                            <Zap size={16} className="text-black fill-current" />
                        </div>
                        <span className="text-[#00FF94] text-xs font-bold tracking-[0.3em] uppercase">System Online</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-serif font-bold text-white tracking-tight">
                        Active <span className="italic text-[#333]">/</span> Grammar Gym
                    </h1>
                </div>

                <div className="hidden md:flex gap-4">
                    <StatBadge label="Streak" value="12 Days" icon={Activity} />
                    <StatBadge label="XP" value="8,400" icon={Shield} />
                </div>
            </header>

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                {/* LEFT COLUMN: NAVIGATION (Ink Style List) */}
                <div className="lg:col-span-3 space-y-8">
                    <nav className="flex flex-col gap-1">
                        <NavItem label="Dashboard" active={false} />
                        <NavItem label="Training Matrix" active={true} />
                        <NavItem label="Story Archive" active={false} />
                        <NavItem label="Neural Chat" active={false} />
                    </nav>

                    <div className="p-6 border border-[#333] bg-[#0A0A0A]">
                        <h3 className="font-serif text-lg text-white mb-4 border-b border-[#333] pb-2">Daily Directive</h3>
                        <p className="text-sm text-[#888] leading-relaxed mb-4">
                            Complete 3 sets of <span className="text-[#00FF94]">Past Perfect</span> transformations to maintain your streak.
                        </p>
                        <Button variant="outline" fullWidth>Accept Mission</Button>
                    </div>
                </div>

                {/* RIGHT COLUMN: INTERACTIVE AREA */}
                <div className="lg:col-span-9 space-y-12">

                    {/* COMPONENT SHOWCASE: BUTTONS & INPUTS */}
                    <section>
                        <SectionHeader title="01. Interaction Primitives" />
                        <div className="flex flex-wrap gap-6 items-end">
                            <Button>Initialize</Button>
                            <Button variant="secondary">Abort Sequence</Button>
                            <Button variant="outline">View Logs</Button>
                            <div className="h-12 w-[1px] bg-[#333] mx-2"></div>
                            <Input placeholder="Enter Command..." />
                        </div>
                    </section>

                    {/* COMPONENT SHOWCASE: CARDS (THE FUSION) */}
                    <section>
                        <SectionHeader title="02. Content Containers" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* CARD 1: STORY MODE (More Serif, Readable) */}
                            <div className="group relative bg-[#0A0A0A] border border-[#333] p-8 hover:border-[#00FF94] transition-colors duration-300">
                                <div className="absolute top-0 right-0 p-2 opacity-50">
                                    <BookOpen size={20} />
                                </div>
                                <div className="mb-6 flex gap-2">
                                    <Tag>Story Mode</Tag>
                                    <Tag variant="outline">RP</Tag>
                                </div>
                                <h3 className="text-2xl font-serif text-white mb-4 group-hover:text-[#00FF94] transition-colors">
                                    The Midnight Detective
                                </h3>
                                <p className="text-[#999] leading-7 font-serif mb-6">
                                    "It <i className="text-white">had been raining</i> for three days when she finally walked into my office.
                                    I <i className="text-white">had never seen</i> anyone look so lost..."
                                </p>
                                <div className="flex justify-between items-center border-t border-[#333] pt-4">
                                    <span className="text-xs text-[#666] uppercase tracking-widest">Diff: Hard</span>
                                    <Button variant="text">Resume Reading <ChevronRight size={14} /></Button>
                                </div>
                            </div>

                            {/* CARD 2: DRILL MODE (More Mono, Data-Heavy) */}
                            <div className="group relative bg-[#0A0A0A] border border-[#333] p-8 hover:border-[#FF0055] transition-colors duration-300">
                                <div className="absolute top-0 right-0 p-2 opacity-50">
                                    <Terminal size={20} />
                                </div>
                                <div className="mb-6 flex gap-2">
                                    <Tag color="pink">Drill Matrix</Tag>
                                    <Tag variant="outline">Speed</Tag>
                                </div>
                                <h3 className="text-xl font-mono font-bold text-white mb-4 group-hover:text-[#FF0055] transition-colors">
                                    Tense Transformation
                                </h3>

                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#666]">Target:</span>
                                        <span className="text-[#00FF94]">Future Perfect</span>
                                    </div>
                                    <div className="bg-[#111] p-3 border border-[#333] text-sm text-[#CCC]">
                                        I <span className="border-b border-[#555]">eat</span> faint hope.
                                    </div>
                                    <div className="flex justify-center text-[#666] text-xs">⬇</div>
                                    <div className="bg-[#111] p-3 border-l-2 border-[#FF0055] text-sm text-white">
                                        I <span className="text-[#FF0055]">will have eaten</span> faint hope.
                                    </div>
                                </div>

                                <div className="flex justify-between items-center border-t border-[#333] pt-4">
                                    <div className="w-full bg-[#333] h-1 mt-1 mr-4">
                                        <div className="w-[75%] bg-[#FF0055] h-full"></div>
                                    </div>
                                    <span className="text-xs font-mono text-[#FF0055]">75%</span>
                                </div>
                            </div>

                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENTS ---

const SectionHeader = ({ title }) => (
    <h2 className="text-sm font-bold text-[#666] uppercase tracking-[0.2em] mb-6 flex items-center gap-4">
        {title}
        <div className="h-[1px] bg-[#333] flex-grow"></div>
    </h2>
);

const Button = ({ children, variant = "primary", fullWidth, className = "" }) => {
    const base = "inline-flex items-center justify-center gap-2 px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider transition-all duration-200 active:translate-y-[2px]";
    const variants = {
        primary: "bg-[#E0E0E0] text-black hover:bg-white border text-black hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]",
        secondary: "bg-transparent text-[#FF0055] border border-[#FF0055] hover:bg-[#FF0055] hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(255,0,85,0.3)]",
        outline: "bg-transparent text-[#888] border border-[#333] hover:border-[#E0E0E0] hover:text-[#E0E0E0]",
        text: "bg-transparent text-[#00FF94] hover:text-white px-0"
    };

    return (
        <button className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}>
            {children}
        </button>
    );
};

const Input = ({ placeholder }) => (
    <div className="relative group flex-grow max-w-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-[#333] group-focus-within:text-[#00FF94] font-bold">{`>`}</span>
        </div>
        <input
            type="text"
            className="w-full bg-[#111] border border-[#333] text-white px-4 py-3 pl-8 text-sm font-mono focus:outline-none focus:border-[#00FF94] focus:ring-1 focus:ring-[#00FF94] transition-all"
            placeholder={placeholder}
        />
    </div>
);

const NavItem = ({ label, active }) => (
    <button className={`text-left px-4 py-3 border-l-2 transition-all font-mono text-sm uppercase tracking-wide ${active
        ? 'border-[#00FF94] bg-[#00FF94]/5 text-[#00FF94]'
        : 'border-transparent text-[#888] hover:text-[#E0E0E0] hover:border-[#333] hover:pl-6'
        }`}>
        {label}
    </button>
);

const Tag = ({ children, variant = 'solid', color = 'green' }) => {
    const colors = {
        green: "bg-[#00FF94] text-black border-[#00FF94]",
        pink: "bg-[#FF0055] text-black border-[#FF0055]"
    };

    if (variant === 'outline') {
        return <span className="px-2 py-0.5 border border-[#333] text-[#888] text-[10px] font-bold uppercase tracking-wider">{children}</span>;
    }

    return (
        <span className={`px-2 py-0.5 ${colors[color]} text-[10px] font-bold uppercase tracking-wider`}>
            {children}
        </span>
    );
};

const StatBadge = ({ label, value, icon: Icon }) => (
    <div className="flex items-center gap-3 px-4 py-2 bg-[#111] border border-[#333]">
        <Icon size={14} className="text-[#666]" />
        <div className="flex flex-col">
            <span className="text-[10px] text-[#666] uppercase tracking-wider leading-none">{label}</span>
            <span className="text-sm font-bold text-white font-mono leading-none mt-1">{value}</span>
        </div>
    </div>
);

export default CyberNoirSystem;
