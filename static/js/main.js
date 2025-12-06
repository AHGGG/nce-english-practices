
const state = {
    topic: '',
    vocab: null,
    currentLayer: 'present',
    sentences: {}, // cache by time_layer
    stories: {},   // cache by topic_tense
    scenarios: {}, // cache by topic_tense
    chats: {},     // cache by topic_tense
    currentScenario: null
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
    quizFeedback: document.getElementById('quizFeedback'),
    // Scenario Elements
    scenarioCard: document.getElementById('scenarioCard'),
    scenarioSituation: document.getElementById('scenarioSituation'),
    scenarioGoal: document.getElementById('scenarioGoal'),
    scenarioInput: document.getElementById('scenarioInput'),
    scenarioSubmitBtn: document.getElementById('scenarioSubmitBtn'),
    scenarioFeedback: document.getElementById('scenarioFeedback'),
    // Chat Elements
    chatCard: document.getElementById('chatCard'),
    missionTitle: document.getElementById('missionTitle'),
    missionDesc: document.getElementById('missionDesc'),
    missionGoals: document.getElementById('missionGoals'),
    chatWindow: document.getElementById('chatWindow'),
    chatInput: document.getElementById('chatInput'),
    chatSendBtn: document.getElementById('chatSendBtn'),
    // Stats Elements
    statsBtn: document.getElementById('statsBtn'),
    statsModal: document.getElementById('statsModal'),
    closeStatsBtn: document.getElementById('closeStatsBtn'),
    totalXp: document.getElementById('totalXp'),
    activityStats: document.getElementById('activityStats'),
    recentHistory: document.getElementById('recentHistory')
};

// --- Event Listeners ---

if (elements.loadBtn) elements.loadBtn.addEventListener('click', () => loadTheme(false));
if (elements.shuffleBtn) elements.shuffleBtn.addEventListener('click', () => loadTheme(true));

if (elements.topicInput) elements.topicInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadTheme(false);
});

elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        elements.tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.currentLayer = tab.dataset.layer;
        renderMatrix();
        renderStory();
        renderScenario();
        renderChat();
    });
});

if (elements.closeQuizBtn) elements.closeQuizBtn.addEventListener('click', () => {
    elements.quizModal.classList.add('hidden');
});

if (elements.quizModal) elements.quizModal.addEventListener('click', (e) => {
    if (e.target === elements.quizModal) elements.quizModal.classList.add('hidden');
});

if (elements.scenarioSubmitBtn) elements.scenarioSubmitBtn.addEventListener('click', submitScenarioResponse);
if (elements.scenarioInput) elements.scenarioInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitScenarioResponse();
});

if (elements.chatSendBtn) elements.chatSendBtn.addEventListener('click', sendChatMessage);
if (elements.chatInput) elements.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

if (elements.statsBtn) elements.statsBtn.addEventListener('click', openStats);
if (elements.closeStatsBtn) elements.closeStatsBtn.addEventListener('click', () => {
    elements.statsModal.classList.add('hidden');
});
if (elements.statsModal) elements.statsModal.addEventListener('click', (e) => {
    if (e.target === elements.statsModal) elements.statsModal.classList.add('hidden');
});


// --- Logic ---

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
        state.sentences = {}; 
        state.stories = {};   
        state.scenarios = {}; 
        state.chats = {}; 

        renderVocab();
        elements.vocabSection.classList.remove('hidden');
        elements.matrixSection.classList.remove('hidden');
        
        await renderMatrix();
        await renderStory();
        await renderScenario();
        await renderChat();

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

// --- Story ---

async function renderStory() {
    const topic = state.topic;
    const layer = state.currentLayer;
    const cacheKey = `${topic}_${layer}`;

    elements.storyContainer.classList.remove('hidden');
    
    if (state.stories[cacheKey]) {
        displayStory(state.stories[cacheKey]);
        return;
    }

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

// --- Matrix ---

async function renderMatrix() {
    const layer = state.currentLayer;
    elements.matrixRows.innerHTML = '<div style="padding:2rem; text-align:center; color:#94a3b8">Generating sentences...</div>';

    if (!state.sentences[layer]) {
        try {
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
            
            cell.onclick = (e) => {
                if(e.shiftKey) {
                    navigator.clipboard.writeText(text);
                    showToast('Copied!');
                } else {
                    openQuiz(layer, aspect, text);
                }
            };
            cell.title = "Click to Practice, Shift+Click to Copy";
            row.appendChild(cell);
        });
        elements.matrixRows.appendChild(row);
    });
}

// --- Quiz ---

