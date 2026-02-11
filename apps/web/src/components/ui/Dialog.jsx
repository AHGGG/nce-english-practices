import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

export const Dialog = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "max-w-md",
}) => {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Prevent scrolling and manage focus
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      document.body.style.overflow = "hidden";

      // Focus trap
      const focusableElements = dialogRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      if (focusableElements && focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    } else {
      document.body.style.overflow = "unset";
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Close on escape key and handle Tab for focus trap
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      }

      if (e.key === "Tab") {
        const focusableElements = dialogRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );

        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog Content - Glassmorphism */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={`
                    relative w-full ${maxWidth}
                    bg-glass-bg backdrop-blur-xl border border-glass-border rounded-2xl
                    shadow-2xl shadow-black/50
                    flex flex-col max-h-[90vh]
                    opacity-100 scale-100 animate-in fade-in zoom-in-95 duration-200
                `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-glass-border">
          <h2
            id="dialog-title"
            className="text-xl font-semibold text-text-primary tracking-tight"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-white/5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="text-text-secondary leading-relaxed">{children}</div>
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-5 border-t border-glass-border flex justify-end gap-3 bg-white/[0.02] rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export const DialogButton = ({
  children,
  onClick,
  variant = "primary",
  disabled = false,
}) => {
  const variants = {
    primary: "bg-accent-primary text-black hover:bg-accent-primary/90",
    danger:
      "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20",
    secondary:
      "bg-white/5 text-text-primary hover:bg-white/10 border border-white/10",
    ghost:
      "bg-transparent text-text-muted hover:text-text-primary hover:bg-white/5",
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
