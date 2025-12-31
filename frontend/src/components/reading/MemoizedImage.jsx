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
                className="relative bg-[#111] border border-[#333] overflow-hidden cursor-pointer
                           hover:border-[#00FF94] transition-colors"
                onClick={() => onImageClick(src, alt, caption)}
            >
                {!loaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0A0A0A]">
                        <Loader2 className="w-6 h-6 animate-spin text-[#666]" />
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
                <div className="absolute bottom-2 right-2 p-2 bg-black/50 text-[#00FF94] opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-4 h-4" />
                </div>
            </div>
            {caption && (
                <figcaption className="mt-2 text-sm text-[#888] font-mono italic px-2">
                    {caption}
                </figcaption>
            )}
        </figure>
    );
});

export default MemoizedImage;
