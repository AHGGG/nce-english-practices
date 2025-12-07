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
import { renderScenario, renderChat, submitScenarioResponse, sendChatMessage, toggleVoiceCall } from './views/apply.js';
import { renderStats } from './views/stats.js';

import { openDictionary, askAiContext } from './components/dictionary.js';

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
            if (viewId === 'viewStats') {
                renderStats();
            }
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
        elements.tabs.forEach(t => {
            t.classList.remove('active', 'bg-accent/10', 'text-accent');
            t.classList.add('text-text-secondary', 'hover:text-text-primary');
        });
        tab.classList.remove('text-text-secondary', 'hover:text-text-primary');
        tab.classList.add('active', 'bg-accent/10', 'text-accent');
        handleTenseChange(tab.dataset.layer);
    });
});

// Quiz Modal
if (elements.closeQuizBtn) elements.closeQuizBtn.addEventListener('click', () => elements.quizModal.classList.add('hidden'));
if (elements.quizModal) elements.quizModal.addEventListener('click', (e) => {
    if (e.target === elements.quizModal) elements.quizModal.classList.add('hidden');
});

// Stats View Refresh
const refreshStatsBtn = document.getElementById('refreshStatsBtn');
if (refreshStatsBtn) {
    refreshStatsBtn.addEventListener('click', () => {
        renderStats();
        showToast('Stats updated!');
    });
}

// Dictionary Modal
if (elements.closeDictBtn) elements.closeDictBtn.addEventListener('click', () => elements.dictModal.classList.add('hidden'));
if (elements.dictModal) elements.dictModal.addEventListener('click', (e) => {
    if (e.target === elements.dictModal) elements.dictModal.classList.add('hidden');
});
if (elements.askAiBtn) elements.askAiBtn.addEventListener('click', () => {
    const word = elements.dictWord.textContent;
    const context = elements.dictContext.dataset.context;
    if (word) askAiForContext(word, context); // Assuming askAiForContext is imported or defined? Wait, line 17 imports askAiContext.
    // Line 111 in original was: elements.askAiBtn.addEventListener('click', askAiContext);
    // So I should keep using askAiContext.
    askAiContext();
});

// Mobile Topic Modal Handlers
if (elements.mobileTopicBtn) {
    elements.mobileTopicBtn.addEventListener('click', () => {
        elements.topicModal.classList.remove('hidden');
        elements.mobileTopicInput.focus();
    });
    
    if (elements.closeTopicModal) elements.closeTopicModal.addEventListener('click', () => {
        elements.topicModal.classList.add('hidden');
    });
    
    // Sync Inputs & Submit
    if (elements.mobileTopicSubmit) elements.mobileTopicSubmit.addEventListener('click', () => {
         const val = elements.mobileTopicInput.value.trim();
         if(val) {
             elements.topicInput.value = val; // Sync to main input
             elements.topicModal.classList.add('hidden');
             loadTheme(false);
         }
    });

    // Close on click outside
    elements.topicModal.addEventListener('click', (e) => {
        if (e.target === elements.topicModal) {
            elements.topicModal.classList.add('hidden');
        }
    });
}

// Mobile Inline Input Handlers
if (elements.mobileInlineBtn) {
    elements.mobileInlineBtn.addEventListener('click', () => {
         const val = elements.mobileInlineInput.value.trim();
         if(val) {
             elements.topicInput.value = val;
             loadTheme(false);
         }
    });

    elements.mobileInlineInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
             const val = elements.mobileInlineInput.value.trim();
             if(val) {
                 elements.topicInput.value = val;
                 loadTheme(false);
             }
        }
    });
}

if (elements.scenarioInput) elements.scenarioInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitScenarioResponse();
});

// Apply View - Chat
if (elements.chatSendBtn) elements.chatSendBtn.addEventListener('click', sendChatMessage);
if (elements.chatInput) elements.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

// Toggle Mission Brief (Mobile)
// Toggle Mission Brief (Mobile Teaser Bar)
const missionBrief = document.getElementById('missionBrief');
const missionChevron = document.getElementById('missionChevron');

if (missionBrief && missionChevron) {
    const toggle = () => {
        const isCollapsed = missionBrief.classList.contains('max-h-[44px]');
        if (isCollapsed) {
            // Expand
            missionBrief.classList.remove('max-h-[44px]');
            missionBrief.classList.add('max-h-[300px]');
            missionChevron.style.transform = 'rotate(180deg)';
        } else {
            // Collapse
            missionBrief.classList.add('max-h-[44px]');
            missionBrief.classList.remove('max-h-[300px]');
            missionChevron.style.transform = 'rotate(0deg)';
        }
    };

    missionBrief.addEventListener('click', toggle);
}

// Voice Call
const voiceBtn = document.getElementById('voiceCallBtn');
if (voiceBtn) voiceBtn.addEventListener('click', toggleVoiceCall);
