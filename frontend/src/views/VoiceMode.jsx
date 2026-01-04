import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import NegotiationInterface from '../components/voice/NegotiationInterface';

const VoiceMode = () => {
    const navigate = useNavigate();

    return (
        <div className="h-screen flex flex-col bg-canvas overflow-hidden">
            {/* Header */}
            <header className="h-14 border-b border-zinc-800 flex items-center px-4">
                <button
                    onClick={() => navigate('/nav')}
                    className="flex items-center gap-2 text-[#888] hover:text-[#00FF94] transition-colors mr-3"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <h1 className="font-serif text-ink font-bold tracking-tight">VOICE MODE</h1>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <NegotiationInterface />
            </main>
        </div>
    );
};

export default VoiceMode;
