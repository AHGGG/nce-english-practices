import React, { useState } from 'react';
import { ArrowRight, Star, Search, MapPin, Heart } from 'lucide-react';

/**
 * 🎨 Nomadic Tribe UI Design System (游牧部落风格设计系统)
 * ===========================================================================
 * * 1. 核心视觉风格 (Core Visual Identity):
 * - 风格流派: 结合 Ligne Claire (清线派) 与 Art Nouveau (新艺术运动)。
 * - 关键特征: 
 * (1) 描边 (Ink Outlines): 所有容器和按钮均有 2px 的深色描边 (#2C3E50)，模拟漫画手绘感。
 * (2) 硬阴影 (Hard Shadows): 不使用高斯模糊阴影，而是使用实色位移阴影，营造“剪纸”或“贴纸”的层级感。
 * (3) 纸质纹理 (Texture): 全局叠加 SVG 噪点层，避免纯色色块过于数字化，增加复古印刷品的质感。
 * (4) 装饰性角落 (Ornate Corners): 避免简单的圆角矩形，使用 SVG 切角或圆形装饰来打破几何的单调。
 * * 2. 调色板 (Color Palette):
 * - Canvas (画布背景): #F5F2EA (米色/羊皮纸，营造温润感)
 * - Ink (墨水/线条):   #2C3E50 (深岩石灰，替代纯黑，更柔和)
 * - Primary (暮光粉):  #ECA9A9 (用于主按钮、强调点，温暖且复古)
 * - Secondary (水晶蓝):#A3BFD9 (用于次要信息、背景装饰)
 * - Accent (森林绿):   #8FA39D (用于标签、自然元素)
 * * 3. 排版 (Typography):
 * - 标题: 极粗无衬线体 (ExtraBold/Black)，通常大写，带字间距 (Tracking-wider)。
 * - 正文: 清晰的无衬线体，阅读性强。
 * * 4. 交互逻辑 (Interaction):
 * - 物理反馈: 悬停 (Hover) 时元素上浮 + 阴影拉长；点击 (Active) 时元素下沉 + 阴影消失。
 * * ===========================================================================
 */

/**
 * --- DESIGN TOKENS ---
 * 核心颜色和样式变量
 */
const COLORS = {
    bg: '#F5F2EA',      // 米色背景
    ink: '#2C3E50',     // 深岩石灰（描边/文字）
    primary: '#ECA9A9', // 暮光粉
    secondary: '#A3BFD9', // 水晶蓝
    accent: '#8FA39D',  // 森林绿
    white: '#FFFFFF',
};

const BORDER_STYLE = "border-2 border-slate-800";
const SHADOW_STYLE = "shadow-[4px_4px_0px_0px_rgba(44,62,80,1)]";
const HOVER_TRANSITION = "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(44,62,80,1)] active:translate-y-0 active:shadow-none";

/**
 * --- ATOMIC COMPONENTS ---
 * 原子组件库
 */

// 1. 基础容器 (带噪点背景)
const NomadicContainer = ({ children, className = "" }) => (
    <div className={`min-h-screen w-full bg-[#F5F2EA] text-slate-800 font-sans selection:bg-[#ECA9A9] selection:text-slate-800 ${className}`}>
        <div
            className="pointer-events-none fixed inset-0 z-50 opacity-[0.06]"
            style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
        />
        <div className="relative z-10 p-8 md:p-12">
            {children}
        </div>
    </div>
);

// 2. 标题组件
const NomadicHeading = ({ children, size = "large", className = "" }) => {
    const sizeClasses = {
        large: "text-4xl md:text-6xl",
        medium: "text-2xl md:text-3xl",
        small: "text-xl",
    };

    return (
        <h2 className={`font-black uppercase tracking-wider relative inline-block ${sizeClasses[size]} ${className} text-[#2C3E50]`}>
            <span className="relative z-10" style={{ textShadow: size === 'large' ? '3px 3px 0px #A3BFD9' : 'none' }}>
                {children}
            </span>
            {size === 'large' && (
                <div className="absolute top-1 left-1 w-full h-full border border-slate-800 -z-10 translate-x-1 translate-y-1 opacity-50"></div>
            )}
        </h2>
    );
};

