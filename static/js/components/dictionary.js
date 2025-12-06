// Dictionary Component - Word lookup and AI context explanation

import { state } from '../core/state.js';
import { elements } from '../core/elements.js';
import { lookupDictionary, explainInContext } from '../core/api.js';

export async function openDictionary(word, contextSentence) {
    state.selectedWord = word;
    state.selectedContext = contextSentence;
    
    elements.dictModal.classList.remove('hidden');
    elements.dictWord.textContent = word;
    elements.dictDefinition.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;display:inline-block"></div> Searching...';
    elements.aiExplanation.classList.add('hidden');
    elements.aiExplanation.textContent = '';
    
    try {
        const data = await lookupDictionary(word);
        
        if (data.results && data.results.length > 0) {
            elements.dictDefinition.innerHTML = '';
            
            const iframe = document.createElement('iframe');
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            iframe.style.backgroundColor = '#ffffff'; 
            
            elements.dictDefinition.appendChild(iframe);
            
            const doc = iframe.contentWindow.document;
            doc.open();
            
            const definitionsHTML = data.results.map(r => `
                <div class="dict-entry">
                    <small style="color:#64748b; font-family: sans-serif;">${r.dictionary}</small>
                    <div>${r.definition}</div>
                </div>
            `).join('<hr style="border-color:#e2e8f0; margin:1rem 0">');
            
            const style = `
                <style>
                    body { 
                        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                        color: #1e293b; 
                        padding: 1.5rem; 
                        margin: 0;
                        background-color: #ffffff;
                    }
                    * { max-width: 100%; }
                    img { height: auto; }
                </style>
            `;
            
            doc.write(`
                <!DOCTYPE html>
                <html>
                <head>${style}</head>
                <body>${definitionsHTML}</body>
                <script>
                    document.addEventListener('click', function(e) {
                        const target = e.target.closest('[href^="sound://"], [src^="sound://"]');
                        if (target) {
                            e.preventDefault();
                            const word = window.currentWord || "";
                            if (word) {
                                const u = new SpeechSynthesisUtterance(word);
                                u.lang = 'en-US';
                                window.speechSynthesis.speak(u);
                            }
                        }
                    }, true);
                </script>
                </html>
            `);
            
            iframe.contentWindow.currentWord = state.selectedWord;
            doc.close();
        } else {
            elements.dictDefinition.innerHTML = '<span style="color:#94a3b8">No local definition found. Try asking AI.</span>';
        }
    } catch (e) {
        console.error(e);
        elements.dictDefinition.textContent = 'Error loading definition: ' + e.message;
    }
}

export async function askAiContext() {
    if (!state.selectedWord || !state.selectedContext) return;
    
    elements.askAiBtn.disabled = true;
    elements.askAiBtn.textContent = 'Thinking...';
    elements.aiExplanation.classList.remove('hidden');
    elements.aiExplanation.textContent = '...';
    
    try {
        const data = await explainInContext(state.selectedWord, state.selectedContext);
        elements.aiExplanation.textContent = data.explanation;
    } catch (e) {
        elements.aiExplanation.textContent = 'Failed to get explanation.';
    } finally {
        elements.askAiBtn.disabled = false;
        elements.askAiBtn.textContent = 'Ask AI to explain in context';
    }
}
