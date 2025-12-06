// Apply View - Scenario and Chat logic

import { state, getCacheKey } from '../core/state.js';
import { elements } from '../core/elements.js';
import { fetchScenario, gradeScenario, startChat, sendChatReply, logAttempt } from '../core/api.js';

// --- Scenario ---

export async function renderScenario() {
    const topic = state.topic;
    const layer = state.currentLayer;
    const cacheKey = getCacheKey(topic, layer);
    
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
        const scenario = await fetchScenario(topic, layer);
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

export async function submitScenarioResponse() {
    const input = elements.scenarioInput.value.trim();
    if (!input) return;
    
    elements.scenarioInput.disabled = true;
    elements.scenarioSubmitBtn.disabled = true;
    elements.scenarioFeedback.classList.remove('hidden');
    elements.scenarioFeedback.textContent = 'Grading...';

    try {
        const result = await gradeScenario(
            state.currentScenario.situation,
            state.currentScenario.goal,
            input,
            state.currentLayer
        );
        
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

export async function renderChat() {
    const topic = state.topic;
    const layer = state.currentLayer;
    const cacheKey = getCacheKey(topic, layer);
    
    elements.chatCard.classList.remove('hidden');
    elements.chatWindow.innerHTML = '';
    elements.missionTitle.textContent = "Loading Mission...";
    
    if (state.chats[cacheKey]) {
        restoreChat(state.chats[cacheKey]);
        return;
    }
    
    try {
        const data = await startChat(topic, layer);
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

export async function sendChatMessage() {
    const txt = elements.chatInput.value.trim();
    if (!txt) return;
    
    const cacheKey = getCacheKey(state.topic, state.currentLayer);
    const session = state.chats[cacheKey];
    if (!session) return;
    
    appendMessage('user', txt);
    elements.chatInput.value = '';
    session.messages.push({ role: 'user', content: txt });
    elements.chatWindow.scrollTop = elements.chatWindow.scrollHeight;
    
    try {
        const data = await sendChatReply(session.session_id, txt);
        
        appendMessage('ai', data.reply);
        session.messages.push({ role: 'ai', content: data.reply });
        elements.chatWindow.scrollTop = elements.chatWindow.scrollHeight;
        
        logAttempt('mission', state.topic, state.currentLayer, true, { message: txt });
    } catch (e) {
        appendMessage('system', 'Error.');
    }
}

function appendMessage(role, text) {
    const div = document.createElement('div');
    div.className = `chat-message ${role}`;
    div.textContent = text;
    elements.chatWindow.appendChild(div);
}
