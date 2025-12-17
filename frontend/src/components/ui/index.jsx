import React from 'react';
import { Loader2 } from 'lucide-react';
export { ToastProvider, useToast } from './Toast';

export const Button = ({
    children,
    variant = "primary",
    size = "md",
    fullWidth,
    isLoading,
    icon: Icon,
    className = "",
    ...props
}) => {
    const base = "inline-flex items-center justify-center gap-2 font-mono font-bold uppercase tracking-wider transition-all duration-200 active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-ink text-black border border-ink hover:bg-white hover:text-black hover:shadow-hard shadow-none",
        secondary: "bg-transparent text-neon-pink border border-neon-pink hover:bg-neon-pink hover:text-black hover:shadow-neon-pink",
        outline: "bg-transparent text-ink-muted border border-ink-faint hover:border-ink hover:text-ink",
        ghost: "bg-transparent text-ink-muted hover:text-ink hover:bg-ink-faint/10",
        danger: "bg-transparent text-red-500 border border-red-500 hover:bg-red-500 hover:text-black",
        text: "bg-transparent text-neon-green hover:text-white px-0 border-none"
    };

    const sizes = {
        sm: "text-xs px-3 py-1.5",
        md: "text-sm px-6 py-2.5",
        lg: "text-base px-8 py-3",
        icon: "p-2 aspect-square"
    };

    const sizeClass = variant === 'text' ? '' : sizes[size];

    return (
        <button
            className={`${base} ${variants[variant]} ${sizeClass} ${fullWidth ? 'w-full' : ''} ${className}`}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {!isLoading && Icon && <Icon className="w-4 h-4" />}
            {children}
        </button>
    );
};

export const Input = ({ icon: Icon, error, className = "", ...props }) => (
    <div className={`relative group flex-grow ${className}`}>
        {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon className="w-4 h-4 text-ink-faint group-focus-within:text-neon-green transition-colors" />
            </div>
        )}
        <input
            type="text"
            className={`w-full bg-bg-elevated border border-ink-faint text-ink px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green transition-all placeholder:text-ink-muted/50 ${Icon ? 'pl-9' : ''} ${error ? 'border-neon-pink focus:border-neon-pink focus:ring-neon-pink' : ''}`}
            {...props}
        />
        {error && <span className="absolute -bottom-5 left-0 text-[10px] text-neon-pink font-mono">{error}</span>}
    </div>
);

export const Card = ({ children, title, subtitle, variant = "default", className = "", actions }) => {
    const variants = {
        default: "bg-bg-paper border border-ink-faint hover:border-ink-muted",
        elevated: "bg-bg-elevated border border-ink-faint shadow-hard",
        outline: "bg-transparent border border-ink-faint border-dashed",
        highlight: "bg-bg-paper border border-neon-green/50 hover:border-neon-green hover:shadow-neon-green"
    };

    return (
        <div className={`p-6 transition-all duration-300 ${variants[variant]} ${className}`}>
            {(title || subtitle) && (
                <div className="mb-4">
                    {title && <h3 className="text-xl font-serif font-bold text-ink mb-1">{title}</h3>}
                    {subtitle && <p className="text-sm text-ink-muted font-mono">{subtitle}</p>}
                </div>
            )}
            <div className="text-ink-muted leading-relaxed">
                {children}
            </div>
            {actions && (
                <div className="mt-6 pt-4 border-t border-ink-faint flex gap-3">
                    {actions}
                </div>
            )}
        </div>
    );
};

export const Tag = ({ children, variant = "solid", color = "green", className = "" }) => {
    const colors = {
        green: "bg-neon-green text-black border-neon-green",
        pink: "bg-neon-pink text-black border-neon-pink",
        cyan: "bg-neon-cyan text-black border-neon-cyan",
        amber: "bg-neon-amber text-black border-neon-amber",
        gray: "bg-ink-muted text-black border-ink-muted"
    };

    const outlines = {
        green: "text-neon-green border-neon-green",
        pink: "text-neon-pink border-neon-pink",
        cyan: "text-neon-cyan border-neon-cyan",
        amber: "text-neon-amber border-neon-amber",
        gray: "text-ink-muted border-ink-muted"
    };

    const base = "inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider font-mono border";
    const style = variant === 'outline' ? `bg-transparent ${outlines[color]}` : `${colors[color]}`;

    return (
        <span className={`${base} ${style} ${className}`}>
            {children}
        </span>
    );
};

export const Select = ({ label, options = [], className = "", error, ...props }) => (
    <div className={`flex flex-col gap-1.5 ${className}`}>
        {label && <label className="text-xs font-mono text-ink-muted uppercase">{label}</label>}
        <div className="relative">
            <select
                className={`w-full bg-bg-elevated border border-ink-faint text-ink px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green transition-all appearance-none cursor-pointer ${error ? 'border-neon-pink focus:border-neon-pink focus:ring-neon-pink' : ''}`}
                {...props}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-ink-muted">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
                </svg>
            </div>
        </div>
        {error && <span className="text-[10px] text-neon-pink font-mono">{error}</span>}
    </div>
);
