
console.log("Main.js loaded!");

// --- State ---
const state = {
    topic: '',
    vocab: null,
    currentLayer: 'present',
    sentences: {}, // cache by time_layer
    stories: {},   // cache by topic_tense
    scenarios: {}, // cache by topic_tense
    chats: {},     // cache by topic_tense
    currentScenario: null,
    selectedWord: null,
    selectedContext: null
};

// --- Elements ---
const elements = {
    // Navigation & Layout
    navItems: document.querySelectorAll('.nav-item'),
    viewPanels: document.querySelectorAll('.view-panel'),
    views: {
        learn: document.getElementById('viewLearn'),
        drill: document.getElementById('viewDrill'),
        apply: document.getElementById('viewApply')
    },

    // Global Inputs
    topicInput: document.getElementById('topicInput'),
    loadBtn: document.getElementById('loadBtn'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    toast: document.getElementById('toast'),
    
    // View 1: Learn
    vocabSection: document.getElementById('vocabSection'),
    vocabGrid: document.getElementById('vocabGrid'),
    storyContainer: document.getElementById('storyContainer'),
    storyTitle: document.getElementById('storyTitle'),
    storyContent: document.getElementById('storyContent'),
    storyNotes: document.getElementById('storyNotes'),
    shuffleBtn: document.getElementById('shuffleBtn'),

    // View 2: Drill
    matrixSection: document.getElementById('matrixSection'), // logic ref
    matrixRows: document.getElementById('matrixRows'),
    tabs: document.querySelectorAll('.tab-btn'),
    // Quiz Modals
    quizModal: document.getElementById('quizModal'),
    closeQuizBtn: document.getElementById('closeQuizBtn'),
    quizTitle: document.getElementById('quizTitle'),
    quizQuestion: document.getElementById('quizQuestion'),
    quizOptions: document.getElementById('quizOptions'),
    quizFeedback: document.getElementById('quizFeedback'),

    // View 3: Apply
    scenarioCard: document.getElementById('scenarioCard'),
    scenarioSituation: document.getElementById('scenarioSituation'),
    scenarioGoal: document.getElementById('scenarioGoal'),
    scenarioInput: document.getElementById('scenarioInput'),
    scenarioSubmitBtn: document.getElementById('scenarioSubmitBtn'),
    scenarioFeedback: document.getElementById('scenarioFeedback'),
    // Chat
    chatCard: document.getElementById('chatCard'),
    missionTitle: document.getElementById('missionTitle'),
    missionDesc: document.getElementById('missionDesc'),
    missionGoals: document.getElementById('missionGoals'),
    chatWindow: document.getElementById('chatWindow'),
    chatInput: document.getElementById('chatInput'),
    chatSendBtn: document.getElementById('chatSendBtn'),

    // Stats (Modal)
    statsBtn: document.getElementById('statsNavBtn'),
    statsModal: document.getElementById('statsModal'),
    closeStatsBtn: document.getElementById('closeStatsBtn'),
    totalXp: document.getElementById('totalXp'),
    activityStats: document.getElementById('activityStats'),
    recentHistory: document.getElementById('recentHistory'),

    // Dictionary (Modal)
    dictModal: document.getElementById('dictModal'),
    closeDictBtn: document.getElementById('closeDictBtn'),
    dictWord: document.getElementById('dictWord'),
    dictDefinition: document.getElementById('dictDefinition'),
    dictContext: document.getElementById('dictContext'),
    askAiBtn: document.getElementById('askAiBtn'),
    aiExplanation: document.getElementById('aiExplanation')
};

// --- Navigation Logic ---

function switchView(viewId) {
    if (!viewId) return;

    // Update Nav
    elements.navItems.forEach(btn => {
        if (btn.dataset.view === viewId) btn.classList.add('active');
        else if (btn.dataset.view) btn.classList.remove('active'); 
    });

    // Update Panels - MUST remove 'hidden' class because it has !important
    elements.viewPanels.forEach(panel => {
        if (panel.id === viewId) {
            panel.classList.remove('hidden');
            panel.classList.add('active');
        } else {
            panel.classList.add('hidden');
            panel.classList.remove('active');
        }
    });

    // Trigger specific renders to ensure visibility (handle 'hidden' classes on children)
    if (viewId === 'viewDrill') {
        renderMatrix();
        console.log("Switched to Drill. Matrix Rows children:", elements.matrixRows.childElementCount);
    } else if (viewId === 'viewApply') {
        renderScenario();
        renderChat();
        console.log("Switched to Apply. Scenario hidden?", elements.scenarioCard.classList.contains('hidden'));
    }
}

// --- Event Listeners ---

// Navigation
elements.navItems.forEach(btn => {
    btn.addEventListener('click', () => {
        const viewId = btn.dataset.view;
        if (viewId) {
            switchView(viewId);
        } else if (btn.id === 'statsNavBtn') {
            openStats();
        }
    });
});

// Learn View
if (elements.loadBtn) elements.loadBtn.addEventListener('click', () => loadTheme(false));
if (elements.shuffleBtn) elements.shuffleBtn.addEventListener('click', () => loadTheme(true));
if (elements.topicInput) elements.topicInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadTheme(false);
});

