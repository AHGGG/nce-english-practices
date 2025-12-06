// Learn View - Vocabulary and Story rendering

import { state, getCacheKey } from '../core/state.js';
import { elements } from '../core/elements.js';
import { fetchStory } from '../core/api.js';
import { openDictionary } from '../components/dictionary.js';

export function renderVocab() {
    elements.vocabGrid.innerHTML = '';
    
    if (!state.vocab) return;
    
    const slots = state.vocab.slots;
    const verbs = state.vocab.verbs || [];

    let verbDisplay = "—";
    if (verbs.length > 0) {
        const v = verbs[0];
        verbDisplay = `${v.base} / ${v.past}`;
    }

    const items = [
        { label: 'Subject', value: (slots.subject || []).join(', ') },
        { label: 'Verb', value: verbDisplay },
        { label: 'Object', value: (slots.object || []).join(', ') },
        { label: 'Manner', value: (slots.manner || []).join(', ') },
        { label: 'Place', value: (slots.place || []).join(', ') },
        { label: 'Time', value: (slots.time || []).join(', ') }
    ];

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'vocab-card';
        div.innerHTML = `
            <span class="vocab-label">${item.label}</span>
            <span class="vocab-value">${item.value || '—'}</span>
        `;
        elements.vocabGrid.appendChild(div);
    });
}

export async function renderStory() {
    const topic = state.topic;
    const layer = state.currentLayer;
    const cacheKey = getCacheKey(topic, layer);

    elements.storyContainer.classList.remove('hidden');
    
    if (state.stories[cacheKey]) {
        displayStory(state.stories[cacheKey]);
        return;
    }

    elements.storyTitle.textContent = "Writing Story...";
    elements.storyContent.textContent = "The AI is crafting a context story for this tense...";
    elements.storyNotes.classList.add('hidden');

    try {
        const story = await fetchStory(topic, layer);
        state.stories[cacheKey] = story;
        displayStory(story);
    } catch (err) {
        elements.storyContent.innerHTML = `<span style="color:#ef4444">Failed to load story: ${err.message}</span>`;
    }
}

export function displayStory(story) {
    elements.storyTitle.textContent = story.title || `${story.target_tense} Story`;
    let content = story.content || "";
    
    // Basic Markdown Parsing (Bold & Italic)
    content = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');

    if (story.highlights && story.highlights.length > 0) {
        story.highlights.forEach(phrase => {
            const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${escaped})`, 'gi');
            content = content.replace(regex, '<span class="story-highlight" title="Target Tense">$1</span>');
        });
    }
    
    
    elements.storyContent.innerHTML = content;
    if (story.grammar_notes && story.grammar_notes.length > 0) {
        elements.storyNotes.classList.remove('hidden');
        elements.storyNotes.innerHTML = `
            <h4>Grammar Notes</h4>
            <ul>
                ${story.grammar_notes.map(note => `<li>${note}</li>`).join('')}
            </ul>
        `;
    } else {
        elements.storyNotes.classList.add('hidden');
    }
}

export function initLearnView() {
    // Double click to lookup
    if (elements.storyContent) {
        elements.storyContent.ondblclick = (e) => {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            
            const word = sel.toString().trim();
            console.log("Double click detected:", word);

            if (word && word.length > 0) {
                let sentence = "";
                try {
                    const node = sel.anchorNode;
                    if (node && node.nodeType === 3) {
                        sentence = node.textContent; 
                    } else if (node) {
                        sentence = node.innerText || "";
                    }
                } catch(err) {
                    sentence = "Context unavailable";
                }
                const cleanWord = word.replace(/^[^\w]+|[^\w]+$/g, '');
                console.log("Opening dictionary for:", cleanWord);
                if (cleanWord.length > 0) openDictionary(cleanWord, sentence);
            }
        };
    }
}
