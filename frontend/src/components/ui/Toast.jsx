import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

const ToastContext = React.createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = (message, type = 'info', duration = 3000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, duration }]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div
                className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
                role="region"
                aria-label="Notifications"
            >
                {toasts.map(toast => (
                    <ToastItem key={toast.id} {...toast} onDismiss={() => removeToast(toast.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = React.useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};

const ToastItem = ({ message, type, duration, onDismiss }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Animate in
        requestAnimationFrame(() => setIsVisible(true));

        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onDismiss, 300); // Wait for exit animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onDismiss]);

    const variants = {
        success: {
            bg: 'bg-black',
            border: 'border-neon-green',
            text: 'text-neon-green',
            icon: CheckCircle
        },
        error: {
            bg: 'bg-black',
            border: 'border-neon-pink',
            text: 'text-neon-pink',
            icon: X
        },
        warning: {
            bg: 'bg-black',
            border: 'border-neon-amber',
            text: 'text-neon-amber',
            icon: AlertTriangle
        },
        info: {
            bg: 'bg-black',
            border: 'border-neon-cyan',
            text: 'text-neon-cyan',
            icon: Info
        }
    };

    const style = variants[type] || variants.info;
    const Icon = style.icon;

    return (
        <div
            role={type === 'error' ? 'alert' : 'status'}
            className={`
                pointer-events-auto 
                flex items-start gap-3 p-4 
                min-w-[300px] max-w-sm
                border ${style.border} ${style.bg} 
                shadow-hard
                transition-all duration-300 ease-out
                ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
            `}
        >
            <Icon className={`w-5 h-5 flex-none ${style.text}`} aria-hidden="true" />
            <div className={`flex-1 font-mono text-sm leading-relaxed text-ink`}>
                {message}
            </div>
            <button
                onClick={() => setIsVisible(false)}
                className="text-ink-muted hover:text-ink transition-colors"
                aria-label="Dismiss notification"
            >
                <X size={14} />
            </button>
        </div>
    );
};