// Drill View (Tabs)
elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        elements.tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.currentLayer = tab.dataset.layer;
        
        // Re-render everything that depends on tense
        renderMatrix();
        renderStory(); // Story updates based on tense too
        renderScenario();
        renderChat();
    });
});

// Modals
if (elements.closeQuizBtn) elements.closeQuizBtn.addEventListener('click', () => elements.quizModal.classList.add('hidden'));
if (elements.quizModal) elements.quizModal.addEventListener('click', (e) => {
    if (e.target === elements.quizModal) elements.quizModal.classList.add('hidden');
});

if (elements.closeStatsBtn) elements.closeStatsBtn.addEventListener('click', () => elements.statsModal.classList.add('hidden'));
if (elements.statsModal) elements.statsModal.addEventListener('click', (e) => {
    if (e.target === elements.statsModal) elements.statsModal.classList.add('hidden');
});

// Dictionary
if (elements.closeDictBtn) elements.closeDictBtn.addEventListener('click', () => elements.dictModal.classList.add('hidden'));
if (elements.dictModal) elements.dictModal.addEventListener('click', (e) => {
    if (e.target === elements.dictModal) elements.dictModal.classList.add('hidden');
});
if (elements.askAiBtn) elements.askAiBtn.addEventListener('click', askAiContext);

// Apply View
if (elements.scenarioSubmitBtn) elements.scenarioSubmitBtn.addEventListener('click', submitScenarioResponse);
if (elements.scenarioInput) elements.scenarioInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitScenarioResponse();
});

if (elements.chatSendBtn) elements.chatSendBtn.addEventListener('click', sendChatMessage);
if (elements.chatInput) elements.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

// --- Core Logic ---

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
        // Clear caches
        state.sentences = {}; 
        state.stories = {};   
        state.scenarios = {}; 
        state.chats = {}; 

        // Unhide content blocks
        elements.vocabSection.classList.remove('hidden');
        elements.storyContainer.classList.remove('hidden'); 
        
        // Render
        renderVocab();
        await renderMatrix();  
        await renderStory();    
        await renderScenario(); 
        await renderChat();     

        // Focus Learn View
        switchView('viewLearn');

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

    // Elements inside viewLearn/storyContainer
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

// Update displayStory to handle clicks and basic markdown
function displayStory(story) {
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
    
    // Double click to lookup
    elements.storyContent.ondblclick = (e) => {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        
        const word = sel.toString().trim();
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
             if (cleanWord.length > 0) openDictionary(cleanWord, sentence);
        }
    };

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
    
    // Ensure Matrix Container is visible if it was hidden
    // Note: In new layout, matrixSection is the scrollable container.
    // We don't need to toggle visibility of matrixSection usually, direct render.

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

// --- Dictionary Logic ---

async function openDictionary(word, contextSentence) {
    state.selectedWord = word;
    state.selectedContext = contextSentence;
    
    elements.dictModal.classList.remove('hidden');
    elements.dictWord.textContent = word;
    elements.dictDefinition.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;display:inline-block"></div> Searching...';
    elements.aiExplanation.classList.add('hidden');
    elements.aiExplanation.textContent = '';
    
    try {
        const res = await fetch('/api/dictionary/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word: word })
        });
        const data = await res.json();
        
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

async function askAiContext() {
    if (!state.selectedWord || !state.selectedContext) return;
    
    elements.askAiBtn.disabled = true;
    elements.askAiBtn.textContent = 'Thinking...';
    elements.aiExplanation.classList.remove('hidden');
    elements.aiExplanation.textContent = '...';
    
    try {
        const res = await fetch('/api/dictionary/context', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word: state.selectedWord, sentence: state.selectedContext })
        });
        const data = await res.json();
        elements.aiExplanation.textContent = data.explanation;
    } catch (e) {
        elements.aiExplanation.textContent = 'Failed to get explanation.';
    } finally {
        elements.askAiBtn.disabled = false;
        elements.askAiBtn.textContent = 'Ask AI to explain in context';
    }
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
