
const state = {
    topic: '',
    vocab: null,
    currentLayer: 'present',
    sentences: {}, // cache by time_layer
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
    toast: document.getElementById('toast')
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
    });
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
        state.sentences = {}; // Clear sentence cache on new theme/shuffle

        renderVocab();
        elements.vocabSection.classList.remove('hidden');
        elements.matrixSection.classList.remove('hidden');
        
        // Trigger sentence generation for current layer
        await renderMatrix();

    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        setLoading(false);
    }
}

function renderVocab() {
    elements.vocabGrid.innerHTML = '';
    
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

async function renderMatrix() {
    const layer = state.currentLayer;
    elements.matrixRows.innerHTML = '<div style="padding:2rem; text-align:center; color:#94a3b8">Generating sentences...</div>';

    // Check cache
    if (!state.sentences[layer]) {
        try {
            // Prepare payload for sentence generation
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
    const forms = ['affirmative', 'negative', 'question', 'when']; // displaying 'when' as special question example

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
            cell.onclick = () => {
                navigator.clipboard.writeText(text);
                showToast('Copied!');
            };
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
