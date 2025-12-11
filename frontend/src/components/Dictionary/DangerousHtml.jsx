import React, { useRef, useEffect } from 'react';

const DangerousHtml = ({ html, className, ...props }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current || !html) return;

        // 1. Set the HTML content
        containerRef.current.innerHTML = html;

        // 2. Find all script tags in the injected content
        const scripts = containerRef.current.getElementsByTagName('script');

        // 3. Create copies of the scripts to execute them
        // We need to convert the HTMLCollection to an array to avoid live update issues
        const scriptsArray = Array.from(scripts);

        scriptsArray.forEach(oldScript => {
            const newScript = document.createElement('script');

            // Copy attributes
            Array.from(oldScript.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });

            // Copy content
            newScript.appendChild(document.createTextNode(oldScript.innerHTML));

            // Replace the old script with the new one to trigger execution
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });

    }, [html]);

    return (
        <div
            ref={containerRef}
            className={className}
            {...props}
        />
    );
};

export default DangerousHtml;