async function openQuiz(tenseLabel, aspectLabel, sentence) {
    if (!sentence || sentence === '—') return;
    
    elements.quizModal.classList.remove('hidden');
    elements.quizQuestion.innerHTML = '<div class="spinner" style="width:30px;height:30px;border-width:2px"></div><div style="text-align:center;font-size:0.9rem;color:#94a3b8">Generating Drill...</div>';
    elements.quizOptions.innerHTML = '';
    elements.quizFeedback.classList.add('hidden');
    elements.quizTitle.textContent = `${tenseLabel} · ${aspectLabel}`;

    try {
        const payload = {
            topic: state.topic,
            tense: state.currentLayer,
            aspect: aspectLabel.toLowerCase(),
            correct_sentence: sentence
        };

        const res = await fetch('/api/quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error((await res.json()).detail);
        const quiz = await res.json();
        displayQuiz(quiz);

    } catch (err) {
        elements.quizQuestion.innerHTML = `<span style="color:red">Error: ${err.message}</span>`;
    }
}

function displayQuiz(quiz) {
    elements.quizQuestion.textContent = quiz.question_context;
    elements.quizOptions.innerHTML = '';
    
    quiz.options.forEach(opt => {
        const btn = document.createElement('div');
        btn.className = 'quiz-option';
        btn.innerHTML = `<span class="option-marker">${opt.id}</span> <span>${opt.text}</span>`;
        
        btn.onclick = () => {
            if (btn.classList.contains('disabled')) return;
            const allOpts = document.querySelectorAll('.quiz-option');
            allOpts.forEach(o => o.classList.add('disabled'));
            
            if (opt.is_correct) {
                btn.classList.add('correct');
                elements.quizFeedback.innerHTML = `<strong>Correct!</strong> <br> ${opt.explanation}`;
                elements.quizFeedback.className = 'quiz-feedback';
                logAttempt('quiz', true, { question: quiz.question_context, answer: opt.text });
            } else {
                btn.classList.add('incorrect');
                const correctBtn = Array.from(allOpts).find(o => o.querySelector('.option-marker').textContent === quiz.options.find(q => q.is_correct).id);
                if (correctBtn) correctBtn.classList.add('correct');
                elements.quizFeedback.innerHTML = `<strong>Incorrect.</strong> <br> ${opt.explanation || "Better luck next time!"}`;
                elements.quizFeedback.className = 'quiz-feedback';
                logAttempt('quiz', false, { question: quiz.question_context, answer: opt.text });
            }
        };
        elements.quizOptions.appendChild(btn);
    });
}

// --- Scenario ---

async function renderScenario() {
    const topic = state.topic;
    const layer = state.currentLayer;
    const cacheKey = `${topic}_${layer}`;
    
    elements.scenarioCard.classList.remove('hidden');
    elements.scenarioSituation.innerHTML = '<span style="color:#94a3b8">Finding a situation...</span>';
    elements.scenarioGoal.textContent = '...';
    elements.scenarioFeedback.classList.add('hidden');
    elements.scenarioInput.value = '';
    
    if (state.scenarios[cacheKey]) {
        displayScenario(state.scenarios[cacheKey]);
        return;
    }

    try {
        const res = await fetch('/api/scenario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: topic, tense: layer, aspect: 'simple' }) 
        });
        
        const scenario = await res.json();
        state.scenarios[cacheKey] = scenario;
        displayScenario(scenario);

    } catch (err) {
        elements.scenarioSituation.textContent = "Could not load scenario.";
    }
}

function displayScenario(scenario) {
    elements.scenarioSituation.textContent = scenario.situation;
    elements.scenarioGoal.textContent = scenario.goal;
    state.currentScenario = scenario;
    elements.scenarioInput.disabled = false;
    elements.scenarioSubmitBtn.disabled = false;
}