// 3. 按钮组件 (支持 Primary 和 Secondary 变体)
const NomadicButton = ({ children, variant = "primary", icon: Icon, className = "", ...props }) => {
    const baseStyle = `relative px-6 py-3 font-bold border-2 border-slate-800 rounded-lg flex items-center gap-2 ${HOVER_TRANSITION}`;

    const variants = {
        primary: `bg-[#ECA9A9] text-slate-800 ${SHADOW_STYLE}`,
        secondary: `bg-[#A3BFD9] text-slate-800 ${SHADOW_STYLE}`,
        outline: `bg-transparent text-slate-800 hover:bg-slate-800 hover:text-[#F5F2EA]`,
        ghost: `border-transparent hover:bg-slate-800/5`,
    };

    return (
        <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
            {children}
            {Icon && <Icon size={18} strokeWidth={3} />}
        </button>
    );
};

// 4. 卡片组件 (带有装饰角)
const NomadicCard = ({ title, children, className = "" }) => (
    <div className={`relative bg-white border-2 border-slate-800 p-6 rounded-tr-3xl ${SHADOW_STYLE} ${className}`}>
        {/* Decorative Corner SVG */}
        <div className="absolute -top-[2px] -left-[2px] w-8 h-8 pointer-events-none">
            <svg viewBox="0 0 40 40" className="w-full h-full text-slate-800">
                <path d="M0 40 V10 A10 10 0 0 1 10 0 H40" fill="none" stroke="currentColor" strokeWidth="4" />
                <circle cx="12" cy="12" r="5" fill="#ECA9A9" stroke="currentColor" strokeWidth="2" />
            </svg>
        </div>

        {title && (
            <div className="mb-4 pl-6 border-b-2 border-slate-800/20 pb-2">
                <h3 className="font-bold text-lg uppercase tracking-wide">{title}</h3>
            </div>
        )}
        <div className="relative z-10">{children}</div>
    </div>
);

// 5. 输入框组件
const NomadicInput = ({ label, placeholder, icon: Icon }) => (
    <div className="flex flex-col gap-2 w-full">
        {label && <label className="font-bold text-sm uppercase tracking-wide ml-1">{label}</label>}
        <div className="relative group">
            <div className={`absolute inset-0 bg-[#A3BFD9] rounded-lg translate-x-1 translate-y-1 border-2 border-slate-800 -z-10 group-focus-within:translate-x-2 group-focus-within:translate-y-2 transition-transform`}></div>
            <div className="relative flex items-center bg-white border-2 border-slate-800 rounded-lg overflow-hidden">
                {Icon && (
                    <div className="pl-3 text-slate-500">
                        <Icon size={18} />
                    </div>
                )}
                <input
                    type="text"
                    placeholder={placeholder}
                    className="w-full px-4 py-3 bg-transparent outline-none font-medium placeholder:text-slate-400"
                />
            </div>
        </div>
    </div>
);

