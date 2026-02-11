/**
 * UI Design Style Description: "Ink & Paper" (墨与纸)
 * ---------------------------------------------------------------------------
 * A design system inspired by traditional pencil sketches and ink wash paintings.
 *
 * Core Principles:
 * 1. Palette: Monochromatic, relying on "Paper White" (#F9F7F1), "Charcoal" (#333333),
 * and "Pencil Gray" (#777777). No bright synthetic colors unless for critical states.
 * 2. Typography: Strong use of Serif fonts (Times/Merriweather style) for headings to
 * evoke a storybook feel, paired with clean Sans-serif for UI density.
 * 3. Borders & Shadows: Distinct, high-contrast borders (1px solid) rather than soft
 * diffused shadows. Elements feel "drawn" on the page.
 * 4. Interactions: Crisp and immediate, focusing on contrast changes (inverted colors)
 * rather than glows or gradients.
 * ---------------------------------------------------------------------------
 */

import React, { useState, useEffect } from 'react';
import {
    Check, X, ChevronDown, Search, Bell, Menu,
    User, Settings, AlertTriangle, Info, Eye, EyeOff,
    MoreHorizontal, ArrowRight, Loader2
} from 'lucide-react';

// --- FOUNDATIONS: Utility Classes & Constants ---
// In a real app, these would be in tailwind.config.js
const COLORS = {
    bg: 'bg-[#F9F7F1]',       // Paper texture background
    surface: 'bg-white',      // Component background
    surfaceAlt: 'bg-[#F0EFEB]', // Secondary background
    text: 'text-[#2C2C2C]',   // Ink black
    textMuted: 'text-[#666666]', // Pencil gray
    border: 'border-[#E5E0D8]', // Light pencil line
    borderStrong: 'border-[#2C2C2C]', // Ink line
    primary: 'bg-[#2C2C2C] text-white hover:bg-[#000000]',
    secondary: 'bg-[#E5E0D8] text-[#2C2C2C] hover:bg-[#D6D0C4]',
    success: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    warning: 'text-amber-700 bg-amber-50 border-amber-200',
    error: 'text-rose-700 bg-rose-50 border-rose-200',
};

// --- ATOMS: Basic Building Blocks ---

const Button = ({ variant = 'primary', size = 'md', icon: Icon, disabled, isLoading, className = '', children, ...props }) => {
    const baseStyles = "inline-flex items-center justify-center font-serif transition-all duration-200 border rounded-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#2C2C2C] disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: `${COLORS.primary} border-transparent shadow-sm`,
        secondary: `${COLORS.secondary} border-transparent`,
        ghost: "bg-transparent hover:bg-[#E5E0D8]/30 text-[#2C2C2C] border-transparent",
        outline: "bg-transparent border-[#2C2C2C] text-[#2C2C2C] hover:bg-[#2C2C2C] hover:text-white",
        icon: "p-2 rounded-full hover:bg-black/5 aspect-square border-transparent",
    };

    const sizes = {
        sm: "text-xs px-3 py-1.5 gap-1.5",
        md: "text-sm px-4 py-2 gap-2",
        lg: "text-base px-6 py-3 gap-2.5",
        icon: "p-2", // Special case for icon buttons
    };

    const finalVariant = variants[variant] || variants.primary;
    const finalSize = variant === 'icon' ? sizes.icon : sizes[size];

    return (
        <button className={`${baseStyles} ${finalVariant} ${finalSize} ${className}`} disabled={disabled || isLoading} {...props}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon && <Icon className="w-4 h-4" />}
            {children}
        </button>
    );
};

const Input = ({ label, icon: Icon, type = "text", error, ...props }) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
        <div className="w-full space-y-1.5">
            {label && <label className="block text-xs font-bold tracking-wider text-[#666666] uppercase">{label}</label>}
            <div className="relative group">
                {Icon && (
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#999]">
                        <Icon className="w-4 h-4" />
                    </div>
                )}
                <input
                    type={inputType}
                    className={`w-full bg-white border ${error ? 'border-rose-400' : 'border-[#D1CDC7]'} 
            text-[#2C2C2C] text-sm rounded-sm focus:ring-1 focus:ring-[#2C2C2C] focus:border-[#2C2C2C] 
            transition-colors placeholder:text-gray-400 py-2.5 
            ${Icon ? 'pl-9' : 'pl-3'} ${isPassword ? 'pr-9' : 'pr-3'}
          `}
                    {...props}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#999] hover:text-[#2C2C2C]"
                    >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                )}
            </div>
            {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
        </div>
    );
};

