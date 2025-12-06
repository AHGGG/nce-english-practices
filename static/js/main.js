
const state = {
    topic: '',
    vocab: null,
    currentLayer: 'present',
    sentences: {}, // cache by time_layer
    stories: {},   // cache by topic_tense
};

const elements = {
    topicInput: document.getElementById('topicInput'),
    loadBtn: document.getElementById('loadBtn'),
    shuffleBtn: document.getElementById('shuffleBtn'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    vocabSection: document.getElementById('vocabSection'),
    vocabGrid: document.getElementById('vocabGrid'),
    matrixSection: document.getElementById('matrixSection'),
    matrixRows: document.getElementById('matrixRows'),
    tabs: document.querySelectorAll('.tab-btn'),
    toast: document.getElementById('toast'),
    // Story Elements
    storyContainer: document.getElementById('storyContainer'),
    storyTitle: document.getElementById('storyTitle'),
    storyContent: document.getElementById('storyContent'),
    storyNotes: document.getElementById('storyNotes'),
    // Quiz Elements
    quizModal: document.getElementById('quizModal'),
    closeQuizBtn: document.getElementById('closeQuizBtn'),
    quizTitle: document.getElementById('quizTitle'),
    quizQuestion: document.getElementById('quizQuestion'),
    quizOptions: document.getElementById('quizOptions'),
    quizFeedback: document.getElementById('quizFeedback')
};

// --- Event Listeners ---

elements.loadBtn.addEventListener('click', () => loadTheme(false));
elements.shuffleBtn.addEventListener('click', () => loadTheme(true));

elements.topicInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadTheme(false);
});

elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        elements.tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.currentLayer = tab.dataset.layer;
        renderMatrix();
        renderStory(); 
    });
});

elements.closeQuizBtn.addEventListener('click', () => {
    elements.quizModal.classList.add('hidden');
});

elements.quizModal.addEventListener('click', (e) => {
    if (e.target === elements.quizModal) elements.quizModal.classList.add('hidden');
});

// --- Actions ---

async function loadTheme(shuffle) {
    const topic = elements.topicInput.value.trim();
    if (!topic) return showToast('Please enter a topic', 'error');

    setLoading(true);
    
    try {
        const payload = { topic: topic };
        if (shuffle && state.vocab) {
            payload.previous_vocab = state.vocab;
        }

        const res = await fetch('/api/theme', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error((await res.json()).detail);

        state.vocab = await res.json();
        state.topic = topic;
        state.sentences = {}; // Clear sentence cache
        state.stories = {};   // Clear story cache

        renderVocab();
        elements.vocabSection.classList.remove('hidden');
        elements.matrixSection.classList.remove('hidden');
        
        await renderMatrix();
        await renderStory();

    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        setLoading(false);
    }
}

function renderVocab() {
    elements.vocabGrid.innerHTML = '';
    
    if (!state.vocab) return;
    
    const slots = state.vocab.slots;
    const verbs = state.vocab.verbs || [];

    // Order: Subject, Verb, Object, Manner, Place, Time
    const order = ['subject', 'verb', 'object', 'manner', 'place', 'time'];
    
    // For verbs, we pick the first one and show base/past/participle
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

async function renderStory() {
    const topic = state.topic;
    const layer = state.currentLayer;
    const cacheKey = `${topic}_${layer}`;

    elements.storyContainer.classList.remove('hidden');
    
    // Check cache
    if (state.stories[cacheKey]) {
        displayStory(state.stories[cacheKey]);
        return;
    }

    // Show loading state in story card
    elements.storyTitle.textContent = "Writing Story...";
    elements.storyContent.textContent = "The AI is crafting a context story for this tense...";
    elements.storyNotes.classList.add('hidden');

    try {
        const res = await fetch('/api/story', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: topic, target_tense: layer })
        });
        
        if (!res.ok) throw new Error((await res.json()).detail);
        
        const story = await res.json();
        state.stories[cacheKey] = story;
        displayStory(story);

    } catch (err) {
        elements.storyContent.innerHTML = `<span style="color:#ef4444">Failed to load story: ${err.message}</span>`;
    }
}

function displayStory(story) {
    elements.storyTitle.textContent = story.title || `${story.target_tense} Story`;
    
    let content = story.content;
    // Apply highlights
    if (story.highlights && story.highlights.length > 0) {
        story.highlights.forEach(phrase => {
            // Simple string replace, might need regex for case insensitivity or multiple occurences
            // Using global regex with escape
            const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${escaped})`, 'gi');
            content = content.replace(regex, '<span class="story-highlight" title="Target Tense">$1</span>');
        });
    }
    
    elements.storyContent.innerHTML = content;

    // Show notes
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

async function renderMatrix() {
    const layer = state.currentLayer;
    elements.matrixRows.innerHTML = '<div style="padding:2rem; text-align:center; color:#94a3b8">Generating sentences...</div>';

    if (!state.sentences[layer]) {
        // ... (fetch logic same as before, no changes needed inside fetch block) ...
        try {
           // ... same payload ...
           const v = state.vocab.verbs[0];
            const payload = {
                topic: state.topic,
                time_layer: layer,
                subject: (state.vocab.slots.subject || [])[0] || "I",
                verb_base: v ? v.base : "study",
                verb_past: v ? v.past : "studied",
                verb_participle: v ? v.participle : "studied",
                object: (state.vocab.slots.object || [])[0] || "",
                manner: (state.vocab.slots.manner || [])[0] || "",
                place: (state.vocab.slots.place || [])[0] || "",
                time: (state.vocab.slots.time || [])[0] || ""
            };

            const res = await fetch('/api/sentences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error((await res.json()).detail);
            state.sentences[layer] = await res.json();
        } catch (err) {
            elements.matrixRows.innerHTML = `<div style="padding:2rem; color:red">Error: ${err.message}</div>`;
            return;
        }
    }

    const data = state.sentences[layer];
    const aspects = ['simple', 'perfect', 'progressive', 'perfect_progressive'];
    const forms = ['affirmative', 'negative', 'question', 'when']; 

    elements.matrixRows.innerHTML = '';

    forms.forEach(form => {
        const row = document.createElement('div');
        row.className = 'matrix-row';
        
        let label = form.charAt(0).toUpperCase() + form.slice(1);
        if (form === 'when') label = 'When?';

        row.innerHTML = `<div class="row-label">${label}</div>`;

        aspects.forEach(aspect => {
            const text = data[aspect] ? data[aspect][form] : '';
            const cell = document.createElement('div');
            cell.className = 'sentence-cell';
            cell.dataset.label = aspect.replace('_', ' ');
            cell.textContent = text || '—';
            
            // New Click Handler
            cell.onclick = (e) => {
                if(e.shiftKey) {
                    navigator.clipboard.writeText(text);
                    showToast('Copied!');
                } else {
                    // Open Quiz
                    openQuiz(layer, aspect, text);
                }
            };
            cell.title = "Click to Practice, Shift+Click to Copy";
            
            row.appendChild(cell);
        });

        elements.matrixRows.appendChild(row);
    });
}

// --- Utilities ---

function setLoading(isLoading) {
    if (isLoading) {
        elements.loadingOverlay.classList.remove('hidden');
    } else {
        elements.loadingOverlay.classList.add('hidden');
    }
}

function showToast(msg, type='info') {
    elements.toast.textContent = msg;
    elements.toast.className = `toast visible ${type}`;
    elements.toast.style.display = 'block';
    setTimeout(() => {
        elements.toast.style.display = 'none';
        elements.toast.className = 'toast hidden';
    }, 2000);
}
