import React, { useRef, useEffect, useState } from 'react';

const DangerousHtml = ({ html, className, ...props }) => {
    const containerRef = useRef(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        setIsReady(false);
        if (!containerRef.current || !html) return;

        // 1. Attach Shadow DOM (if not already attached)
        let shadow = containerRef.current.shadowRoot;
        if (!shadow) {
            shadow = containerRef.current.attachShadow({ mode: 'open' });
        }

        // 2. Set the HTML content into Shadow DOM
        shadow.innerHTML = html;

        // 3. Script Execution Logic (adapted for Shadow DOM)
        const scripts = shadow.querySelectorAll('script');
        const scriptsArray = Array.from(scripts);

        scriptsArray.forEach(oldScript => {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });
            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });

        // 4. Wait for styles and images to load to prevent FOUC
        const links = Array.from(shadow.querySelectorAll('link[rel="stylesheet"]'));
        const images = Array.from(shadow.querySelectorAll('img'));

        const resources = [...links, ...images];

        if (resources.length === 0) {
            setIsReady(true);
            return;
        }

        const promises = resources.map(el => {
            return new Promise(resolve => {
                if (el.tagName === 'IMG' && el.complete) {
                    resolve();
                    return;
                }

                const onFinish = () => {
                    el.removeEventListener('load', onFinish);
                    el.removeEventListener('error', onFinish);
                    resolve();
                };

                el.addEventListener('load', onFinish);
                el.addEventListener('error', onFinish);
            });
        });

        // Timeout safeguard
        const timeout = new Promise(resolve => setTimeout(resolve, 1000));

        Promise.race([Promise.all(promises), timeout]).then(() => {
            setIsReady(true);
        });

    }, [html]);

    return (
        <div
            ref={containerRef}
            className={`${className} transition-opacity duration-300 ease-in-out ${isReady ? 'opacity-100' : 'opacity-0'}`}
            {...props}
        />
    );
};

export default DangerousHtml;
