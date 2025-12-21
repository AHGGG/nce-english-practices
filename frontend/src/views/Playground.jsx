import React, { useState, useEffect } from 'react';
import { AUIHydrator } from '../components/aui/AUIHydrator';

const Playground = () => {
    const [intent, setIntent] = useState('show_vocabulary');
    const [level, setLevel] = useState(1);
    const [jsonData, setJsonData] = useState('{\n  "words": ["serendipity", "ephemeral", "petrichor"]\n}');
    const [responsePacket, setResponsePacket] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleRender = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/aui/debug/render', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    intent,
                    user_level: parseInt(level),
                    data: JSON.parse(jsonData)
                })
            });
            const packet = await res.json();
            setResponsePacket(packet);
        } catch (err) {
            console.error(err);
            alert('Error rendering: ' + err.message);
        } finally {
            setLoading(false);
        }
    };


    // Auto-render when level or intent changes
    useEffect(() => {
        handleRender();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [level, intent]);


    return (
        <div className="min-h-screen bg-[#050505] text-[#E0E0E0] p-8 font-mono flex gap-8">
            {/* Control Panel */}
            <div className="w-1/3 space-y-6">
                <header className="mb-8 border-b border-[#333] pb-4">
                    <h1 className="text-2xl font-serif font-bold text-white">AUI Playground</h1>
                    <p className="text-xs text-[#666] mt-2">Agent-to-UI Rendering Testbed</p>
                </header>

                <div>
                    <label className="block text-xs uppercase text-[#666] mb-2">My Level (i)</label>
                    <div className="flex bg-[#111] rounded p-1 border border-[#333]">
                        {[1, 2, 3].map(l => (
                            <button
                                key={l}
                                onClick={() => setLevel(l)}
                                className={`flex-1 py-1 text-sm rounded ${level === l ? 'bg-[#00FF94] text-black font-bold' : 'text-[#888] hover:text-white'}`}
                            >
                                Level {l}
                            </button>
                        ))}
                    </div>
                </div>


                <div>
                    <label className="block text-xs uppercase text-[#666] mb-2">Intent</label>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { id: 'show_vocabulary', label: 'Vocabulary', icon: '📚' },
                            { id: 'present_story', label: 'Story', icon: '📖' },
                            { id: 'explain_grammar', label: 'Grammar', icon: '⚡' },
                            { id: 'explain_correction', label: 'Correction', icon: '✏️' }
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setIntent(item.id);
                                    // Auto-populate data payload
                                    if (item.id === 'show_vocabulary') {
                                        setJsonData('{\n  "words": ["serendipity", "ephemeral", "petrichor"]\n}');
                                    } else if (item.id === 'explain_correction') {
                                        setJsonData('{\n  "original": "I go to store yesterday.",\n  "corrected": "I went to the store yesterday.",\n  "explanation": "Use Past Simple for finished actions."\n}');
                                    } else if (item.id === 'present_story') {
                                        setJsonData('{\n  "title": "A Day at the Market",\n  "content": "Yesterday, I **went** to the local market. The atmosphere was vibrant and full of energy. Vendors were *calling out* their prices. I **have visited** this market many times before.",\n  "highlights": ["went", "calling out", "have visited"],\n  "grammar_notes": ["Past Simple: went (finished action)", "Past Continuous: were calling (background action)", "Present Perfect: have visited (experience)"]\n}');
                                    } else if (item.id === 'explain_grammar') {
                                        setJsonData('{\n  "tense": "Present Perfect"\n}');
                                    }
                                }}
                                className={`p-3 text-left rounded border transition-all ${intent === item.id
                                    ? 'bg-[#00FF94] text-black border-[#00FF94] font-bold'
                                    : 'bg-[#111] text-[#888] border-[#333] hover:border-[#555] hover:text-white'
                                    }`}
                            >
                                <div className="text-lg mb-1">{item.icon}</div>
                                <div className="text-xs">{item.label}</div>
                            </button>
                        ))}
                    </div>
                </div>


                <div>
                    <label className="block text-xs uppercase text-[#666] mb-2">Data Payload (JSON)</label>
                    <textarea
                        value={jsonData}
                        onChange={(e) => setJsonData(e.target.value)}
                        className="w-full h-40 bg-[#111] border border-[#333] text-[#00FF94] p-3 text-xs font-mono rounded outline-none focus:border-[#00FF94]"
                    />
                </div>

                <button
                    onClick={handleRender}
                    disabled={loading}
                    className="w-full bg-[#00FF94] text-black font-bold py-3 rounded hover:bg-[#00CC76] transition shadow-[0_0_15px_rgba(0,255,148,0.2)] disabled:opacity-50"
                >
                    {loading ? 'RENDERING...' : 'RENDER UI'}
                </button>

                {responsePacket && (
                    <div className="mt-8">
                        <label className="block text-xs uppercase text-[#666] mb-2">Protocol Trace</label>
                        <pre className="bg-black border border-[#333] p-3 text-[10px] text-[#888] overflow-auto max-h-60 rounded">
                            {JSON.stringify(responsePacket, null, 2)}
                        </pre>
                    </div>
                )}
            </div>

            {/* Viewport */}
            <div className="flex-1 bg-[#111] border border-[#333] rounded-lg relative overflow-hidden flex flex-col">
                <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#0A0A0A]">
                    <span className="text-xs uppercase tracking-widest text-[#666]">Render Output</span>
                    <div className="flex gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#FF5F57]"></span>
                        <span className="w-2 h-2 rounded-full bg-[#FEBC2E]"></span>
                        <span className="w-2 h-2 rounded-full bg-[#28C840]"></span>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1a1a1a] to-[#0A0A0A]">
                    {responsePacket ? (
                        <div className="w-full max-w-2xl">
                            <AUIHydrator packet={responsePacket} onInteract={(d) => console.log(d)} />
                        </div>
                    ) : (
                        <div className="text-[#333] text-center">
                            <p className="text-4xl opacity-20 font-serif">AWAITING SIGNAL</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Playground;
