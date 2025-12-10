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
        <section className="flex flex-col h-full w-full bg-[#0f172a] overflow-hidden">
            <header className="flex-none flex flex-wrap items-center gap-2 md:gap-4 px-4 py-3 md:px-8 md:py-6 border-b border-white/5 bg-[#0f172a]/50 backdrop-blur-md sticky top-0 z-10">
                <h2 className="text-lg md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-400 mr-auto">
                    Application
                </h2>
                <div className="flex p-1 bg-[#0f172a] rounded-xl border border-white/10">
                    <button
                        onClick={() => setActiveTab('scenario')}
                        className={`px-6 py-1.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'scenario' ? 'bg-sky-400/10 text-sky-400' : 'text-slate-400 hover:text-white'}`}
                    >
                        Challenge
                    </button>
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`px-6 py-1.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'chat' ? 'bg-emerald-400/10 text-emerald-400' : 'text-slate-400 hover:text-white'}`}
                    >
                        Roleplay
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-hidden relative w-full h-full pb-[calc(65px+env(safe-area-inset-bottom))] md:pb-0">
                <div className="w-full h-full p-4 md:p-8 overflow-y-auto">
                    {!topic ? (
                        <div className="text-center text-slate-500 mt-20">Please enter a topic first.</div>
                    ) : (
                        <>
                            {activeTab === 'scenario' && (
                                currentScenario ? (
                                    <ScenarioCard scenario={currentScenario} layer={currentLayer} />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                        <div className="w-8 h-8 border-2 border-slate-600 border-t-sky-400 rounded-full animate-spin mb-4"></div>
                                        <p>Generaring Scenario...</p>
                                    </div>
                                )
                            )}
                            {activeTab === 'chat' && (
                                chatSession ? (
                                    <ChatCard chatSession={chatSession} topic={topic} layer={currentLayer} />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                        <div className="w-8 h-8 border-2 border-slate-600 border-t-emerald-400 rounded-full animate-spin mb-4"></div>
                                        <p>Preparing Mission...</p>
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
