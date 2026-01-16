import React, { useState, useEffect } from 'react';
import {
    Search,
    Bell,
    Menu,
    User,
    Check,
    X,
    AlertCircle,
    Info,
    AlertTriangle,
    ChevronRight,
    Settings,
    Zap,
    Heart,
    Share2,
    MoreHorizontal,
    Eye,
    EyeOff,
    Music
} from 'lucide-react';

/**
 * --------------------------------------------------------------------------
 * UI 风格描述 (Design Token Specification)
 * --------------------------------------------------------------------------
 * * 风格名称: Neon Synthwave (霓虹合成波) / Cyberpunk Lite
 * * 核心设计原则:
 * 1. 背景 (Background): 深邃的紫黑色底色，搭配透视网格线，营造虚拟空间感。
 * 2. 霓虹光晕 (Neon Glow): 使用 box-shadow 模拟霓虹灯管的漫反射效果。
 * 主色光晕: 0 0 10px #d946ef
 * 3. 玻璃拟态 (Dark Glassmorphism): 组件背景使用高透明度的深色 + 背景模糊 (backdrop-filter: blur)。
 * 4. 边框 (Borders): 细锐的亮色边框，模拟激光切割感。
 * 5. 交互 (Interactions): 悬停时亮度增加、光晕扩大或产生位移。
 * * 色彩板 (Palette):
 * - Primary: Neon Pink (#d946ef) - 用于主要操作、强调。
 * - Secondary: Cyber Cyan (#06b6d4) - 用于次要信息、科技感点缀。
 * - Background: Deep Space (#0f0720) - 页面底色。
 * - Surface: Translucent Purple (#2a1b3dcc) - 卡片/容器背景。
 * - Text: White (#ffffff) & Pale Pink (#fce7f3).
 */

