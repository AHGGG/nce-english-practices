// Apply View - Scenario and Chat logic

import { state, getCacheKey } from '../core/state.js';
import { elements } from '../core/elements.js';
import { fetchScenario, gradeScenario, startChat, sendChatReply, logAttempt, polishSentence, addReviewNote } from '../core/api.js';
import { GeminiLiveClient } from '../core/gemini-live.js';

// --- Scenario ---

export async function renderScenario() {
    const topic = state.topic;
    const layer = state.currentLayer;

    if (!topic || !layer) return console.warn("Missing state for scenario", { topic, layer });

    const cacheKey = getCacheKey(topic, layer);
    
    // Visibility handled by Tab Switcher (index.html), do NOT force remove hidden here.
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
        console.error(err);
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
        
        const cls = result.is_pass 
            ? 'mt-4 p-4 rounded-xl bg-slate-800 border border-emerald-500/20 text-sm animate-fade-in text-emerald-300' 
            : 'mt-4 p-4 rounded-xl bg-slate-800 border border-red-500/20 text-sm animate-fade-in text-red-300';
            
        elements.scenarioFeedback.className = cls;
        elements.scenarioFeedback.innerHTML = `
            <strong class="block mb-1 text-base">${result.is_pass ? 'Passed!' : 'Needs Improvement'}</strong>
            <span class="text-slate-300 block mb-2">${result.feedback}</span>
            ${result.improved_version ? `<div class="mt-2 pt-2 border-t border-white/5 text-slate-400 text-xs uppercase tracking-wider font-bold">Better way:</div><div class="text-accent italic">${result.improved_version}</div>` : ''}
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

let activeVoiceClient = null;

export async function renderChat() {
    const topic = state.topic;
    const layer = state.currentLayer;

    if (!topic || !layer) return console.warn("Missing state for chat", { topic, layer });

    const cacheKey = getCacheKey(topic, layer);
    
    // Visibility handled by Tab Switcher (index.html), do NOT force remove hidden here.
    elements.chatWindow.innerHTML = '';
    elements.missionTitle.textContent = "Loading Mission...";
    
    // Stop any active voice session if switching views
    if (activeVoiceClient) {
        activeVoiceClient.disconnect();
        activeVoiceClient = null;
        updateVoiceUI(false);
    }
    
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
        console.error(e);
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
    const isUser = role === 'user';
    const alignClass = isUser ? 'ml-auto bg-accent text-slate-900 rounded-br-sm' : 'mr-auto bg-white/10 text-white rounded-bl-sm';
    
    // ADD ROLE CLASS HERE for identification
    div.className = `max-w-[80%] px-4 py-3 rounded-2xl text-[0.95rem] leading-relaxed shadow-sm mb-3 ${alignClass} animate-fade-in ${role} relative group`;
    
    // Message Text
    const textSpan = document.createElement('span');
    textSpan.textContent = text;
    div.appendChild(textSpan);

    // Polish Button (User only)
    if (isUser) {
        const btn = document.createElement('button');
        btn.className = 'absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-slate-700/50 hover:bg-slate-700 text-xs text-accent';
        btn.innerHTML = '✨';
        btn.title = 'Polish Grammar';
        
        btn.onclick = async () => {
             if (div.querySelector('.polish-result')) return; // Already polished
             
             btn.innerHTML = '⏳';
             try {
                 // Get context
                 const cacheKey = getCacheKey(state.topic, state.currentLayer);
                 const history = state.chats[cacheKey]?.messages || [];
                 
                 const res = await polishSentence(text, history);
                 
                 // Render Result
                 const resDiv = document.createElement('div');
                 resDiv.className = 'polish-result mt-2 pt-2 border-t border-white/10 text-xs text-emerald-300 italic animate-fade-in flex justify-between items-center';
                 resDiv.innerHTML = `<div><strong>✨ Suggestion:</strong> ${res.suggestion}</div>`;
                 
                 // Save Button
                 const saveBtn = document.createElement('button');
                 saveBtn.className = 'ml-2 text-[10px] uppercase font-bold tracking-wider text-slate-400 hover:text-accent transition-colors';
                 saveBtn.textContent = 'SAVE';
                 saveBtn.title = 'Add to Review Queue';
                 saveBtn.onclick = async () => {
                     try {
                         saveBtn.textContent = '...';
                         await addReviewNote(text, res.suggestion, ['chat']);
                         saveBtn.textContent = 'SAVED';
                         saveBtn.className = 'ml-2 text-[10px] uppercase font-bold tracking-wider text-emerald-500';
                         saveBtn.disabled = true;
                     } catch(err) {
                         saveBtn.textContent = 'ERR';
                         console.error(err);
                     }
                 };
                 resDiv.appendChild(saveBtn);
                 div.appendChild(resDiv);
                 
                 btn.remove(); // Remove button after use
             } catch (e) {
                 btn.innerHTML = '❌';
                 console.error(e);
             }
        };
        div.appendChild(btn);
    }
    
    elements.chatWindow.appendChild(div);
}

// --- Voice Integration ---

export async function toggleVoiceCall() {
    if (activeVoiceClient) {
        // Stop Call
        activeVoiceClient.disconnect();
        activeVoiceClient = null;
        updateVoiceUI(false);
        return;
    }

    // Start Call
    updateVoiceUI(true, true, "Initializing AI..."); // Loading state

    const topic = state.topic;
    const layer = state.currentLayer;
    const cacheKey = getCacheKey(topic, layer);
    const session = state.chats[cacheKey];

    if (!session) {
        updateVoiceUI(false);
        return;
    }

    try {
        // 1. Prepare System Instruction from Mission context
        const systemInstruction = `You are a roleplay partner for English practice. 
Topic: ${topic}. Context: ${session.mission.description}. 
Keep responses natural and conversational. Gently correct grammar mistakes.`;

        // 2. Connect Gemini Live (Proxy)
        const client = new GeminiLiveClient(); // Defaults to /ws/voice
        
        client.onDisconnect = () => {
            activeVoiceClient = null;
            updateVoiceUI(false);
        };
        
        client.onAudioLevel = (level) => {
             const bars = document.querySelectorAll('.viz-bar');
             if (bars.length) {
                 bars.forEach(bar => {
                     // Randomize variation to make it look organic
                     const variation = 0.8 + Math.random() * 0.4;
                     const height = Math.max(12, Math.min(100, level * 150 * variation)); 
                     bar.style.height = `${height}%`; 
                 });
             }
        };
        
        // Callback for text transcripts
        client.onTranscript = (text, isUser) => {
            appendOrUpdateMessage(isUser ? 'user' : 'ai', text);
            // Ensure we scroll to bottom to see new content
            elements.chatWindow.scrollTop = elements.chatWindow.scrollHeight;
        };

        // Handshake data
        await client.connect({
            voiceName: "Puck",
            systemInstruction: systemInstruction
        });
        
        activeVoiceClient = client;
        // Connection established, but let's give it a slight buffer or just show active.
        // The user complained they couldn't speak immediately. 
        // We will show "Active" (End Call) but with "Listening" status in header.
        updateVoiceUI(true, false, "Listening..."); 

    } catch (err) {
        console.error("Voice Error", err);
        alert("Could not start voice call: " + err.message);
        activeVoiceClient = null;
        updateVoiceUI(false);
    }
}

function appendOrUpdateMessage(role, text) {
    const lastMsg = elements.chatWindow.lastElementChild;
    // Check if the last message has the same role class
    if (lastMsg && lastMsg.classList.contains(role)) {
        lastMsg.textContent += text;
    } else {
        appendMessage(role, text);
    }
}

/**
 * Updates the Voice UI state
 * @param {boolean} active - Whether call is active
 * @param {boolean} loading - Whether currently connecting/disconnecting
 * @param {string} [statusText] - Optional text to override status (e.g. "Connecting...")
 */
function updateVoiceUI(active, loading = false, statusText = null) {
    const btn = document.getElementById('voiceCallBtn');
    // Header Elements
    const headerNormal = document.getElementById('chatHeaderNormal');
    const headerActive = document.getElementById('chatHeaderActive');
    const statusLabel = headerActive ? headerActive.querySelector('span.text-red-400') : null;
    
    // Find icon and label inside button
    const iconSpan = btn.querySelector('.icon');
    const labelSpan = btn.querySelector('.label');

    if (loading) {
        if(iconSpan) iconSpan.innerHTML = '<span class="spin">⏳</span>';
        const txt = statusText || 'Connecting...';
        if(labelSpan) labelSpan.textContent = txt;
        btn.classList.add('pulse');
        
        // Show loading status in header for mobile users
        if(headerNormal) headerNormal.classList.add('hidden');
        if(headerActive) headerActive.classList.remove('hidden');
        if(headerActive) headerActive.classList.add('flex');
        
        if(statusLabel) {
             statusLabel.textContent = txt;
             statusLabel.classList.add('animate-pulse'); // Add pulse to text
        }
        return;
    }

    if (active) {
        if(iconSpan) iconSpan.textContent = '🛑'; 
        if(labelSpan) labelSpan.textContent = 'End Call';
        
        btn.classList.add('active-call', 'bg-red-500/20', 'border-red-500/50', 'text-red-400');
        btn.classList.remove('bg-white/5', 'text-text-secondary', 'pulse');
        
        // Switch Header to Active Mode
        if(headerNormal) headerNormal.classList.add('hidden');
        if(headerActive) headerActive.classList.remove('hidden');
        if(headerActive) headerActive.classList.add('flex');
        
        if(statusLabel && statusText) statusLabel.textContent = statusText;
        else if(statusLabel) statusLabel.textContent = "Live Call";
        
    } else {
        if(iconSpan) iconSpan.textContent = '📞';
        if(labelSpan) labelSpan.textContent = 'Start Call';
        
        btn.classList.remove('active-call', 'bg-red-500/20', 'border-red-500/50', 'text-red-400');
        btn.classList.add('bg-white/5', 'text-text-secondary');
        btn.classList.remove('pulse');
        
        // Switch Header to Normal Mode
        if(headerNormal) headerNormal.classList.remove('hidden');
        if(headerActive) headerActive.classList.add('hidden');
        if(headerActive) headerActive.classList.remove('flex');
    }
}
