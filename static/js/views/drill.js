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
        if (btn.dataset.view === viewId) {
             btn.classList.add('active', 'bg-white/5', 'text-text-primary');
             btn.classList.remove('text-text-secondary');
        } else if (btn.dataset.view) {
             btn.classList.remove('active', 'bg-white/5', 'text-text-primary');
             btn.classList.add('text-text-secondary');
        }
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
        row.className = 'grid grid-cols-[120px_1fr_1fr_1fr_1fr] p-6 border-b border-white/5 transition-colors hover:bg-white/2';
        let label = form.charAt(0).toUpperCase() + form.slice(1);
        if (form === 'when') label = 'When?';

        row.innerHTML = `<div class="text-sm text-text-secondary uppercase font-semibold">${label}</div>`;

        aspects.forEach(aspect => {
            const text = data[aspect] ? data[aspect][form] : '';
            const cell = document.createElement('div');
            cell.className = 'pr-4 text-[0.95rem] text-slate-200 cursor-pointer transition-colors hover:text-white';
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
    elements.quizQuestion.innerHTML = '<div class="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div><div style="text-align:center;font-size:0.9rem;color:#94a3b8">Generating Drill...</div>';
    elements.quizOptions.innerHTML = '';
    elements.quizFeedback.classList.add('hidden');
    elements.quizTitle.textContent = `${tenseLabel} · ${aspectLabel}`;

    try {
        const quiz = await fetchQuiz(state.topic, state.currentLayer, aspectLabel, sentence);
        displayQuiz(quiz);
    } catch (err) {
        elements.quizQuestion.innerHTML = `<span class="text-red-500">Error: ${err.message}</span>`;
    }
}

function displayQuiz(quiz) {
    elements.quizQuestion.textContent = quiz.question_context;
    elements.quizOptions.innerHTML = '';
    
    quiz.options.forEach(opt => {
        const btn = document.createElement('div');
        btn.className = 'block w-full text-left p-4 mb-2 rounded-xl bg-slate-700/50 border border-white/5 hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors group';
        btn.innerHTML = `<span class="option-marker flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-xs font-bold group-hover:bg-white/20 transition-colors">${opt.id}</span> <span class="text-slate-200">${opt.text}</span>`;
        
        btn.onclick = () => {
            if (btn.classList.contains('pointer-events-none')) return;
            const allOpts = document.querySelectorAll('#quizOptions > div'); // selector specific to children
            allOpts.forEach(o => o.classList.add('pointer-events-none', 'opacity-60'));
            btn.classList.remove('opacity-60');
            
            const marker = btn.querySelector('.option-marker');

            if (opt.is_correct) {
                btn.className = 'block w-full text-left p-4 mb-2 rounded-xl bg-emerald-500/20 border border-emerald-500/50 cursor-default flex items-center gap-3 transition-colors';
                marker.className = 'flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold';
                
                elements.quizFeedback.innerHTML = `<strong class="text-emerald-400 block mb-1">Correct!</strong> <span class="text-slate-300">${opt.explanation}</span>`;
                elements.quizFeedback.className = 'mt-4 p-4 rounded-xl bg-slate-800 border border-emerald-500/20 text-sm animate-fade-in block';
                logAttempt('quiz', state.topic, state.currentLayer, true, { question: quiz.question_context, answer: opt.text });
            } else {
                btn.className = 'block w-full text-left p-4 mb-2 rounded-xl bg-red-500/20 border border-red-500/50 cursor-default flex items-center gap-3 transition-colors';
                marker.className = 'flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold';

                // Highlight correct one
                const correctBtn = Array.from(allOpts).find(o => o.querySelector('.option-marker').textContent === quiz.options.find(q => q.is_correct).id);
                if (correctBtn) {
                     correctBtn.className = 'block w-full text-left p-4 mb-2 rounded-xl bg-emerald-500/20 border border-emerald-500/50 cursor-default flex items-center gap-3 transition-colors';
                     correctBtn.querySelector('.option-marker').className = 'flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold';
                     correctBtn.classList.remove('opacity-60');
                }

                elements.quizFeedback.innerHTML = `<strong class="text-red-400 block mb-1">Incorrect.</strong> <span class="text-slate-300">${opt.explanation || "Better luck next time!"}</span>`;
                elements.quizFeedback.className = 'mt-4 p-4 rounded-xl bg-slate-800 border border-red-500/20 text-sm animate-fade-in block';
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