// --- 基础样式注入 (用于 Grid 背景动画和自定义字体) ---
const GlobalStyles = () => (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Permanent+Marker&display=swap');

    body {
      background-color: #0f0720;
      color: #ffffff;
      font-family: 'Rajdhani', sans-serif;
    }

    .font-marker {
      font-family: 'Permanent Marker', cursive;
    }

    /* 动态网格背景 */
    .synth-grid {
      background-size: 40px 40px;
      background-image:
        linear-gradient(to right, rgba(217, 70, 239, 0.1) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(217, 70, 239, 0.1) 1px, transparent 1px);
      transform: perspective(500px) rotateX(60deg);
      transform-origin: top center;
      animation: grid-move 20s linear infinite;
      position: absolute;
      top: 0;
      left: -50%;
      right: -50%;
      bottom: -100%;
      z-index: -1;
      mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%);
    }

    @keyframes grid-move {
      0% { transform: perspective(500px) rotateX(60deg) translateY(0); }
      100% { transform: perspective(500px) rotateX(60deg) translateY(40px); }
    }
    
    /* 自定义滚动条 */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #1a0b2e;
    }
    ::-webkit-scrollbar-thumb {
      background: #4a2b7a;
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #d946ef;
    }
  `}</style>
);

// --- ATOMS (原子组件) ---

const Button = ({ children, variant = 'primary', size = 'md', icon: Icon, disabled, className = '', ...props }) => {
    const baseStyles = "relative inline-flex items-center justify-center font-bold tracking-wider uppercase transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none rounded-sm overflow-hidden group";

    const variants = {
        primary: "bg-fuchsia-600 text-white border border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.5)] hover:shadow-[0_0_25px_rgba(217,70,239,0.8)] hover:bg-fuchsia-500 hover:border-fuchsia-300",
        secondary: "bg-transparent text-cyan-400 border border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.2)] hover:shadow-[0_0_15px_rgba(6,182,212,0.6)] hover:bg-cyan-950/30 hover:text-cyan-300",
        ghost: "bg-transparent text-gray-300 hover:text-white hover:bg-white/5",
        icon: "p-2 rounded-full aspect-square"
    };

    const sizes = {
        sm: "text-xs px-3 py-1.5",
        md: "text-sm px-5 py-2.5",
        lg: "text-base px-8 py-3",
        icon: "p-2" // Special case overrides
    };

    const sizeClass = variant === 'icon' ? sizes.icon : sizes[size];

    return (
        <button
            disabled={disabled}
            className={`${baseStyles} ${variants[variant]} ${sizeClass} ${className}`}
            {...props}
        >
            {/* 扫光动画效果 */}
            {variant === 'primary' && (
                <span className="absolute inset-0 w-full h-full -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" />
            )}
            {Icon && <Icon size={18} className={children ? "mr-2" : ""} />}
            <span className="relative z-0">{children}</span>
        </button>
    );
};

const Input = ({ label, type = "text", placeholder, icon: Icon, error, ...props }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const inputType = type === "password" && showPassword ? "text" : type;

    return (
        <div className="w-full group">
            {label && <label className="block text-xs font-bold text-fuchsia-300 mb-1.5 uppercase tracking-widest ml-1">{label}</label>}
            <div className={`relative flex items-center bg-gray-900/50 border transition-all duration-300 ${isFocused ? 'border-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.3)]' : error ? 'border-red-500' : 'border-slate-700/50 hover:border-slate-500'}`}>
                {Icon && <Icon size={18} className={`ml-3 ${isFocused ? 'text-fuchsia-400' : 'text-slate-500'}`} />}
                <input
                    type={inputType}
                    placeholder={placeholder}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="w-full bg-transparent border-none text-white px-3 py-2.5 outline-none placeholder-slate-500 font-medium"
                    {...props}
                />
                {type === "password" && (
                    <button onClick={() => setShowPassword(!showPassword)} className="mr-3 text-slate-500 hover:text-white focus:outline-none">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
            </div>
            {error && <p className="text-red-400 text-xs mt-1 ml-1">{error}</p>}
        </div>
    );
};

const Toggle = ({ checked, onChange, label }) => (
    <label className="flex items-center cursor-pointer group">
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
            <div className={`block w-12 h-7 rounded-full transition-all duration-300 border ${checked ? 'bg-fuchsia-900/50 border-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.4)]' : 'bg-gray-800 border-gray-600'}`}></div>
            <div className={`absolute left-1 top-1 w-5 h-5 rounded-full transition-transform duration-300 ${checked ? 'translate-x-5 bg-fuchsia-400 shadow-[0_0_8px_#d946ef]' : 'bg-gray-400'}`}></div>
        </div>
        {label && <span className="ml-3 text-sm text-gray-300 group-hover:text-white transition-colors">{label}</span>}
    </label>
);

const Checkbox = ({ checked, onChange, label }) => (
    <label className="flex items-center cursor-pointer group">
        <div className={`w-5 h-5 border rounded-sm flex items-center justify-center transition-all duration-200 ${checked ? 'bg-fuchsia-600 border-fuchsia-400 shadow-[0_0_8px_rgba(217,70,239,0.6)]' : 'bg-transparent border-gray-600 group-hover:border-gray-400'}`}>
            {checked && <Check size={14} className="text-white" />}
        </div>
        {label && <span className="ml-3 text-sm text-gray-300 group-hover:text-white select-none">{label}</span>}
    </label>
);

const Badge = ({ children, variant = 'default' }) => {
    const styles = {
        default: "bg-slate-800 text-slate-300 border-slate-600",
        success: "bg-emerald-900/40 text-emerald-400 border-emerald-500/50 shadow-[0_0_5px_rgba(16,185,129,0.2)]",
        warning: "bg-amber-900/40 text-amber-400 border-amber-500/50 shadow-[0_0_5px_rgba(245,158,11,0.2)]",
        error: "bg-red-900/40 text-red-400 border-red-500/50 shadow-[0_0_5px_rgba(239,68,68,0.2)]",
        neon: "bg-fuchsia-900/40 text-fuchsia-300 border-fuchsia-500/50 shadow-[0_0_8px_rgba(217,70,239,0.3)]",
    };
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-bold border uppercase tracking-wider ${styles[variant]}`}>
            {children}
        </span>
    );
};