// 6. 标签/徽章组件
const NomadicBadge = ({ children, color = "accent" }) => {
    const bgColors = {
        accent: "bg-[#8FA39D]",
        primary: "bg-[#ECA9A9]",
        secondary: "bg-[#A3BFD9]",
    };

    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full border-2 border-slate-800 text-xs font-bold uppercase tracking-wider ${bgColors[color]} shadow-[2px_2px_0px_0px_rgba(44,62,80,1)]`}>
            {children}
        </span>
    );
};

// 7. 分割线
const DecoDivider = () => (
    <div className="flex items-center gap-4 my-8 opacity-60 w-full">
        <div className="h-0.5 bg-slate-800 flex-1"></div>
        <div className="w-3 h-3 border-2 border-slate-800 rounded-full bg-[#F5F2EA]"></div>
        <div className="h-0.5 bg-slate-800 flex-1"></div>
    </div>
);


/**
 * --- SHOWCASE APP ---
 * 展示如何使用这些组件
 */
const NomadicStyleGuide = () => {
    return (
        <NomadicContainer>
            <header className="mb-16 text-center">
                <NomadicHeading>Nomadic UI Kit</NomadicHeading>
                <p className="mt-4 text-slate-600 font-medium max-w-xl mx-auto">
                    原子组件展示页。这套 UI 拆解自复古未来主义插画风格，强调描边、硬阴影与低饱和度色彩。
                </p>
            </header>

            {/* Grid Layout for Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">

                {/* Section 1: Buttons */}
                <section>
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-4 h-4 bg-[#ECA9A9] border-2 border-slate-800 rounded-full"></div>
                        <h3 className="font-bold text-xl uppercase">Buttons & Interactions</h3>
                    </div>

                    <div className="bg-white/50 p-8 rounded-xl border-2 border-slate-800 border-dashed flex flex-wrap gap-6 items-start">
                        <NomadicButton variant="primary" icon={ArrowRight}>Start Journey</NomadicButton>
                        <NomadicButton variant="secondary" icon={MapPin}>Explore Map</NomadicButton>
                        <NomadicButton variant="outline">View Gallery</NomadicButton>
                        <NomadicButton variant="primary" className="rounded-full w-12 h-12 p-0 justify-center">
                            <Star size={20} fill="currentColor" />
                        </NomadicButton>
                    </div>
                </section>

                {/* Section 2: Typography & Badges */}
                <section>
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-4 h-4 bg-[#A3BFD9] border-2 border-slate-800 rounded-full"></div>
                        <h3 className="font-bold text-xl uppercase">Typography & Tags</h3>
                    </div>

                    <div className="bg-white/50 p-8 rounded-xl border-2 border-slate-800 border-dashed space-y-6">
                        <NomadicHeading size="medium">The Crystal Desert</NomadicHeading>
                        <p className="text-slate-700 leading-relaxed font-medium">
                            Explore the ancient ruins and discover the secrets hidden beneath the sands.
                            Our journey begins at the break of dawn.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <NomadicBadge color="primary">New Arrival</NomadicBadge>
                            <NomadicBadge color="secondary">Rare Item</NomadicBadge>
                            <NomadicBadge color="accent">In Stock</NomadicBadge>
                        </div>
                    </div>
                </section>

                {/* Section 3: Forms */}
                <section>
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-4 h-4 bg-[#8FA39D] border-2 border-slate-800 rounded-full"></div>
                        <h3 className="font-bold text-xl uppercase">Input Fields</h3>
                    </div>

                    <div className="space-y-6 max-w-md">
                        <NomadicInput label="Traveler Name" placeholder="Enter your name..." />
                        <NomadicInput label="Search Destination" placeholder="Where to go?" icon={Search} />
                    </div>
                </section>

                {/* Section 4: Cards */}
                <section>
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-4 h-4 bg-white border-2 border-slate-800 rounded-full"></div>
                        <h3 className="font-bold text-xl uppercase">Card Containers</h3>
                    </div>

                    <NomadicCard title="Mission Log" className="w-full">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-16 h-16 bg-[#BCCCD6] border-2 border-slate-800 rounded-lg shrink-0"></div>
                            <div>
                                <h4 className="font-bold text-slate-800">Artifact #042</h4>
                                <p className="text-sm text-slate-600 mt-1">Found near the northern ridges. Shows signs of crystallization.</p>
                            </div>
                        </div>
                        <div className="flex justify-end mt-4">
                            <button className="text-sm font-bold underline underline-offset-4 hover:text-[#ECA9A9] transition-colors">Read Details</button>
                        </div>
                    </NomadicCard>
                </section>

            </div>

            <DecoDivider />

            {/* Full Width Example Section */}
            <section className="max-w-4xl mx-auto text-center mt-12">
                <NomadicCard className="bg-[#E8D5D5]/30">
                    <NomadicHeading size="medium" className="mb-4">Ready to Join?</NomadicHeading>
                    <p className="mb-8 max-w-lg mx-auto">
                        Create your account now and start collecting digital artifacts in the nomadic verse.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <NomadicInput placeholder="Email Address" />
                        <NomadicButton variant="primary">Sign Up</NomadicButton>
                    </div>
                </NomadicCard>
            </section>

        </NomadicContainer>
    );
};

export default NomadicStyleGuide;