const Checkbox = ({ label, checked, onChange }) => (
    <label className="inline-flex items-center gap-2 cursor-pointer group">
        <div className={`w-5 h-5 border rounded-sm flex items-center justify-center transition-colors 
      ${checked ? 'bg-[#2C2C2C] border-[#2C2C2C]' : 'bg-white border-[#D1CDC7] group-hover:border-[#999]'}`}>
            {checked && <Check className="w-3.5 h-3.5 text-white" />}
        </div>
        <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
        {label && <span className="text-sm text-[#2C2C2C] select-none">{label}</span>}
    </label>
);

const Toggle = ({ checked, onChange, label }) => (
    <label className="inline-flex items-center cursor-pointer gap-3">
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
            <div className={`block w-10 h-6 rounded-full transition-colors duration-300 border ${checked ? 'bg-[#2C2C2C] border-[#2C2C2C]' : 'bg-[#E5E0D8] border-[#D1CDC7]'}`}></div>
            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${checked ? 'translate-x-4' : 'translate-x-0'} shadow-sm`}></div>
        </div>
        {label && <span className="text-sm text-[#2C2C2C]">{label}</span>}
    </label>
);

const Badge = ({ children, variant = 'neutral', className = '' }) => {
    const styles = {
        neutral: "bg-[#E5E0D8] text-[#2C2C2C]",
        success: "bg-emerald-100 text-emerald-800 border-emerald-200",
        warning: "bg-amber-100 text-amber-800 border-amber-200",
        error: "bg-rose-100 text-rose-800 border-rose-200",
        outline: "bg-transparent border border-[#2C2C2C] text-[#2C2C2C]",
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-transparent ${styles[variant]} ${className}`}>
            {children}
        </span>
    );
};

const ProgressBar = ({ value, max = 100 }) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    return (
        <div className="w-full bg-[#E5E0D8] rounded-full h-2.5 overflow-hidden border border-[#D1CDC7]/50">
            <div
                className="bg-[#2C2C2C] h-2.5 transition-all duration-500 ease-out relative"
                style={{ width: `${percentage}%` }}
            >
                {/* Subtle scratch texture for the bar */}
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]"></div>
            </div>
        </div>
    );
};

// --- MOLECULES: Combinations of Atoms ---

const Card = ({ title, description, image, footer, className = '', children }) => (
    <div className={`group bg-white border border-[#E5E0D8] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] hover:shadow-[4px_4px_0px_0px_rgba(44,44,44,0.1)] transition-all duration-300 overflow-hidden rounded-sm ${className}`}>
        {image && (
            <div className="h-48 w-full bg-[#F0EFEB] overflow-hidden relative border-b border-[#E5E0D8]">
                <img src={image} alt={title} className="w-full h-full object-cover grayscale opacity-90 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" />
                <div className="absolute inset-0 ring-1 ring-inset ring-black/5"></div>
            </div>
        )}
        <div className="p-5 space-y-3">
            {title && <h3 className="text-lg font-serif font-bold text-[#2C2C2C] leading-tight">{title}</h3>}
            {description && <p className="text-sm text-[#666666] leading-relaxed">{description}</p>}
            {children}
        </div>
        {footer && (
            <div className="px-5 py-3 bg-[#FAFAFA] border-t border-[#E5E0D8] flex items-center justify-between">
                {footer}
            </div>
        )}
    </div>
);

