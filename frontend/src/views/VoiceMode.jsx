import React from 'react';
import NegotiationInterface from '../components/voice/NegotiationInterface';

const VoiceMode = () => {
    return (
        <div className="h-screen flex flex-col bg-canvas overflow-hidden">
            {/* Header */}
            <header className="h-14 border-b border-zinc-800 flex items-center px-4 justify-center">
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
