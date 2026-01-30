/* eslint-disable react-refresh/only-export-components */
import React, { useId } from 'react';
import { Loader2 } from 'lucide-react';
export { ToastProvider, useToast } from './Toast';
export { Dialog, DialogButton } from './Dialog';

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
        primary: "bg-text-primary text-text-inverse border border-text-primary hover:bg-light-surface hover:text-text-inverse hover:shadow-hard shadow-none",
        secondary: "bg-transparent text-accent-danger border border-accent-danger hover:bg-accent-danger hover:text-text-inverse hover:shadow-accent-danger",
        outline: "bg-transparent text-text-muted border border-border hover:border-text-primary hover:text-text-primary",
        ghost: "bg-transparent text-text-muted hover:text-text-primary hover:bg-text-primary/10",
        danger: "bg-transparent text-accent-danger border border-accent-danger hover:bg-accent-danger hover:text-text-inverse",
        text: "bg-transparent text-accent-primary hover:text-text-inverse px-0 border-none"
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
            aria-busy={isLoading}
            {...props}
        >
            {isLoading && (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="sr-only">Loading...</span>
                </>
            )}
            {!isLoading && Icon && <Icon className="w-4 h-4" />}
            {children}
        </button>
    );
};

export const Input = ({ icon: Icon, error, className = "", ...props }) => {
    const errorId = useId();

    return (
        <div className={`relative group flex-grow ${className}`}>
            {Icon && (
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon className="w-4 h-4 text-border group-focus-within:text-accent-primary transition-colors" />
                </div>
            )}
            <input
                type="text"
                className={`w-full bg-bg-elevated border border-border text-text-primary px-4 py-3 text-sm font-mono rounded-xl focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all placeholder:text-text-muted/50 ${Icon ? 'pl-9' : ''} ${error ? 'border-accent-danger focus:border-accent-danger focus:ring-accent-danger' : ''}`}
                aria-invalid={!!error}
                aria-describedby={error ? errorId : undefined}
                {...props}
            />
            {error && <span id={errorId} role="alert" className="absolute -bottom-5 left-0 text-[10px] text-accent-danger font-mono">{error}</span>}
        </div>
    );
};

export const Card = ({ children, title, subtitle, variant = "default", className = "", actions }) => {
    const variants = {
        default: "bg-bg-surface border border-border hover:border-text-muted",
        elevated: "bg-bg-elevated border border-border shadow-hard",
        outline: "bg-transparent border border-border border-dashed",
        highlight: "bg-bg-surface border border-accent-primary/50 hover:border-accent-primary hover:shadow-accent-primary"
    };

    return (
        <div className={`p-6 transition-all duration-300 ${variants[variant]} ${className}`}>
            {(title || subtitle) && (
                <div className="mb-4">
                    {title && <h3 className="text-xl font-serif font-bold text-text-primary mb-1">{title}</h3>}
                    {subtitle && <p className="text-sm text-text-muted font-mono">{subtitle}</p>}
                </div>
            )}
            <div className="text-text-muted leading-relaxed">
                {children}
            </div>
            {actions && (
                <div className="mt-6 pt-4 border-t border-border flex gap-3">
                    {actions}
                </div>
            )}
        </div>
    );
};

export const Tag = ({ children, variant = "solid", color = "green", className = "" }) => {
    const colors = {
        green: "bg-accent-primary text-text-inverse border-accent-primary",
        pink: "bg-accent-danger text-text-inverse border-accent-danger",
        cyan: "bg-accent-info text-text-inverse border-accent-info",
        amber: "bg-accent-warning text-text-inverse border-accent-warning",
        gray: "bg-text-muted text-text-inverse border-text-muted"
    };

    const outlines = {
        green: "text-accent-primary border-accent-primary",
        pink: "text-accent-danger border-accent-danger",
        cyan: "text-accent-info border-accent-info",
        amber: "text-accent-warning border-accent-warning",
        gray: "text-text-muted border-text-muted"
    };

    const base = "inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider font-mono border";
    const style = variant === 'outline' ? `bg-transparent ${outlines[color]}` : `${colors[color]}`;

    return (
        <span className={`${base} ${style} ${className}`}>
            {children}
        </span>
    );
};

export const Select = ({ label, options = [], className = "", error, ...props }) => {
    const selectId = useId();
    const errorId = useId();
    const inputId = props.id || selectId;

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && <label htmlFor={inputId} className="text-xs font-mono text-text-muted uppercase">{label}</label>}
            <div className="relative">
                <select
                    id={inputId}
                    className={`w-full bg-bg-elevated border border-border text-text-primary px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all appearance-none cursor-pointer ${error ? 'border-accent-danger focus:border-accent-danger focus:ring-accent-danger' : ''}`}
                    aria-invalid={!!error}
                    aria-describedby={error ? errorId : undefined}
                    {...props}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-text-muted">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
                    </svg>
                </div>
            </div>
            {error && <span id={errorId} role="alert" className="text-[10px] text-accent-danger font-mono">{error}</span>}
        </div>
    );
};

export const Textarea = ({ label, className = "", inputClassName = "", error, ...props }) => {
    const textareaId = useId();
    const errorId = useId();
    const inputId = props.id || textareaId;

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && <label htmlFor={inputId} className="text-xs font-mono text-text-muted uppercase">{label}</label>}
            <textarea
                id={inputId}
                className={`w-full bg-bg-elevated border border-border text-text-primary px-4 py-3 text-sm font-mono focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all rounded-xl ${error ? 'border-accent-danger focus:border-accent-danger focus:ring-accent-danger' : ''} ${inputClassName}`}
                aria-invalid={!!error}
                aria-describedby={error ? errorId : undefined}
                {...props}
            />
            {error && <span id={errorId} role="alert" className="text-[10px] text-accent-danger font-mono">{error}</span>}
        </div>
    );
};