const Alert = ({ type = 'info', title, message, onClose }) => {
    const styles = {
        info: COLORS.surfaceAlt + ' text-[#2C2C2C] border-[#D1CDC7]',
        success: COLORS.success,
        warning: COLORS.warning,
        error: COLORS.error,
    };

    const icons = {
        info: Info,
        success: Check,
        warning: AlertTriangle,
        error: AlertTriangle,
    };

    const IconComp = icons[type];

    return (
        <div className={`p-4 rounded-sm border flex items-start gap-3 relative ${styles[type]}`}>
            <IconComp className="w-5 h-5 shrink-0 mt-0.5 opacity-80" />
            <div className="flex-1">
                {title && <h4 className="font-bold text-sm mb-1">{title}</h4>}
                <p className="text-sm opacity-90">{message}</p>
            </div>
            {onClose && (
                <button onClick={onClose} className="hover:bg-black/5 p-1 rounded transition-colors">
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

const Modal = ({ isOpen, onClose, title, children, footer }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#F9F7F1]/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white w-full max-w-md rounded-sm shadow-[8px_8px_0px_0px_rgba(44,44,44,0.1)] border border-[#2C2C2C] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-[#E5E0D8]">
                    <h3 className="font-serif text-xl font-bold text-[#2C2C2C]">{title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-[#F0EFEB] rounded-full transition-colors">
                        <X className="w-5 h-5 text-[#2C2C2C]" />
                    </button>
                </div>
                <div className="p-6 text-[#4a4a4a]">
                    {children}
                </div>
                {footer && (
                    <div className="p-4 bg-[#FAFAFA] border-t border-[#E5E0D8] flex justify-end gap-3 rounded-b-sm">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- ORGANISMS: Complex Structures ---

const Navbar = () => (
    <nav className="bg-white border-b border-[#E5E0D8] px-4 md:px-8 h-16 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#2C2C2C] text-white flex items-center justify-center rounded-sm font-serif font-bold text-xl">
                S.
            </div>
            <span className="font-serif font-bold text-xl tracking-tight hidden md:block">Studio Ink</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#666666]">
            <a href="#" className="hover:text-[#2C2C2C] transition-colors">Collections</a>
            <a href="#" className="hover:text-[#2C2C2C] transition-colors">Artists</a>
            <a href="#" className="text-[#2C2C2C] border-b-2 border-[#2C2C2C] pb-0.5">Exhibitions</a>
            <a href="#" className="hover:text-[#2C2C2C] transition-colors">Journal</a>
        </div>

        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" icon={Search} />
            <Button variant="ghost" size="icon" icon={Bell} />
            <div className="h-6 w-px bg-[#E5E0D8] mx-1"></div>
            <Button variant="outline" size="sm" className="hidden md:flex">Sign In</Button>
            <Button variant="ghost" size="icon" icon={Menu} className="md:hidden" />
        </div>
    </nav>
);

const DataTable = () => {
    const data = [
        { id: '#SK-8292', name: 'Winter Landscape', artist: 'H. Sojima', date: 'Dec 12, 2024', status: 'Published', price: '$2,400' },
        { id: '#SK-8293', name: 'Mountain Tram', artist: 'Unknown', date: 'Dec 11, 2024', status: 'Draft', price: '$1,850' },
        { id: '#SK-8294', name: 'Old Pagoda', artist: 'K. Ito', date: 'Dec 10, 2024', status: 'Review', price: '$3,200' },
        { id: '#SK-8295', name: 'River Crossing', artist: 'M. Tanaka', date: 'Dec 09, 2024', status: 'Published', price: '$1,200' },
    ];

    return (
        <div className="w-full border border-[#E5E0D8] rounded-sm overflow-hidden bg-white">
            <table className="w-full text-sm text-left">
                <thead className="bg-[#F0EFEB] text-[#2C2C2C] font-serif border-b border-[#E5E0D8]">
                    <tr>
                        <th className="px-6 py-3 font-semibold">Reference</th>
                        <th className="px-6 py-3 font-semibold">Artwork</th>
                        <th className="px-6 py-3 font-semibold hidden md:table-cell">Artist</th>
                        <th className="px-6 py-3 font-semibold hidden sm:table-cell">Date</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                        <th className="px-6 py-3 font-semibold text-right">Price</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0D8]">
                    {data.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-[#FAFAFA] transition-colors">
                            <td className="px-6 py-4 font-mono text-xs text-[#666666]">{item.id}</td>
                            <td className="px-6 py-4 font-medium text-[#2C2C2C]">{item.name}</td>
                            <td className="px-6 py-4 text-[#666666] hidden md:table-cell">{item.artist}</td>
                            <td className="px-6 py-4 text-[#666666] hidden sm:table-cell">{item.date}</td>
                            <td className="px-6 py-4">
                                <Badge variant={item.status === 'Published' ? 'success' : item.status === 'Review' ? 'warning' : 'neutral'}>
                                    {item.status}
                                </Badge>
                            </td>
                            <td className="px-6 py-4 text-right font-medium">{item.price}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// --- MAIN APP (Kitchen Sink / Documentation) ---

const App = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('foundations');
    const [toggleState, setToggleState] = useState(false);

    return (
        <div className="min-h-screen bg-[#F9F7F1] text-[#2C2C2C] font-sans selection:bg-[#2C2C2C] selection:text-white pb-20">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 md:px-8 py-12 space-y-16">

                {/* Header Section */}
                <section className="space-y-4 max-w-3xl">
                    <Badge variant="outline" className="mb-2">Design System v1.0</Badge>
                    <h1 className="text-5xl md:text-6xl font-serif font-bold text-[#2C2C2C] tracking-tight">
                        Ink & Paper
                    </h1>
                    <p className="text-xl text-[#666666] leading-relaxed max-w-2xl border-l-2 border-[#2C2C2C] pl-6 italic">
                        "A digital translation of the sketch aesthetic—focusing on texture, monochromatic balance, and structural elegance."
                    </p>
                </section>

                <hr className="border-[#E5E0D8]" />

                {/* 1. Foundations */}
                <section className="space-y-8">
                    <h2 className="text-2xl font-serif font-bold flex items-center gap-3">
                        <span className="w-6 h-6 bg-[#2C2C2C] text-white rounded-full text-xs flex items-center justify-center">1</span>
                        Foundations
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Colors */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[#999]">Color Palette</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <div className="h-16 w-full rounded-sm bg-[#2C2C2C] shadow-sm"></div>
                                    <div className="text-xs font-mono">
                                        <div className="font-bold">Ink Black</div>
                                        <div className="opacity-60">#2C2C2C</div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-16 w-full rounded-sm bg-[#666666] shadow-sm"></div>
                                    <div className="text-xs font-mono">
                                        <div className="font-bold">Pencil</div>
                                        <div className="opacity-60">#666666</div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-16 w-full rounded-sm bg-[#F9F7F1] border border-[#E5E0D8] shadow-sm"></div>
                                    <div className="text-xs font-mono">
                                        <div className="font-bold">Paper</div>
                                        <div className="opacity-60">#F9F7F1</div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-16 w-full rounded-sm bg-rose-50 border border-rose-200 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-4 h-4 bg-rose-700"></div>
                                    </div>
                                    <div className="text-xs font-mono">
                                        <div className="font-bold">Semantic</div>
                                        <div className="opacity-60">Error/Alert</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Typography */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[#999]">Typography</h3>
                            <div className="space-y-4 p-6 bg-white border border-[#E5E0D8] rounded-sm">
                                <h1 className="text-4xl font-serif font-bold">Heading 1 - The quick brown fox</h1>
                                <h2 className="text-3xl font-serif font-bold">Heading 2 - The quick brown fox</h2>
                                <h3 className="text-2xl font-serif font-bold">Heading 3 - The quick brown fox</h3>
                                <p className="text-base text-[#444] leading-relaxed">
                                    <span className="font-bold text-[#2C2C2C]">Body Text:</span> The quick brown fox jumps over the lazy dog.
                                    Design is intelligence made visible. This typeface is optimized for legibility on textured backgrounds.
                                </p>
                                <p className="text-xs font-mono text-[#666666] bg-[#F0EFEB] p-2 inline-block rounded-sm">
                                    Caption / Mono: 12px System Font
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. Atoms */}
                <section className="space-y-8">
                    <h2 className="text-2xl font-serif font-bold flex items-center gap-3">
                        <span className="w-6 h-6 bg-[#2C2C2C] text-white rounded-full text-xs flex items-center justify-center">2</span>
                        Atoms
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Buttons */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[#999]">Buttons</h3>
                            <div className="flex flex-wrap gap-3">
                                <Button>Primary</Button>
                                <Button variant="secondary">Secondary</Button>
                                <Button variant="outline">Outline</Button>
                                <Button variant="ghost">Ghost</Button>
                                <Button variant="icon" icon={User} aria-label="User Profile" />
                                <Button disabled>Disabled</Button>
                                <Button isLoading variant="outline">Loading</Button>
                            </div>
                        </div>

                        {/* Inputs */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[#999]">Inputs</h3>
                            <div className="space-y-3 max-w-sm">
                                <Input label="Email Address" placeholder="name@studio.com" icon={User} />
                                <Input label="Search" placeholder="Search archive..." icon={Search} />
                                <Input type="password" label="Password" placeholder="••••••••" />
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[#999]">Controls & Feedback</h3>
                            <div className="space-y-4 p-4 bg-white border border-[#E5E0D8] rounded-sm">
                                <div className="flex gap-4">
                                    <Checkbox label="Remember me" checked={true} onChange={() => { }} />
                                    <Checkbox label="Subscribe" checked={false} onChange={() => { }} />
                                </div>
                                <div className="flex gap-4">
                                    <Toggle label="Dark Mode" checked={toggleState} onChange={() => setToggleState(!toggleState)} />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-mono text-[#666666]">
                                        <span>Loading Assets</span>
                                        <span>75%</span>
                                    </div>
                                    <ProgressBar value={75} />
                                </div>
                                <div className="flex gap-2">
                                    <Badge>Draft</Badge>
                                    <Badge variant="success">Published</Badge>
                                    <Badge variant="error">Deleted</Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. Molecules */}
                <section className="space-y-8">
                    <h2 className="text-2xl font-serif font-bold flex items-center gap-3">
                        <span className="w-6 h-6 bg-[#2C2C2C] text-white rounded-full text-xs flex items-center justify-center">3</span>
                        Molecules
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <Card
                            title="The Silent Tram"
                            description="An observational sketch of the morning commute through the misty mountains. Charcoal on vellum, 2024."
                            image="https://images.unsplash.com/photo-1549488497-628be93d843b?q=80&w=2670&auto=format&fit=crop"
                            footer={
                                <>
                                    <span className="text-xs font-bold font-mono text-[#666666]">ART-001</span>
                                    <Button size="sm" variant="outline">View Details</Button>
                                </>
                            }
                        />

                        <div className="space-y-4">
                            <Alert type="info" title="System Update" message="The archive will be undergoing maintenance tonight at 02:00 AM." />
                            <Alert type="warning" title="Storage Limit" message="You have used 80% of your available sketch storage." />
                            <Alert type="error" title="Connection Lost" message="Unable to sync changes to the cloud." onClose={() => { }} />
                        </div>

                        <div className="flex items-center justify-center bg-[#E5E0D8] rounded-sm border border-dashed border-[#999] p-8">
                            <Button onClick={() => setIsModalOpen(true)} size="lg">Open Modal Demo</Button>
                        </div>
                    </div>
                </section>

                {/* 4. Organisms */}
                <section className="space-y-8">
                    <h2 className="text-2xl font-serif font-bold flex items-center gap-3">
                        <span className="w-6 h-6 bg-[#2C2C2C] text-white rounded-full text-xs flex items-center justify-center">4</span>
                        Organisms
                    </h2>

                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-[#999]">Data Table</h3>
                        <DataTable />
                    </div>
                </section>

            </main>

            {/* Modal Instance */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Confirm Action"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={() => setIsModalOpen(false)}>Confirm</Button>
                    </>
                }
            >
                <p>Are you sure you want to archive this collection? This action cannot be easily undone and will remove the collection from public view.</p>
            </Modal>

            {/* Footer */}
            <footer className="bg-[#2C2C2C] text-[#F9F7F1] py-12 px-8 text-center">
                <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
                    <div className="w-10 h-10 bg-[#F9F7F1] text-[#2C2C2C] flex items-center justify-center rounded-sm font-serif font-bold text-2xl">
                        S.
                    </div>
                    <p className="opacity-60 text-sm max-w-md">
                        The Ink & Paper design system is an exploration of organic textures in a digital space.
                        Built with React & Tailwind.
                    </p>
                    <div className="flex gap-6 text-sm font-mono opacity-40">
                        <span>© 2024 Studio Ink</span>
                        <span>Privacy</span>
                        <span>Terms</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default App;