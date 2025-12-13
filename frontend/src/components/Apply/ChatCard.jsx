import React, { useState, useEffect, useRef } from 'react';
import { sendChatReply, polishSentence, addReviewNote, logAttempt } from '../../api/client';
import { GeminiLiveClient } from '../../api/gemini-live';
import { Loader2, Send, Mic, MicOff, Sparkles, MessageCircle, ChevronDown, ChevronUp, Lock, Unlock } from 'lucide-react';
import { useToast } from '../ui';

const ChatCard = ({ chatSession, topic, layer }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [voiceActive, setVoiceActive] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState('');
    const chatWindowRef = useRef(null);
    const voiceClientRef = useRef(null);
    const { addToast } = useToast();
    const [isMissionExpanded, setIsMissionExpanded] = useState(false);
    const lastActionTime = useRef(Date.now());
    const voiceStartTime = useRef(0);

    // Cleanup voice on unmount
    useEffect(() => {
        return () => {
            if (voiceClientRef.current) {
                voiceClientRef.current.disconnect();
            }
        };
    }, []);

    useEffect(() => {
        if (chatSession) {
            // Handle both legacy (first_message) and new (messages array) formats
            let msgs = chatSession.messages || [];
            if (msgs.length === 0 && chatSession.first_message) {
                msgs = [{ role: 'ai', content: chatSession.first_message }];
            }
            setMessages(msgs);
            // Scroll to bottom
            setTimeout(() => scrollToBottom(), 100);

            // Reset timer when session loads to track active engagement time
            lastActionTime.current = Date.now();
        }
    }, [chatSession]);

    const scrollToBottom = () => {
        if (chatWindowRef.current) {
            chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const txt = input.trim();
        setInput('');
        const newMsg = { role: 'user', content: txt };
        setMessages(prev => [...prev, newMsg]);
        setLoading(true);
        scrollToBottom();

        try {
            // Calculate duration for this turn (User thinking + typing time)
            const now = Date.now();
            const turnDuration = Math.round((now - lastActionTime.current) / 1000);
            lastActionTime.current = now;

            const data = await sendChatReply(chatSession.session_id, txt);
            setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
            logAttempt('mission', topic, layer, true, { message: txt, duration_seconds: turnDuration });
        } catch (err) {
            console.error(err);
            // Toast error?
        } finally {
            setLoading(false);
            setTimeout(() => scrollToBottom(), 100);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSend();
    };

    const toggleVoice = async () => {
        if (voiceActive) {
            // Stop
            if (voiceClientRef.current) {
                voiceClientRef.current.disconnect();
                voiceClientRef.current = null;
            }
            setVoiceActive(false);
            setVoiceStatus('');
        } else {
            // Start
            setVoiceActive(true);
            setVoiceStatus('Initializing...');
            voiceStartTime.current = Date.now();

            try {
                const client = new GeminiLiveClient();
                client.onDisconnect = () => {
                    setVoiceActive(false);
                    setVoiceStatus('');
                    voiceClientRef.current = null;

                    // Log Voice Session
                    const duration = Math.round((Date.now() - voiceStartTime.current) / 1000);
                    if (duration > 1) { // Only log if significant
                        logAttempt('mission', topic, layer, true, { message: 'Voice Call Session', duration_seconds: duration });
                    }
                };
                client.onAudioLevel = (level) => {
                    // Update visualizer - accessing DOM directly or using State?
                    // Using State for visualizer at 60fps is bad. Direct DOM manipulation is better for this specific isolated bit.
                    const bars = document.querySelectorAll('.viz-bar');
                    bars.forEach(bar => {
                        const variation = 0.8 + Math.random() * 0.4;
                        const height = Math.max(12, Math.min(100, level * 150 * variation));
                        bar.style.height = `${height}%`;
                    });
                };
                client.onTranscript = (text, isUser) => {
                    // We need to update messages. 
                    // Since this comes in streams, we might want to debounce or update last message if same role.
                    // For simplicity: just append new messages or update if partial?
                    // The legacy code appends or updates last message.
                    setMessages(prev => {
                        const last = prev[prev.length - 1];
                        if (last && last.role === (isUser ? 'user' : 'ai')) {
                            return [...prev.slice(0, -1), { ...last, content: last.content + text }];
                        } else {
                            return [...prev, { role: isUser ? 'user' : 'ai', content: text }];
                        }
                    });
                    setTimeout(() => scrollToBottom(), 50);
                };

                // System instruction
                const instruction = `You are a roleplay partner for English practice. Topic: ${topic}. Context: ${chatSession.mission.description}. Keep responses natural.`;

                await client.connect({ systemInstruction: instruction });
                voiceClientRef.current = client;
                setVoiceStatus('Listening...');

            } catch (err) {
                console.error(err);
                setVoiceStatus('Error');
                setTimeout(() => setVoiceActive(false), 2000);
            }
        }
    };

    // Polish logic (Client-side mainly)
    const handlePolish = async (msgIndex, text) => {
        // Inline polish state... tricky in map. 
        // Maybe simpler to lift to a separate Message component?
        // For MVP, just alerting or logging.
        try {
            // Only polish user messages
            const history = messages;
            const res = await polishSentence(text, history);
            addToast(res.suggestion, 'success', 5000);
            // Copy to clipboard option could be good here too
        } catch (e) {
            console.error(e);
            addToast("Failed to get suggestion", 'error');
        }
    };

    if (!chatSession) return <div className="text-slate-500">Loading chat...</div>;

    return (
        <div className="w-full h-full max-w-4xl mx-auto bg-bg border border-ink-faint shadow-hard flex flex-col overflow-hidden relative">


            {/* Mission Brief - Collapsible */}
            <div
                className="flex-none bg-bg-paper border-b border-ink-faint px-6 py-2 cursor-pointer hover:bg-white/5 transition-colors group/mission"
                onClick={() => setIsMissionExpanded(!isMissionExpanded)}
            >
                <div className="flex items-center justify-between">
                    <p className="text-neon-green text-sm font-mono font-bold truncate mb-0 flex-1">
                        Target: {chatSession.mission.title}
                    </p>
                    {isMissionExpanded ? (
                        <ChevronUp size={16} className="text-ink-muted group-hover/mission:text-neon-cyan transition-colors" />
                    ) : (
                        <ChevronDown size={16} className="text-ink-muted group-hover/mission:text-neon-cyan transition-colors" />
                    )}
                </div>

                {isMissionExpanded && (
                    <div className="mt-2 max-h-24 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-200">
                        <p className="text-ink-muted text-xs leading-relaxed font-mono border-l-2 border-ink-faint pl-3">
                            {chatSession.mission.description}
                        </p>
                    </div>
                )}
            </div>

            {/* Terminal Window */}
            <div ref={chatWindowRef} id="chatWindow" className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth min-h-0 bg-bg" aria-live="polite">
                {messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    return (
                        <div key={idx} className={`max-w-[85%] group relative ${isUser ? 'ml-auto text-right' : 'mr-auto text-left'}`}>
                            {/* Label */}
                            <div className={`text-[10px] font-mono uppercase tracking-widest mb-1 ${isUser ? 'text-neon-cyan' : 'text-neon-pink'}`}>
                                {isUser ? '>> OPERATOR' : '>> SYSTEM_AI'}
                            </div>

                            {/* Message Block */}
                            <div className={`inline-block px-5 py-3 border text-sm md:text-base font-mono leading-relaxed shadow-hard transition-all
                                ${isUser
                                    ? 'bg-bg-elevated border-neon-cyan text-ink'
                                    : 'bg-bg-paper border-neon-pink text-ink'}
                            `}>
                                <span>{msg.content}</span>
                            </div>

                            {/* Polish Button */}
                            {isUser && (
                                <button
                                    onClick={() => handlePolish(idx, msg.content)}
                                    className="absolute -left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all p-2 bg-bg border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black shadow-hard"
                                    title="Optimize Syntax"
                                    aria-label="Get polish suggestions"
                                >
                                    <Sparkles size={14} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Input Area */}
            <div className="flex-none p-3 md:p-4 border-t border-ink-faint bg-bg-elevated flex gap-2 z-10 relative shadow-hard-up items-center">
                <button
                    onClick={toggleVoice}
                    aria-label={voiceActive ? "End voice call" : "Start voice call"}
                    className={`flex-none flex items-center justify-center w-10 h-10 md:w-auto md:h-auto md:px-5 md:py-3 transition-all border border-ink-faint 
                        ${voiceActive
                            ? 'bg-neon-pink text-black border-neon-pink animate-pulse font-bold'
                            : 'bg-bg hover:bg-white/5 text-ink-muted hover:text-neon-pink'}`}
                >
                    {voiceActive ? <MicOff size={18} /> : <Mic size={18} />}
                    <span className="hidden md:inline ml-2 text-xs font-mono font-bold uppercase tracking-wider">{voiceActive ? 'ABORT' : 'VOICE'}</span>
                </button>

                <div className={`flex-1 relative group flex items-center border transition-all ${voiceActive
                    ? 'border-neon-pink bg-neon-pink/5'
                    : 'border-ink-faint bg-bg focus-within:border-neon-cyan'
                    }`}>
                    {/* Signal Status Indicator */}
                    <div className="absolute left-3 md:left-4 flex-none text-ink-muted">
                        {voiceActive ? (
                            <div className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full bg-neon-pink opacity-75 rounded-full"></span>
                                <span className="relative inline-flex h-2 w-2 bg-neon-pink rounded-full"></span>
                            </div>
                        ) : (
                            <Lock size={14} className="text-neon-cyan" />
                        )}
                    </div>

                    {!voiceActive ? (
                        <input
                            id="chatInput"
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="SECURE CHANNEL..."
                            autoComplete="off"
                            aria-label="Type your message"
                            className="w-full bg-transparent text-ink px-3 py-2 md:px-4 md:py-3 pl-8 md:pl-10 focus:outline-none placeholder-ink-muted/50 text-sm md:text-base font-mono disabled:opacity-50"
                            disabled={loading}
                        />
                    ) : (
                        <div className="w-full px-3 py-2 md:px-4 md:py-3 pl-8 md:pl-10 flex items-center justify-between animate-fade-in">
                            <span className="text-neon-pink font-mono font-bold text-sm uppercase tracking-wider animate-pulse">
                                {voiceStatus || "TRANSMITTING..."}
                            </span>
                            <div className="h-4 flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="viz-bar w-1 h-3 bg-neon-pink rounded-none transition-all duration-75"></div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <button
                    id="chatSendBtn"
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    aria-label="Send message"
                    className="flex-none w-10 h-10 md:w-auto md:h-auto md:px-6 bg-neon-cyan text-black font-bold hover:bg-white transition-all border border-neon-cyan disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-ink-muted flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                    <span className="hidden md:inline font-mono uppercase tracking-wider text-xs">{loading ? 'SENDING' : 'SEND'}</span>
                </button>
            </div>
        </div>
    );
};

export default ChatCard;