async function submitScenarioResponse() {
    const input = elements.scenarioInput.value.trim();
    if (!input) return;
    
    elements.scenarioInput.disabled = true;
    elements.scenarioSubmitBtn.disabled = true;
    elements.scenarioFeedback.classList.remove('hidden');
    elements.scenarioFeedback.textContent = 'Grading...';

    try {
        const payload = {
            situation: state.currentScenario.situation,
            goal: state.currentScenario.goal,
            user_input: input,
            tense: state.currentLayer
        };

        const res = await fetch('/api/scenario/grade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        
        const cls = result.is_pass ? 'pass' : 'fail';
        elements.scenarioFeedback.className = `scenario-feedback ${cls}`;
        elements.scenarioFeedback.innerHTML = `
            <strong>${result.is_pass ? 'Passed!' : 'Needs Improvement'}</strong><br>
            ${result.feedback}
            ${result.improved_version ? `<span class="improved-version">${result.improved_version}</span>` : ''}
        `;
        
        elements.scenarioInput.disabled = false;
        elements.scenarioSubmitBtn.disabled = false;

    } catch (err) {
        elements.scenarioFeedback.textContent = 'Error grading.';
        elements.scenarioInput.disabled = false;
        elements.scenarioSubmitBtn.disabled = false;
    }
}

// --- Chat ---

async function renderChat() {
    const topic = state.topic;
    const layer = state.currentLayer;
    const cacheKey = `${topic}_${layer}`;
    
    elements.chatCard.classList.remove('hidden');
    elements.chatWindow.innerHTML = '';
    elements.missionTitle.textContent = "Loading Mission...";
    
    if (state.chats[cacheKey]) {
        restoreChat(state.chats[cacheKey]);
        return;
    }
    
    try {
        const res = await fetch('/api/chat/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: topic, tense: layer, aspect: 'simple' })
        });
        const data = await res.json();
        const session = {
            session_id: data.session_id,
            mission: data.mission,
            messages: [{ role: 'ai', content: data.first_message }]
        };
        state.chats[cacheKey] = session;
        restoreChat(session);
        
    } catch (e) {
        elements.missionTitle.textContent = "Mission Failed";
    }
}

function restoreChat(session) {
    elements.missionTitle.textContent = session.mission.title;
    elements.missionDesc.textContent = session.mission.description;
    elements.missionGoals.innerHTML = session.mission.required_grammar.map(g => `<li>${g}</li>`).join('');
    elements.chatWindow.innerHTML = '';
    session.messages.forEach(m => appendMessage(m.role, m.content));
}

async function sendChatMessage() {
    const txt = elements.chatInput.value.trim();
    if (!txt) return;
    
    const session = state.chats[`${state.topic}_${state.currentLayer}`];
    if (!session) return;
    
    appendMessage('user', txt);
    elements.chatInput.value = '';
    session.messages.push({ role: 'user', content: txt });
    elements.chatWindow.scrollTop = elements.chatWindow.scrollHeight;
    
    try {
        const res = await fetch('/api/chat/reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: session.session_id, message: txt })
        });
        const data = await res.json();
        
        appendMessage('ai', data.reply);
        session.messages.push({ role: 'ai', content: data.reply });
        elements.chatWindow.scrollTop = elements.chatWindow.scrollHeight;
        
        // Log generic attempt (active engagement)
        logAttempt('mission', true, { message: txt });
        
    } catch(e) {
        appendMessage('system', 'Error.');
    }
}

function appendMessage(role, text) {
    const div = document.createElement('div');
    div.className = `chat-message ${role}`;
    div.textContent = text;
    elements.chatWindow.appendChild(div);
}

// --- Stats & Logging ---

async function openStats() {
    elements.statsModal.classList.remove('hidden');
    elements.totalXp.textContent = '...';
    elements.activityStats.innerHTML = 'Loading...';
    elements.recentHistory.innerHTML = '';
    
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        
        elements.totalXp.textContent = data.total_xp;
        
        elements.activityStats.innerHTML = data.activities.map(a => `
            <div class="activity-item">
                <strong>${a.count}</strong>
                <span style="font-size:0.8rem;text-transform:capitalize;color:#94a3b8">${a.activity_type}</span>
            </div>
        `).join('');
        
        elements.recentHistory.innerHTML = data.recent.map(r => `
            <li>
                <div>
                    <span style="font-weight:600;text-transform:capitalize">${r.activity_type}</span>
                    <span style="font-size:0.8rem;color:#64748b;margin-left:0.5rem">${r.topic || '-'} (${r.tense || '-'})</span>
                </div>
                <span class="${r.is_pass ? 'status-pass' : 'status-fail'}">
                    ${r.is_pass ? 'Pass' : 'Fail'}
                </span>
            </li>
        `).join('');
    } catch (e) {
        elements.totalXp.textContent = 'Err';
    }
}

async function logAttempt(type, isPass, details) {
    try {
        await fetch('/api/log_attempt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                activity_type: type,
                topic: state.topic,
                tense: state.currentLayer,
                is_pass: isPass,
                details: details
            })
        });
    } catch (e) {
        console.log("Log error", e);
    }
}

function setLoading(isLoading) {
    if (isLoading) elements.loadingOverlay.classList.remove('hidden');
    else elements.loadingOverlay.classList.add('hidden');
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