// --- MOLECULES (分子组件) ---

const Card = ({ children, className = '', title, image, actions }) => (
    <div className={`group relative bg-[#130a24]/80 backdrop-blur-md border border-white/10 overflow-hidden hover:border-fuchsia-500/50 transition-all duration-500 ${className}`}>
        {/* 角落装饰 */}
        <div className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {image && (
            <div className="w-full h-48 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-[#130a24] to-transparent z-10" />
                <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            </div>
        )}

        <div className="p-5 relative z-20">
            {title && <h3 className="text-xl font-bold text-white mb-2 font-rajdhani tracking-wide group-hover:text-fuchsia-400 transition-colors">{title}</h3>}
            <div className="text-gray-400 text-sm leading-relaxed mb-4">
                {children}
            </div>
            {actions && <div className="mt-4 pt-4 border-t border-white/5 flex gap-3">{actions}</div>}
        </div>
    </div>
);

const Alert = ({ type = 'info', title, children, onClose }) => {
    const styles = {
        info: { icon: Info, color: "text-cyan-400", border: "border-cyan-500/50", bg: "bg-cyan-950/30" },
        success: { icon: Check, color: "text-emerald-400", border: "border-emerald-500/50", bg: "bg-emerald-950/30" },
        warning: { icon: AlertTriangle, color: "text-amber-400", border: "border-amber-500/50", bg: "bg-amber-950/30" },
        error: { icon: AlertCircle, color: "text-red-400", border: "border-red-500/50", bg: "bg-red-950/30" },
    };
    const current = styles[type];
    const Icon = current.icon;

    return (
        <div className={`relative flex gap-3 p-4 border-l-4 ${current.border} ${current.bg} backdrop-blur-sm mb-4`}>
            <Icon className={`${current.color} flex-shrink-0 mt-0.5`} size={20} />
            <div className="flex-1">
                {title && <h4 className={`font-bold text-sm mb-1 ${current.color}`}>{title}</h4>}
                <div className="text-sm text-gray-300">{children}</div>
            </div>
            {onClose && (
                <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                    <X size={16} />
                </button>
            )}
        </div>
    );
};

const Modal = ({ isOpen, onClose, title, children, footer }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#0f0720]/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-[#1a0b2e] border border-fuchsia-500/30 shadow-[0_0_50px_rgba(217,70,239,0.2)] animate-in fade-in zoom-in-95 duration-200">
                {/* Neon Top Line */}
                <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-cyan-500" />

                <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-2xl font-bold font-marker tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">
                            {title}
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white hover:rotate-90 transition-all">
                            <X size={24} />
                        </button>
                    </div>
                    <div className="text-gray-300">
                        {children}
                    </div>
                    {footer && <div className="mt-8 pt-4 border-t border-white/5 flex justify-end gap-3">{footer}</div>}
                </div>
            </div>
        </div>
    );
};

// --- ORGANISMS (组织组件) ---

