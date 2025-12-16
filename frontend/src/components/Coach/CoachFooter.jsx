import React, { useState, useRef, useEffect } from 'react';
import { useCoach } from '../../context/CoachContext';
import { Send, Mic, Square, Zap, Terminal } from 'lucide-react';

const CoachFooter = () => {
    const { messages, sendMessage, isListening, toggleListening, isLoading } = useCoach();
    const [inputText, setInputText] = useState('');
    const scrollRef = useRef(null);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!inputText.trim() || isLoading) return;
        sendMessage(inputText);
        setInputText('');
    };

    return (
        <div className="h-full flex flex-col max-w-6xl mx-auto w-full px-6 py-6 relative">
            {/* Header / Status Bar */}
            <div className="absolute top-0 left-0 w-full px-6 py-2 border-b border-[#333] flex justify-between items-center bg-[#0A0A0A] z-20 h-10">
                <div className="flex items-center gap-2">
                    <Terminal size={12} className="text-[#666]" />
                    <span className="text-[10px] items-center font-bold tracking-[0.2em] text-[#666] uppercase">Neural Link Established</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 bg-[#00FF94] rounded-full ${isLoading ? 'animate-pulse' : ''}`}></span>
                    <span className="text-[10px] text-[#00FF94] font-mono">ONLINE</span>
                </div>
            </div>

            {/* Transcript Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto custom-scrollbar mt-8 mb-6 space-y-6 pr-4"
            >
                {messages.length === 0 && (
                    <div className="text-center mt-10 opacity-30">
                        <div className="text-6xl text-[#333] mb-4 font-serif">?</div>
                        <p className="font-mono text-xs uppercase tracking-widest text-[#666]">System Awaiting Input</p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {/* Avatar / Icon */}
                        {msg.role === 'assistant' && (
                            <div className="mr-4 mt-1 flex-shrink-0">
                                <div className="w-8 h-8 bg-[#111] border border-[#333] flex items-center justify-center">
                                    <Zap size={14} className="text-[#00FF94]" />
                                </div>
                            </div>
                        )}

                        <div
                            className={`max-w-[85%] md:max-w-[70%] p-4 border transition-all ${msg.role === 'user'
                                    ? 'bg-[#111] border-[#333] text-[#E0E0E0]'
                                    : 'bg-transparent border-[#00FF94]/20 text-[#E0E0E0] shadow-[0_0_10px_rgba(0,255,148,0.05)]'
                                }`}
                        >
                            {msg.role === 'assistant' && (
                                <div className="flex items-center gap-2 mb-2 border-b border-[#00FF94]/10 pb-2">
                                    <span className="text-[10px] font-mono text-[#00FF94] uppercase tracking-wider">
                                        System::Coach
                                    </span>
                                    <span className="text-[10px] text-[#666] font-mono">{msg.timestamp?.split('T')[1]?.split('.')[0]}</span>
                                </div>
                            )}

                            <div className={`text-sm md:text-base leading-relaxed ${msg.role === 'assistant' ? 'font-serif' : 'font-mono'}`}>
                                {msg.content}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Loading Indicator */}
                {isLoading && (
                    <div className="flex justify-start ml-12">
                        <div className="flex items-center gap-2 text-[#00FF94] font-mono text-xs">
                            <span className="animate-blink">_processing_data_stream</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Controls */}
            <div className="flex items-end gap-0 border border-[#333] bg-[#050505] p-0 shadow-[4px_4px_0px_0px_#111]">
                {/* Voice Toggle */}
                <button
                    onClick={toggleListening}
                    className={`h-14 w-14 flex items-center justify-center border-r border-[#333] transition-colors ${isListening
                            ? 'bg-[#FF0055] text-black hover:bg-[#FF0055]/90'
                            : 'bg-transparent text-[#666] hover:text-[#00FF94] hover:bg-[#111]'
                        }`}
                    title="Toggle Voice Mode"
                >
                    {isListening ? <Square size={20} /> : <Mic size={20} />}
                </button>

                {/* Text Input */}
                <form onSubmit={handleSubmit} className="flex-1 flex relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-[#00FF94] font-bold font-mono">{`>`}</span>
                    </div>
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={isListening ? "Listening..." : "Enter command or message..."}
                        className="w-full bg-transparent border-none text-[#E0E0E0] px-4 pl-8 py-4 font-mono text-sm focus:outline-none focus:bg-[#111] transition-colors placeholder:text-[#444]"
                        disabled={isLoading}
                    />
                </form>

                {/* Send Button */}
                <button
                    onClick={handleSubmit}
                    disabled={!inputText.trim() || isLoading}
                    className="h-14 w-14 flex items-center justify-center border-l border-[#333] hover:bg-[#00FF94] hover:text-black hover:font-bold transition-all text-[#666] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#666]"
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
};

export default CoachFooter;
