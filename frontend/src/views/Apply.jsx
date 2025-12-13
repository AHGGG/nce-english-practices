import React, { useState } from 'react';
import { useGlobalState } from '../context/GlobalContext';
import ScenarioCard from '../components/Apply/ScenarioCard';
import ChatCard from '../components/Apply/ChatCard';

const Apply = () => {
    const { state } = useGlobalState();
    const { topic, scenarios, chats, currentLayer } = state;
    const [activeTab, setActiveTab] = useState('scenario'); // 'scenario' or 'chat'

    const chatKey = `${topic}_simple`;
    const chatSession = chats[chatKey];
    const currentScenario = scenarios[`${topic}_${currentLayer}`];

    console.log("Apply Debug:", {
        topic,
        currentLayer,
        scenarioKey: `${topic}_${currentLayer}`,
        scenariosKeys: Object.keys(scenarios),
        scenarioData: currentScenario
    });

    return (
        <section className="flex flex-col h-full w-full bg-bg overflow-hidden">
            <header className="flex-none flex flex-wrap items-center gap-2 md:gap-4 px-6 py-4 border-b border-ink-faint bg-bg sticky top-0 z-10">
                <div className="flex items-center gap-2 mr-auto">
                    <div className="w-1 h-6 bg-neon-cyan"></div>
                    <h2 className="text-xl font-serif font-bold text-ink">
                        Application
                    </h2>
                </div>

                <div className="flex p-1 bg-bg-elevated border-b border-ink-faint">
                    <button
                        onClick={() => setActiveTab('scenario')}
                        className={`px-4 py-2 text-sm font-mono uppercase tracking-wider transition-all focus:outline-none border-b-2 mx-1 ${activeTab === 'scenario'
                            ? 'border-neon-cyan text-neon-cyan font-bold bg-neon-cyan/5'
                            : 'border-transparent text-ink-muted hover:text-ink hover:bg-white/5'}`}
                    >
                        Challenge
                    </button>
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`px-4 py-2 text-sm font-mono uppercase tracking-wider transition-all focus:outline-none border-b-2 mx-1 ${activeTab === 'chat'
                            ? 'border-neon-pink text-neon-pink font-bold bg-neon-pink/5'
                            : 'border-transparent text-ink-muted hover:text-ink hover:bg-white/5'}`}
                    >
                        Roleplay
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-hidden relative w-full h-full pb-[calc(65px+env(safe-area-inset-bottom))] md:pb-0">
                <div className="w-full h-full p-6 md:p-8 overflow-y-auto scroll-smooth">
                    {!topic ? (
                        <div className="text-center text-ink-muted mt-20 font-mono">
                            {`> Waiting for Topic Initialization...`}
                        </div>
                    ) : (
                        <>
                            {activeTab === 'scenario' && (
                                currentScenario ? (
                                    <ScenarioCard scenario={currentScenario} layer={currentLayer} />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 font-mono gap-4">
                                        <div className="w-12 h-12 border-4 border-ink-faint border-t-neon-cyan rounded-none animate-spin"></div>
                                        <div className="text-neon-cyan tracking-widest animate-pulse">GENERATING SCENARIO MATRIX...</div>
                                    </div>
                                )
                            )}
                            {activeTab === 'chat' && (
                                chatSession ? (
                                    <ChatCard chatSession={chatSession} topic={topic} layer={currentLayer} />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 font-mono gap-4">
                                        <div className="w-12 h-12 border-4 border-ink-faint border-t-neon-pink rounded-none animate-spin"></div>
                                        <div className="text-neon-pink tracking-widest animate-pulse">ESTABLISHING NEURAL LINK...</div>
                                    </div>
                                )
                            )}
                        </>
                    )}
                </div>
            </div>
        </section>
    );
};

export default Apply;
