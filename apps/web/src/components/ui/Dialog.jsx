import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export const Dialog = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    maxWidth = "max-w-md"
}) => {
    // Prevent scrolling when dialog is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
        }

        return () => {
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Dialog Content */}
            <div
                role="dialog"
                aria-modal="true"
                className={`
                    relative w-full ${maxWidth}
                    bg-bg-elevated border border-border rounded-xl 
                    shadow-2xl shadow-black/50
                    flex flex-col max-h-[90vh]
                    opacity-100 scale-100 animate-in fade-in zoom-in-95 duration-200
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-bold font-serif text-text-primary">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-text-muted hover:text-text-primary hover:bg-white/5 rounded-lg transition-colors"
                        aria-label="Close dialog"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    <div className="text-text-muted leading-relaxed">
                        {children}
                    </div>
                </div>

                {/* Footer */}
                {footer && (
                    <div className="p-4 border-t border-border flex justify-end gap-3 bg-bg-surface/50 rounded-b-xl">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export const DialogButton = ({
    children,
    onClick,
    variant = "primary",
    disabled = false
}) => {
    const variants = {
        primary: "bg-accent-primary text-black hover:bg-accent-primary/90",
        danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20",
        secondary: "bg-white/5 text-text-primary hover:bg-white/10 border border-white/10",
        ghost: "bg-transparent text-text-muted hover:text-text-primary hover:bg-white/5"
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                ${variants[variant]}
            `}
        >
            {children}
        </button>
    );
};