const Navbar = () => (
    <nav className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0f0720]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-tr from-fuchsia-600 to-cyan-500 rounded-sm shadow-[0_0_10px_rgba(217,70,239,0.5)] flex items-center justify-center">
                        <Zap size={20} className="text-white fill-white" />
                    </div>
                    <span className="font-marker text-2xl text-white ml-2 mt-1" style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>
                        NEON<span className="text-fuchsia-500">RIDE</span>
                    </span>
                </div>

                <div className="hidden md:flex items-center space-x-8">
                    {['Dashboard', 'Garage', 'Missions', 'Leaderboard'].map((item) => (
                        <a key={item} href="#" className="text-sm font-bold uppercase tracking-wider text-gray-400 hover:text-fuchsia-400 transition-colors relative group">
                            {item}
                            <span className="absolute -bottom-5 left-0 w-0 h-0.5 bg-fuchsia-500 transition-all group-hover:w-full shadow-[0_0_8px_#d946ef]" />
                        </a>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <Button variant="icon" className="text-gray-400 hover:text-white">
                        <Search size={20} />
                    </Button>
                    <Button variant="icon" className="text-gray-400 hover:text-white relative">
                        <Bell size={20} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-fuchsia-500 rounded-full animate-pulse shadow-[0_0_5px_#d946ef]" />
                    </Button>
                    <div className="h-8 w-[1px] bg-white/10 mx-1" />
                    <div className="flex items-center gap-3 cursor-pointer group">
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-900 to-purple-900 border border-white/20 group-hover:border-fuchsia-500 transition-colors flex items-center justify-center">
                            <User size={16} className="text-cyan-300" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </nav>
);

const DataTable = () => {
    const data = [
        { id: '#2049', name: 'Cyber Truck X1', status: 'Ready', battery: '98%', type: 'Heavy' },
        { id: '#3310', name: 'Neon Racer S', status: 'Charging', battery: '45%', type: 'Speed' },
        { id: '#1092', name: 'Void Walker', status: 'Repair', battery: '12%', type: 'Stealth' },
        { id: '#5521', name: 'Grid Runner', status: 'Ready', battery: '100%', type: 'All-Terrain' },
    ];

    return (
        <div className="overflow-x-auto border border-white/10 rounded-sm bg-[#130a24]/50">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-fuchsia-500/30 bg-fuchsia-900/10">
                        <th className="p-4 text-xs font-bold text-fuchsia-300 uppercase tracking-widest">ID</th>
                        <th className="p-4 text-xs font-bold text-fuchsia-300 uppercase tracking-widest">Vehicle Name</th>
                        <th className="p-4 text-xs font-bold text-fuchsia-300 uppercase tracking-widest">Status</th>
                        <th className="p-4 text-xs font-bold text-fuchsia-300 uppercase tracking-widest">Energy</th>
                        <th className="p-4 text-xs font-bold text-fuchsia-300 uppercase tracking-widest">Class</th>
                        <th className="p-4 text-xs font-bold text-fuchsia-300 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, idx) => (
                        <tr key={row.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                            <td className="p-4 text-sm font-mono text-cyan-400">{row.id}</td>
                            <td className="p-4 text-sm font-bold text-white group-hover:text-fuchsia-300 transition-colors">{row.name}</td>
                            <td className="p-4">
                                <Badge variant={row.status === 'Ready' ? 'success' : row.status === 'Charging' ? 'warning' : 'error'}>
                                    {row.status}
                                </Badge>
                            </td>
                            <td className="p-4 text-sm">
                                <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full shadow-[0_0_5px_currentColor] ${parseInt(row.battery) > 50 ? 'bg-cyan-400 text-cyan-400' : 'bg-amber-400 text-amber-400'}`}
                                        style={{ width: row.battery }}
                                    />
                                </div>
                            </td>
                            <td className="p-4 text-sm text-gray-400">{row.type}</td>
                            <td className="p-4 text-right">
                                <button className="text-gray-500 hover:text-white transition-colors"><MoreHorizontal size={18} /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// --- MAIN DEMO APP ---

export default function App() {
    const [activeTab, setActiveTab] = useState('foundations');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [toggle1, setToggle1] = useState(true);
    const [toggle2, setToggle2] = useState(false);

    const tabs = [
        { id: 'foundations', label: '1. Foundations' },
        { id: 'atoms', label: '2. Atoms' },
        { id: 'molecules', label: '3. Molecules' },
        { id: 'organisms', label: '4. Organisms' },
    ];

    return (
        <div className="min-h-screen text-white relative overflow-x-hidden selection:bg-fuchsia-500 selection:text-white pb-20">
            <GlobalStyles />

            {/* 动态网格背景层 */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-[#0f0720] via-[#1a0b2e] to-[#2a0f3d]" />
                <div className="synth-grid opacity-30" />
                <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#0f0720] to-transparent z-10" />
            </div>

            <div className="relative z-10">
                <Navbar />

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

                    {/* Header */}
                    <div className="mb-12 text-center">
                        <Badge variant="neon">Design System v1.0</Badge>
                        <h1 className="text-6xl md:text-7xl font-marker mt-4 mb-4 text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 via-white to-cyan-500 drop-shadow-[0_0_10px_rgba(217,70,239,0.5)]">
                            NEON SYNC
                        </h1>
                        <p className="text-xl text-cyan-200/80 font-light max-w-2xl mx-auto">
                            A retro-futuristic React UI kit inspired by synthwave aesthetics and low-poly 3D environments.
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="flex flex-wrap justify-center gap-2 mb-12">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-2 text-sm font-bold uppercase tracking-wider transition-all duration-300 clip-path-slant ${activeTab === tab.id
                                        ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)]'
                                        : 'bg-transparent text-gray-500 hover:text-white border border-transparent hover:border-white/20'
                                    }`}
                                style={{ clipPath: 'polygon(10% 0, 100% 0, 90% 100%, 0% 100%)' }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* 1. FOUNDATIONS */}
                        {activeTab === 'foundations' && (
                            <div className="space-y-12">
                                <section>
                                    <h2 className="text-2xl font-bold text-fuchsia-400 mb-6 flex items-center gap-2">
                                        <div className="w-2 h-8 bg-fuchsia-500" /> Color Palette
                                    </h2>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        {[
                                            { name: 'Neon Pink', hex: '#d946ef', class: 'bg-fuchsia-500' },
                                            { name: 'Cyber Cyan', hex: '#06b6d4', class: 'bg-cyan-500' },
                                            { name: 'Void Purple', hex: '#1a0b2e', class: 'bg-[#1a0b2e]' },
                                            { name: 'Grid White', hex: '#ffffff', class: 'bg-white' },
                                            { name: 'Success Green', hex: '#10b981', class: 'bg-emerald-500' },
                                            { name: 'Warning Amber', hex: '#f59e0b', class: 'bg-amber-500' },
                                            { name: 'Error Red', hex: '#ef4444', class: 'bg-red-500' },
                                        ].map((color) => (
                                            <div key={color.name} className="bg-[#130a24] p-4 border border-white/5 rounded-sm">
                                                <div className={`h-24 w-full rounded-sm mb-3 shadow-lg ${color.class}`} />
                                                <p className="font-bold text-white">{color.name}</p>
                                                <p className="text-xs text-gray-500 font-mono mt-1">{color.hex}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section>
                                    <h2 className="text-2xl font-bold text-fuchsia-400 mb-6 flex items-center gap-2">
                                        <div className="w-2 h-8 bg-cyan-500" /> Typography
                                    </h2>
                                    <div className="bg-[#130a24]/50 border border-white/10 p-8 space-y-8 backdrop-blur-sm">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-2 font-mono">Display / H1 (Permanent Marker)</p>
                                            <h1 className="text-5xl font-marker text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">
                                                The quick brown fox jumps over the neon grid.
                                            </h1>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-2 font-mono">Headings (Rajdhani Bold)</p>
                                                <h2 className="text-4xl font-bold mb-2">Heading Level 2</h2>
                                                <h3 className="text-3xl font-bold mb-2">Heading Level 3</h3>
                                                <h4 className="text-2xl font-bold mb-2 text-fuchsia-300">Heading Level 4</h4>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-2 font-mono">Body (Rajdhani Medium)</p>
                                                <p className="text-lg leading-relaxed text-gray-300 mb-4">
                                                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. In a cyberpunk future,
                                                    data is the new currency. <span className="text-cyan-400">High-tech, low-life.</span>
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    Caption text looks like this. Subtle and informative.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* 2. ATOMS */}
                        {activeTab === 'atoms' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                <section>
                                    <h2 className="text-2xl font-bold text-fuchsia-400 mb-6 border-b border-white/10 pb-2">Buttons</h2>
                                    <div className="flex flex-wrap gap-4 items-center mb-8">
                                        <Button variant="primary">Start Game</Button>
                                        <Button variant="secondary">Settings</Button>
                                        <Button variant="ghost">Cancel</Button>
                                        <Button variant="primary" disabled>Locked</Button>
                                        <Button variant="icon" className="bg-fuchsia-900/50 text-fuchsia-200 border border-fuchsia-500/30">
                                            <Settings />
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-4 items-center">
                                        <Button size="sm" variant="primary">Small</Button>
                                        <Button size="md" variant="primary">Medium</Button>
                                        <Button size="lg" variant="primary">Large Button</Button>
                                    </div>
                                </section>

                                <section>
                                    <h2 className="text-2xl font-bold text-fuchsia-400 mb-6 border-b border-white/10 pb-2">Inputs & Controls</h2>
                                    <div className="space-y-6 max-w-md">
                                        <Input label="Username" placeholder="Enter your callsign..." icon={User} />
                                        <Input label="Search System" placeholder="Find files..." icon={Search} />
                                        <Input label="Password" type="password" placeholder="••••••••" icon={Check} />

                                        <div className="flex gap-8 pt-4">
                                            <div className="space-y-3">
                                                <p className="text-xs font-bold text-fuchsia-300 uppercase tracking-widest">Toggles</p>
                                                <Toggle label="Neon Glow" checked={toggle1} onChange={() => setToggle1(!toggle1)} />
                                                <Toggle label="Sound FX" checked={toggle2} onChange={() => setToggle2(!toggle2)} />
                                            </div>
                                            <div className="space-y-3">
                                                <p className="text-xs font-bold text-fuchsia-300 uppercase tracking-widest">Checkboxes</p>
                                                <Checkbox label="Remember me" checked={true} onChange={() => { }} />
                                                <Checkbox label="Accept EULA" checked={false} onChange={() => { }} />
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h2 className="text-2xl font-bold text-fuchsia-400 mb-6 border-b border-white/10 pb-2">Feedback</h2>
                                    <div className="flex gap-4 mb-6">
                                        <Badge variant="default">Default</Badge>
                                        <Badge variant="success">Completed</Badge>
                                        <Badge variant="warning">Loading</Badge>
                                        <Badge variant="error">Failed</Badge>
                                        <Badge variant="neon">New Item</Badge>
                                    </div>
                                    <div className="space-y-4 max-w-md">
                                        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-fuchsia-500 w-2/3 shadow-[0_0_10px_#d946ef] relative overflow-hidden">
                                                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-cyan-400 text-sm font-bold tracking-widest animate-pulse">PROCESSING DATA...</span>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* 3. MOLECULES */}
                        {activeTab === 'molecules' && (
                            <div className="space-y-12">
                                <section>
                                    <h2 className="text-2xl font-bold text-fuchsia-400 mb-6">Cards</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <Card
                                            title="Neon City Run"
                                            image="https://images.unsplash.com/photo-1555680202-c86f0e12f086?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                                            actions={
                                                <>
                                                    <Button size="sm" variant="primary">Play Now</Button>
                                                    <Button size="sm" variant="ghost"><Heart size={16} /></Button>
                                                </>
                                            }
                                        >
                                            Explore the procedural highways of the net. Dodge traffic and collect data packets.
                                        </Card>

                                        <Card title="System Status">
                                            <div className="space-y-4 mt-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-400">CPU Load</span>
                                                    <span className="text-cyan-400 font-mono">87%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-cyan-500 w-[87%] shadow-[0_0_5px_#06b6d4]" />
                                                </div>

                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-400">Memory</span>
                                                    <span className="text-fuchsia-400 font-mono">42%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-fuchsia-500 w-[42%] shadow-[0_0_5px_#d946ef]" />
                                                </div>
                                            </div>
                                            <div className="mt-6 flex justify-center">
                                                <Button size="sm" variant="secondary" className="w-full">Run Diagnostics</Button>
                                            </div>
                                        </Card>

                                        <Card title="New Upgrade" className="border-fuchsia-500/50 bg-fuchsia-900/10">
                                            <div className="flex flex-col items-center text-center py-4">
                                                <div className="w-16 h-16 rounded-full bg-fuchsia-600/20 flex items-center justify-center mb-4 border border-fuchsia-500 shadow-[0_0_15px_#d946ef] animate-pulse">
                                                    <Zap size={32} className="text-white" />
                                                </div>
                                                <h4 className="text-white font-bold text-lg">Turbo Boost</h4>
                                                <p className="text-sm text-fuchsia-200 mt-2">Instant speed increase for 5 seconds.</p>
                                            </div>
                                            <Button size="sm" variant="primary" className="w-full mt-2">Equip Item</Button>
                                        </Card>
                                    </div>
                                </section>

                                <section>
                                    <h2 className="text-2xl font-bold text-fuchsia-400 mb-6">Alerts</h2>
                                    <div className="max-w-2xl">
                                        <Alert type="info" title="System Update">Patch v2.0.4 is available for download.</Alert>
                                        <Alert type="success" title="Mission Complete">Data package successfully extracted.</Alert>
                                        <Alert type="warning" title="Low Energy">Shield generators are at 15% capacity.</Alert>
                                        <Alert type="error" title="Breach Detected">Unauthorized access attempt in Sector 7.</Alert>
                                    </div>
                                </section>

                                <section>
                                    <h2 className="text-2xl font-bold text-fuchsia-400 mb-6">Modal</h2>
                                    <Button onClick={() => setIsModalOpen(true)} variant="primary" size="lg">Open Demo Modal</Button>

                                    <Modal
                                        isOpen={isModalOpen}
                                        onClose={() => setIsModalOpen(false)}
                                        title="CONFIRM OVERRIDE"
                                        footer={
                                            <>
                                                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                                <Button variant="primary" onClick={() => setIsModalOpen(false)}>Execute</Button>
                                            </>
                                        }
                                    >
                                        <p className="mb-4">Are you sure you want to override the security protocols? This action will trigger a <span className="text-fuchsia-400 font-bold">Class 4 Alarm</span> and cannot be undone.</p>
                                        <div className="bg-black/40 p-3 rounded border border-red-500/30 flex items-center gap-3 text-red-400 text-sm">
                                            <AlertTriangle size={16} />
                                            Warning: Trace program active.
                                        </div>
                                    </Modal>
                                </section>
                            </div>
                        )}

                        {/* 4. ORGANISMS */}
                        {activeTab === 'organisms' && (
                            <div className="space-y-12">
                                <section>
                                    <h2 className="text-2xl font-bold text-fuchsia-400 mb-6">Data Table</h2>
                                    <DataTable />
                                </section>

                                <section>
                                    <h2 className="text-2xl font-bold text-fuchsia-400 mb-6">Complex Card Grid</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div key={i} className="bg-[#130a24] border border-white/5 p-4 relative group hover:-translate-y-1 transition-transform duration-300">
                                                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="w-10 h-10 bg-white/5 rounded flex items-center justify-center">
                                                        <Music className="text-fuchsia-400" size={20} />
                                                    </div>
                                                    <span className="text-xs text-gray-500 font-mono">TRK-0{i}</span>
                                                </div>
                                                <h4 className="font-bold text-white text-lg">Synthwave Mix Vol.{i}</h4>
                                                <p className="text-sm text-gray-500 mt-1">Neon Records</p>
                                                <div className="mt-4 flex items-center justify-between">
                                                    <span className="text-xs bg-cyan-900/30 text-cyan-400 px-2 py-1 rounded">3:45</span>
                                                    <button className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-fuchsia-400 hover:text-white transition-colors">
                                                        <span className="ml-0.5">▶</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        )}

                    </div>
                </main>
            </div>
        </div>
    );
}