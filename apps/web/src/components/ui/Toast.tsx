/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { X, CheckCircle, AlertTriangle, Info } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastData {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType, duration?: number) => void;
}

interface ToastProviderProps {
  children: ReactNode;
}

interface ToastItemProps extends ToastData {
  onDismiss: () => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = (
    message: string,
    type: ToastType = "info",
    duration = 3000,
  ) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            {...toast}
            onDismiss={() => removeToast(toast.id)}
          />
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

const ToastItem = ({ message, type, duration, onDismiss }: ToastItemProps) => {
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
      bg: "bg-bg-elevated",
      border: "border-accent-primary",
      text: "text-accent-primary",
      icon: CheckCircle,
    },
    error: {
      bg: "bg-bg-elevated",
      border: "border-accent-danger",
      text: "text-accent-danger",
      icon: X,
    },
    warning: {
      bg: "bg-bg-elevated",
      border: "border-accent-warning",
      text: "text-accent-warning",
      icon: AlertTriangle,
    },
    info: {
      bg: "bg-bg-elevated",
      border: "border-accent-info",
      text: "text-accent-info",
      icon: Info,
    },
  };

  const style = variants[type] || variants.info;
  const Icon = style.icon;
  const role = type === "error" || type === "warning" ? "alert" : "status";

  return (
    <div
      role={role}
      className={`
                pointer-events-auto 
                flex items-start gap-3 p-4 
                min-w-[300px] max-w-sm
                border ${style.border} ${style.bg} 
                shadow-hard
                transition-all duration-300 ease-out
                ${isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
            `}
    >
      <Icon className={`w-5 h-5 flex-none ${style.text}`} aria-hidden="true" />
      <div
        className={`flex-1 font-mono text-sm leading-relaxed text-text-primary`}
      >
        {message}
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="text-text-muted hover:text-text-primary transition-colors"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
};
