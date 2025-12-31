import React, { useEffect, memo } from 'react';
import { X } from 'lucide-react';

/**
 * Lightbox Component - Full-screen image viewer
 */
const Lightbox = memo(function Lightbox({ src, alt, caption, onClose }) {
    // Close on ESC key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
            onClick={onClose}
        >
            {/* Close button */}
            <button
                className="absolute top-4 right-4 p-3 text-white/70 hover:text-white border border-white/20 hover:border-white/50 transition-colors"
                onClick={onClose}
            >
                <X className="w-6 h-6" />
            </button>

            {/* Image container */}
            <div
                className="max-w-[90vw] max-h-[90vh] flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={src}
                    alt={alt || ''}
                    className="max-w-full max-h-[80vh] object-contain border border-[#333]"
                />
                {caption && (
                    <p className="mt-4 text-center text-[#888] font-mono text-sm max-w-xl">
                        {caption}
                    </p>
                )}
            </div>

            {/* Hint */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[#666] text-xs font-mono">
                Press ESC or click outside to close
            </div>
        </div>
    );
});

export default Lightbox;
