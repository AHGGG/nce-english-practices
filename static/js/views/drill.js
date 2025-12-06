// Drill View - Matrix and Quiz logic

import { state, getCacheKey } from '../core/state.js';
import { elements } from '../core/elements.js';
import { fetchSentences, fetchQuiz, logAttempt } from '../core/api.js';
import { showToast } from '../core/utils.js';
import { renderStory } from './learn.js';
import { renderScenario, renderChat } from './apply.js';

// Navigation between views
export function switchView(viewId) {
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

    // Trigger specific renders to ensure visibility
    if (viewId === 'viewDrill') {
        renderMatrix();
    } else if (viewId === 'viewApply') {
        renderScenario();
        renderChat();
    }
}

export async function renderMatrix() {
    const layer = state.currentLayer;
    
    // GUARD: Check if vocab is loaded
    if (!state.vocab) {
        elements.matrixRows.innerHTML = '<div style="padding:2rem; text-align:center; color:#94a3b8">Please enter a topic and click "Generate" first.</div>';
        return;
    }

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

            const data = await fetchSentences(payload);
            state.sentences[layer] = data;
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
                if (e.shiftKey) {
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

export async function openQuiz(tenseLabel, aspectLabel, sentence) {
    if (!sentence || sentence === '—') return;
    
    elements.quizModal.classList.remove('hidden');
    elements.quizQuestion.innerHTML = '<div class="spinner" style="width:30px;height:30px;border-width:2px"></div><div style="text-align:center;font-size:0.9rem;color:#94a3b8">Generating Drill...</div>';
    elements.quizOptions.innerHTML = '';
    elements.quizFeedback.classList.add('hidden');
    elements.quizTitle.textContent = `${tenseLabel} · ${aspectLabel}`;

    try {
        const quiz = await fetchQuiz(state.topic, state.currentLayer, aspectLabel, sentence);
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
                logAttempt('quiz', state.topic, state.currentLayer, true, { question: quiz.question_context, answer: opt.text });
            } else {
                btn.classList.add('incorrect');
                const correctBtn = Array.from(allOpts).find(o => o.querySelector('.option-marker').textContent === quiz.options.find(q => q.is_correct).id);
                if (correctBtn) correctBtn.classList.add('correct');
                elements.quizFeedback.innerHTML = `<strong>Incorrect.</strong> <br> ${opt.explanation || "Better luck next time!"}`;
                elements.quizFeedback.className = 'quiz-feedback';
                logAttempt('quiz', state.topic, state.currentLayer, false, { question: quiz.question_context, answer: opt.text });
            }
        };
        elements.quizOptions.appendChild(btn);
    });
}

// Handle tense tab changes
export function handleTenseChange(newLayer) {
    state.currentLayer = newLayer;
    
    // Re-render everything that depends on tense
    renderMatrix();
    renderStory();
    renderScenario();
    renderChat();
}
