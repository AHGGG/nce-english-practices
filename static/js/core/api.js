// API Layer - All backend communication

const headers = { 'Content-Type': 'application/json' };

async function handleResponse(res) {
    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Request failed' }));
        const msg = typeof error.detail === 'object' ? JSON.stringify(error.detail) : (error.detail || 'Request failed');
        throw new Error(msg);
    }
    return res.json();
}

// Theme & Vocabulary
export async function fetchTheme(topic, previousVocab = null) {
    const payload = { topic };
    if (previousVocab) payload.previous_vocab = previousVocab;
    
    const res = await fetch('/api/theme', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    });
    return handleResponse(res);
}

// Sentences (Matrix)
export async function fetchSentences(payload) {
    const res = await fetch('/api/sentences', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    });
    return handleResponse(res);
}

// Story
export async function fetchStory(topic, targetTense) {
    const res = await fetch('/api/story', {
        method: 'POST',
        headers,
        body: JSON.stringify({ topic, target_tense: targetTense })
    });
    return handleResponse(res);
}

// Quiz
export async function fetchQuiz(topic, tense, aspect, correctSentence) {
    const res = await fetch('/api/quiz', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            topic,
            tense,
            aspect: aspect.toLowerCase(),
            correct_sentence: correctSentence
        })
    });
    return handleResponse(res);
}

// Scenario
export async function fetchScenario(topic, tense) {
    const res = await fetch('/api/scenario', {
        method: 'POST',
        headers,
        body: JSON.stringify({ topic, tense, aspect: 'simple' })
    });
    return handleResponse(res);
}

export async function gradeScenario(situation, goal, userInput, tense) {
    const res = await fetch('/api/scenario/grade', {
        method: 'POST',
        headers,
        body: JSON.stringify({ situation, goal, user_input: userInput, tense })
    });
    return handleResponse(res);
}

// Chat
export async function startChat(topic, tense) {
    const res = await fetch('/api/chat/start', {
        method: 'POST',
        headers,
        body: JSON.stringify({ topic, tense, aspect: 'simple' })
    });
    return handleResponse(res);
}

export async function sendChatReply(sessionId, message) {
    const res = await fetch('/api/chat/reply', {
        method: 'POST',
        headers,
        body: JSON.stringify({ session_id: sessionId, message })
    });
    return handleResponse(res);
}

export async function polishSentence(sentence, context = []) {
    const res = await fetch('/api/chat/polish', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sentence, context })
    });
    return handleResponse(res);
}

export async function addReviewNote(original, better, tags = []) {
    const res = await fetch('/api/review/add', {
        method: 'POST',
        headers,
        body: JSON.stringify({ original, better, tags })
    });
    return handleResponse(res);
}

// Dictionary
export async function lookupDictionary(word) {
    const res = await fetch('/api/dictionary/lookup', {
        method: 'POST',
        headers,
        body: JSON.stringify({ word })
    });
    return handleResponse(res);
}

export async function explainInContext(word, sentence) {
    const res = await fetch('/api/dictionary/context', {
        method: 'POST',
        headers,
        body: JSON.stringify({ word, sentence })
    });
    return handleResponse(res);
}

// Stats & Logging
export async function fetchStats() {
    const res = await fetch('/api/stats');
    return handleResponse(res);
}

// Track time between logs
let lastLogTime = Date.now();

export async function logAttempt(type, topic, tense, isPass, details) {
    const now = Date.now();
    // Cap duration to 5 minutes to avoid idle time skewing
    let duration = Math.round((now - lastLogTime) / 1000);
    if (duration > 300) duration = 60; // Fallback for idle
    if (duration < 0) duration = 0;
    
    lastLogTime = now;

    try {
        await fetch('/api/log_attempt', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                activity_type: type,
                topic,
                tense,
                is_pass: isPass,
                details,
                duration_seconds: duration
            })
        });
    } catch (e) {
        console.log("Log error", e);
    }
}
