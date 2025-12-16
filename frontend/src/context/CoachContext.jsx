import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useGlobalState } from './GlobalContext';
import { VoiceController } from '../utils/VoiceController';

const CoachContext = createContext();

export const CoachProvider = ({ children }) => {
    // const { state } = useGlobalState();
    const userId = "default_user"; // Placeholder until userProfile is added to GlobalContext

    // State
    const [sessionId, setSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [activeTool, setActiveTool] = useState(null); // { name: 'show_vocabulary', args: {...} }
    const [isListening, setIsListening] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Refs
    const voiceCtrl = useRef(null);
    const initializingRef = useRef(false);

    useEffect(() => {
        // Init Voice Controller
        voiceCtrl.current = new VoiceController(
            (text) => sendMessage(text), // On Transcript -> Send
            (listening) => setIsListening(listening) // Sync State
        );
        return () => {
            if (voiceCtrl.current) voiceCtrl.current.stop();
        };
    }, []); // Run once from mount

    // Audio Playback
    const [isPlaying, setIsPlaying] = useState(false);

    // Initialize Session
    const startSession = async () => {
        if (initializingRef.current || sessionId) return;
        initializingRef.current = true;

        setIsLoading(true);
        try {
            const response = await fetch('/api/coach/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId })
            });
            const data = await response.json();

            setSessionId(data.session_id);

            // Add initial greeting
            if (data.message) {
                addMessage({ role: 'assistant', content: data.message });
                playResponseAudio(data.message);
            }

            // Process initial tool calls
            if (data.tool_calls && data.tool_calls.length > 0) {
                processToolCalls(data.tool_calls);
            }

        } catch (error) {
            console.error("Failed to start coach session:", error);
            addMessage({ role: 'system', content: "Failed to connect to Neural Link." });
        } finally {
            setIsLoading(false);
            if (!sessionId) {
                // Only reset if we failed to get a session, so we can retry.
                // If successful (sessionId set), we want it to stay true to prevent future calls.
                initializingRef.current = false;
            }
        }
    };

    const playResponseAudio = async (text) => {
        try {
            const res = await fetch('/api/coach/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            if (res.ok) {
                const blob = await res.blob();
                if (voiceCtrl.current) {
                    await voiceCtrl.current.playAudioBlob(blob);
                }
            }
        } catch (e) {
            console.error("TTS Error", e);
        }
    };

    const sendMessage = async (text) => {
        if (!text.trim() || !sessionId) return;

        // Optimistic UI
        addMessage({ role: 'user', content: text });
        setIsLoading(true);

        try {
            const response = await fetch('/api/coach/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    message: text
                })
            });

            const data = await response.json();

            // Add assistant response
            if (data.message) {
                addMessage({ role: 'assistant', content: data.message });
                playResponseAudio(data.message);
            }

            // Handle tool calls
            if (data.tool_calls) {
                processToolCalls(data.tool_calls);
            }

        } catch (error) {
            console.error("Coach Chat Error:", error);
            addMessage({ role: 'system', content: "Connection interrupted." });
        } finally {
            setIsLoading(false);
        }
    };

    const processToolCalls = (tools) => {
        // For V1, we just take the last "view" tool and set it as active
        const viewTools = ['show_vocabulary', 'present_story', 'start_drill', 'launch_roleplay'];
        // Find the last view tool in the list
        const lastViewTool = tools.reverse().find(t => viewTools.includes(t.tool));
        if (lastViewTool) {
            setActiveTool({
                name: lastViewTool.tool,
                args: lastViewTool.args,
                result: lastViewTool.result // Pass the backend execution result (e.g., fetched story content)
            });
        }
    };

    const addMessage = (msg) => {
        setMessages(prev => [...prev, { ...msg, timestamp: new Date().toISOString() }]);
    };

    // Voice Controls
    const toggleListening = () => {
        if (isListening) {
            voiceCtrl.current?.stop();
        } else {
            voiceCtrl.current?.start();
        }
    };

    return (
        <CoachContext.Provider value={{
            sessionId,
            messages,
            activeTool,
            isListening,
            isLoading,
            startSession,
            sendMessage,
            toggleListening
        }}>
            {children}
        </CoachContext.Provider>
    );
};

export const useCoach = () => {
    const context = useContext(CoachContext);
    if (!context) {
        throw new Error('useCoach must be used within a CoachProvider');
    }
    return context;
};
