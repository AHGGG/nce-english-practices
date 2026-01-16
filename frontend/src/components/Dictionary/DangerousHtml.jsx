import React, { useRef, useEffect, useState } from 'react';

const DangerousHtml = ({ html, className, ...props }) => {
    const iframeRef = useRef(null);
    const [height, setHeight] = useState(100);

    useEffect(() => {
        const handleMessage = (event) => {
            // Security: We don't check origin because srcDoc origin is "null" or unique.
            // But we can check if source matches our iframe
            if (iframeRef.current && event.source === iframeRef.current.contentWindow) {
                if (event.data && event.data.type === 'resize') {
                    const newHeight = event.data.height;
                    // Apply a safety max-limit logic or just set it
                    if (newHeight > 0) {
                        setHeight(newHeight);
                    }
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Construct the srcDoc with embedded resize reporter
    const srcDoc = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { margin: 0; padding: 0; overflow: hidden; }
            </style>
        </head>
        <body>
            <div id="content-wrapper">${html}</div>
            <script>
                (function() {
                    const wrapper = document.getElementById('content-wrapper');
                    let lastHeight = 0;
                    
                    function reportHeight() {
                        const height = wrapper.getBoundingClientRect().height;
                        if (Math.abs(height - lastHeight) > 2) { // 2px threshold
                            lastHeight = height;
                            // Add a small buffer (20px) to prevent scrollbars
                            window.parent.postMessage({ type: 'resize', height: Math.ceil(height + 20) }, '*');
                        }
                    }
                    
                    // Initial report
                    // Use a polling + observer strategy for robustness
                    
                    const resizeObserver = new ResizeObserver(() => {
                        window.requestAnimationFrame(reportHeight);
                    });
                     
                    resizeObserver.observe(wrapper);
                    resizeObserver.observe(document.body);
                    
                    // Also observe images loading
                    document.querySelectorAll('img').forEach(img => {
                        img.addEventListener('load', reportHeight);
                    });

                    // Force check after a moment (scripts execution)
                    setTimeout(reportHeight, 500);
                    setTimeout(reportHeight, 1500);
                })();
            </script>
        </body>
        </html>
    `;

    return (
        <iframe
            ref={iframeRef}
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-popups allow-forms"
            scrolling="no"
            className={`${className} w-full border-none block`}
            style={{
                height: `${height}px`,
                minHeight: '100px',
                transition: 'height 0.2s ease'
            }}
            title="Dictionary Content"
            {...props}
        />
    );
};

export default DangerousHtml;
