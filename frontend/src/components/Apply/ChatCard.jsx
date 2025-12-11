import React, { useState, useEffect, useRef } from 'react';
import { sendChatReply, polishSentence, addReviewNote, logAttempt } from '../../api/client';
import { GeminiLiveClient } from '../../api/gemini-live';

const ChatCard = ({ chatSession, topic, layer }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [voiceActive, setVoiceActive] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState('');
    const chatWindowRef = useRef(null);
    const voiceClientRef = useRef(null);

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
            const data = await sendChatReply(chatSession.session_id, txt);
            setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
            logAttempt('mission', topic, layer, true, { message: txt });
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

            try {
                const client = new GeminiLiveClient();
                client.onDisconnect = () => {
                    setVoiceActive(false);
                    setVoiceStatus('');
                    voiceClientRef.current = null;
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
            alert(`Suggestion: ${res.suggestion}`); // Placeholder for nicer UI
        } catch (e) { console.error(e); }
    };

    if (!chatSession) return <div className="text-slate-500">Loading chat...</div>;

    return (
        <div className="w-full h-full max-w-4xl mx-auto bg-[#0f172a]/50 backdrop-blur-md rounded-2xl border border-white/10 p-0 shadow-xl flex flex-col overflow-hidden relative">
            <div className="flex-none p-3 md:p-6 border-b border-white/10 bg-slate-900/50 flex items-center justify-between">
                {!voiceActive ? (
                    <div className="flex items-center justify-between w-full">
                        <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                            <span className="text-xl md:text-2xl">🕵️</span> Secret Mission
                        </h3>
                        <span className="px-2 py-0.5 md:px-3 md:py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wide">Roleplay</span>
                    </div>
                ) : (
                    <div className="flex items-center justify-between w-full animate-fade-in">
                        <div className="flex items-center gap-3">
                            <div className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </div>
                            <span className="text-red-400 font-bold text-sm uppercase tracking-wider">{voiceStatus}</span>
                        </div>
                        <div className="h-8 flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="viz-bar w-1 h-3 bg-red-400/80 rounded-full transition-all duration-75"></div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Mission Brief */}
            <div className="flex-none bg-emerald-900/10 border-b border-white/5 px-4 py-2">
                <p className="text-emerald-400 text-sm font-bold truncate">{chatSession.mission.title}</p>
                <div className="max-h-24 overflow-y-auto mt-1">
                    <p className="text-slate-400 text-xs leading-relaxed">{chatSession.mission.description}</p>
                </div>
            </div>

            <div ref={chatWindowRef} id="chatWindow" className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth min-h-0">
                {messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    return (
                        <div key={idx} className={`max-w-[80%] px-4 py-3 rounded-2xl text-[0.95rem] leading-relaxed shadow-sm mb-3 relative group ${isUser ? 'ml-auto bg-sky-400 text-slate-900 rounded-br-sm' : 'mr-auto bg-white/10 text-white rounded-bl-sm'}`}>
                            <span>{msg.content}</span>
                            {isUser && (
                                <button
                                    onClick={() => handlePolish(idx, msg.content)}
                                    className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-slate-700/50 hover:bg-slate-700 text-xs text-sky-400"
                                    title="Polish"
                                >
                                    ✨
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex-none p-3 md:p-4 border-t border-white/10 bg-slate-900/50 flex gap-2 z-10 relative">
                <button
                    onClick={toggleVoice}
                    className={`flex-none flex items-center justify-center w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-3 rounded-xl transition-colors border border-white/10 gap-2 ${voiceActive ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse' : 'bg-white/5 hover:bg-white/10 text-slate-400'}`}
                >
                    <span className="text-lg">{voiceActive ? '🛑' : '📞'}</span>
                    <span className="hidden md:inline text-sm font-semibold">{voiceActive ? 'End Call' : 'Start Call'}</span>
                </button>
                <input
                    id="chatInput"
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Say something..."
                    autoComplete="off"
                    className="flex-1 min-w-0 bg-[#0f172a] border border-white/10 text-white rounded-xl px-3 py-2 md:px-4 md:py-3 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all placeholder-slate-600 text-sm md:text-base"
                />
                <button
                    id="chatSendBtn"
                    onClick={handleSend}
                    className="flex-none px-4 py-2 md:px-6 md:py-3 bg-sky-400 text-slate-900 font-semibold rounded-xl hover:bg-sky-500 transition-colors shadow-[0_0_20px_rgba(56,189,248,0.3)] text-sm md:text-base"
                >
                    Send
                </button>
            </div>
        </div>
    );
};

export default ChatCard;
