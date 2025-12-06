// Main Entry Point - Initialization and Event Binding
// All logic has been moved to modular files in core/, views/, and components/

console.log("Main.js loaded!");

// --- Imports ---
import { state, clearCaches } from './core/state.js';
import { elements } from './core/elements.js';
import { fetchTheme } from './core/api.js';
import { setLoading, showToast } from './core/utils.js';

import { renderVocab, renderStory, initLearnView } from './views/learn.js';
import { switchView, renderMatrix, handleTenseChange } from './views/drill.js';
import { renderScenario, renderChat, submitScenarioResponse, sendChatMessage } from './views/apply.js';

import { openDictionary, askAiContext } from './components/dictionary.js';
import { openStats } from './components/stats.js';

// --- Core Theme Loader ---
async function loadTheme(shuffle) {
    const topic = elements.topicInput.value.trim();
    if (!topic) return showToast('Please enter a topic', 'error');

    setLoading(true);
    
    try {
        const previousVocab = shuffle && state.vocab ? state.vocab : null;
        const vocab = await fetchTheme(topic, previousVocab);

        state.vocab = vocab;
        state.topic = topic;
        clearCaches();

        // Unhide content blocks
        elements.vocabSection.classList.remove('hidden');
        elements.storyContainer.classList.remove('hidden'); 
        
        // Render all views
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
initLearnView();
if (elements.loadBtn) elements.loadBtn.addEventListener('click', () => loadTheme(false));
if (elements.shuffleBtn) elements.shuffleBtn.addEventListener('click', () => loadTheme(true));
if (elements.topicInput) elements.topicInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadTheme(false);
});

// Drill View (Tense Tabs)
elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        elements.tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        handleTenseChange(tab.dataset.layer);
    });
});

// Quiz Modal
if (elements.closeQuizBtn) elements.closeQuizBtn.addEventListener('click', () => elements.quizModal.classList.add('hidden'));
if (elements.quizModal) elements.quizModal.addEventListener('click', (e) => {
    if (e.target === elements.quizModal) elements.quizModal.classList.add('hidden');
});

// Stats Modal
if (elements.closeStatsBtn) elements.closeStatsBtn.addEventListener('click', () => elements.statsModal.classList.add('hidden'));
if (elements.statsModal) elements.statsModal.addEventListener('click', (e) => {
    if (e.target === elements.statsModal) elements.statsModal.classList.add('hidden');
});

// Dictionary Modal
if (elements.closeDictBtn) elements.closeDictBtn.addEventListener('click', () => elements.dictModal.classList.add('hidden'));
if (elements.dictModal) elements.dictModal.addEventListener('click', (e) => {
    if (e.target === elements.dictModal) elements.dictModal.classList.add('hidden');
});
if (elements.askAiBtn) elements.askAiBtn.addEventListener('click', askAiContext);

// Apply View - Scenario
if (elements.scenarioSubmitBtn) elements.scenarioSubmitBtn.addEventListener('click', submitScenarioResponse);
if (elements.scenarioInput) elements.scenarioInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitScenarioResponse();
});

// Apply View - Chat
if (elements.chatSendBtn) elements.chatSendBtn.addEventListener('click', sendChatMessage);
if (elements.chatInput) elements.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});
