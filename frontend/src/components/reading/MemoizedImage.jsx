import React, { useState, useRef, useEffect, memo } from 'react';
import { Loader2, ZoomIn } from 'lucide-react';

/**
 * Memoized Image Component - Lazy loading with click-to-zoom
 */
const MemoizedImage = memo(function MemoizedImage({ src, alt, caption, onImageClick }) {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const imgRef = useRef(null);

    // Lazy loading with Intersection Observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && imgRef.current) {
                    imgRef.current.src = src;
                    observer.disconnect();
                }
            },
            { rootMargin: '200px' }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, [src]);

    if (error) return null;

    return (
        <figure className="my-8 group">
            <div
                className="relative bg-bg-elevated border border-border overflow-hidden cursor-pointer
                           hover:border-accent-primary transition-colors"
                onClick={() => onImageClick(src, alt, caption)}
            >
                {!loaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-bg-surface">
                        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
                    </div>
                )}
                <img
                    ref={imgRef}
                    alt={alt || ''}
                    className={`w-full h-auto transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setLoaded(true)}
                    onError={() => setError(true)}
                />
                {/* Zoom icon overlay */}
                <div className="absolute bottom-2 right-2 p-2 bg-bg-base/50 text-accent-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-4 h-4" />
                </div>
            </div>
            {caption && (
                <figcaption className="mt-2 text-sm text-text-secondary font-mono italic px-2">
                    {caption}
                </figcaption>
            )}
        </figure>
    );
});

export default MemoizedImage;
