/**
 * AUI Streaming Demo - Test Page
 * Demonstrates SSE and WebSocket streaming with extended AUI events
 * Layout inspired by Playground page
 */

import React, { useState } from 'react';
import AUIStreamHydrator from '../components/aui/AUIStreamHydrator';

const AUIStreamingDemo = () => {
    const [streamUrl, setStreamUrl] = useState('');
    const [selectedDemo, setSelectedDemo] = useState('');
    const [transport, setTransport] = useState('sse'); // 'sse' | 'websocket'

    // Demo configurations
    const demos = [
        {
            id: 'story',
            label: 'Story Stream',
            icon: '📖',
            description: 'Incremental text streaming',
            getUrl: () => '/api/aui/stream/story?content=' + encodeURIComponent('Once upon a time, in a small village, there lived a curious young girl named Emma. She loved exploring the nearby forest.') + '&title=Test Story&user_level=1&chunk_size=3'
        },
        {
            id: 'vocab',
            label: 'Vocabulary',
            icon: '📚',
            description: 'Vocabulary cards',
            getUrl: () => '/api/aui/stream/vocabulary?words=explore,discover,mysterious,treasure,curious&user_level=1'
        },
        {
            id: 'state-sync',
            label: 'State Sync',
            icon: '🔄',
            description: 'JSON Patch updates',
            getUrl: () => '/api/aui/stream/state-demo'
        },
        {
            id: 'vocab-patch',
            label: 'Vocab Patch',
            icon: '🃏',
            description: 'Card flip animation',
            getUrl: () => '/api/aui/stream/vocab-patch-demo?level=1'
        },
        {
            id: 'state-snapshot',
            label: 'State Snapshot',
            icon: '📸',
            description: 'Snapshot + Delta pattern',
            getUrl: () => '/api/aui/demo/stream/state-snapshot?title=Demo%20Story&level=1'
        },
        {
            id: 'activity',
            label: 'Activity Progress',
            icon: '🎯',
            description: 'Multi-step task progress',
            getUrl: () => '/api/aui/demo/stream/activity?task=Test%20Data%20Processing&steps=5'
        },
        {
            id: 'tool-call',
            label: 'Tool Call',
            icon: '🔧',
            description: 'Tool execution lifecycle',
            getUrl: () => '/api/aui/demo/stream/tool-call?tool=search_vocabulary&query=example'
        },
        {
            id: 'agent-success',
            label: 'Agent Run ✅',
            icon: '✅',
            description: 'Successful agent run',
            getUrl: () => '/api/aui/demo/stream/agent-run?task=Generate%20Test%20Story&fail=false'
        },
        {
            id: 'agent-error',
            label: 'Agent Run ❌',
            icon: '❌',
            description: 'Failed agent run',
            getUrl: () => '/api/aui/demo/stream/agent-run?task=Generate%20Test%20Story&fail=true'
        },
        {
            id: 'multi-messages',
            label: 'Multi Messages',
            icon: '💬',
            description: 'Concurrent text streams',
            getUrl: () => '/api/aui/demo/stream/multi-messages'
        },
        {
            id: 'interactive',
            label: 'Human Loop',
            icon: '🖱️',
            description: 'Pause & WaitFor Input',
            getUrl: () => '/api/aui/demo/stream/interactive'
        },
        {
            id: 'interrupt',
            label: 'Study Plan',
            icon: '📋',
            description: 'Coach asks for confirmation',
            getUrl: () => '/api/aui/demo/stream/interrupt?reason=confirmation_required&difficulty=intermediate'
        },
        {
            id: 'contexts',
            label: 'Context Resources',
            icon: '📝',
            description: 'Dictionary examples + TTS',
            getUrl: () => '/api/aui/stream/contexts?word=simmer&user_level=1'
        },
        {
            id: 'ldoce-dict',
            label: 'LDOCE Dictionary',
            icon: '📖',
            description: 'Structured LDOCE parsing',
            getUrl: () => '/api/aui/stream/ldoce-demo?word=simmer'
        }
    ];


    const handleSelectDemo = (demo) => {
        setSelectedDemo(demo.id);
        setStreamUrl(demo.getUrl());
    };

    const handleReset = () => {
        setSelectedDemo('');
        setStreamUrl('');
    };

    return (
        <div className="min-h-screen bg-[#050505] text-[#E0E0E0] p-8 font-mono flex gap-8">
            {/* Control Panel */}
            <div className="w-1/3 space-y-6">
                <header className="mb-8 border-b border-[#333] pb-4">
                    <h1 className="text-2xl font-serif font-bold text-white">AUI Streaming Demo</h1>
                    <p className="text-xs text-[#666] mt-2">Event Streaming Testbed with Transport Selection</p>
                </header>

                {/* Transport Layer Toggle */}
                <div>
                    <label className="block text-xs uppercase text-[#666] mb-3">Transport Layer</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setTransport('sse')}
                            className={`flex-1 py-3 px-4 rounded border transition-all flex items-center justify-center gap-2 ${transport === 'sse'
                                ? 'bg-blue-500/20 text-blue-400 border-blue-500 font-bold'
                                : 'bg-[#111] text-[#666] border-[#333] hover:border-[#555] hover:text-white'
                                }`}
                        >
                            <span>📡</span>
                            <span>SSE</span>
                            {transport === 'sse' && <span className="text-[10px] opacity-60">(EventSource)</span>}
                        </button>
                        <button
                            onClick={() => setTransport('websocket')}
                            className={`flex-1 py-3 px-4 rounded border transition-all flex items-center justify-center gap-2 ${transport === 'websocket'
                                ? 'bg-purple-500/20 text-purple-400 border-purple-500 font-bold'
                                : 'bg-[#111] text-[#666] border-[#333] hover:border-[#555] hover:text-white'
                                }`}
                        >
                            <span>🔌</span>
                            <span>WebSocket</span>
                            {transport === 'websocket' && <span className="text-[10px] opacity-60">(Bidirectional)</span>}
                        </button>
                    </div>
                    <p className="text-[10px] text-[#555] mt-2">
                        {transport === 'sse'
                            ? 'Using Server-Sent Events (unidirectional, auto-reconnect)'
                            : 'Using WebSocket (bidirectional, better for HITL demos)'}
                    </p>
                </div>

                {/* Demo Selection Grid */}
                <div>
                    <label className="block text-xs uppercase text-[#666] mb-3">Select Demo</label>
                    <div className="grid grid-cols-2 gap-2">
                        {demos.map(demo => (
                            <button
                                key={demo.id}
                                onClick={() => handleSelectDemo(demo)}
                                className={`p-3 text-left rounded border transition-all ${selectedDemo === demo.id
                                    ? 'bg-[#00FF94] text-black border-[#00FF94] font-bold'
                                    : 'bg-[#111] text-[#888] border-[#333] hover:border-[#555] hover:text-white'
                                    }`}
                            >
                                <div className="text-lg mb-1">{demo.icon}</div>
                                <div className="text-xs font-bold">{demo.label}</div>
                                <div className="text-[10px] opacity-60 mt-1">{demo.description}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Controls */}
                <div className="space-y-3">
                    {streamUrl && (
                        <button
                            onClick={handleReset}
                            className="w-full bg-[#222] text-white border border-[#444] py-2 rounded hover:bg-[#333] transition text-sm"
                        >
                            RESET STREAM
                        </button>
                    )}
                </div>

                {/* Current Stream Info */}
                {streamUrl && (
                    <div className="mt-8">
                        <label className="block text-xs uppercase text-[#666] mb-2">Active Stream</label>
                        <div className="bg-black border border-[#333] p-3 rounded space-y-2">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${transport === 'websocket'
                                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    }`}>
                                    {transport === 'websocket' ? '🔌 WS' : '📡 SSE'}
                                </span>
                                <span className="text-[10px] text-[#666]">{selectedDemo}</span>
                            </div>
                            <div className="text-[10px] text-[#00FF94] break-all font-mono">
                                {streamUrl}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Viewport */}
            <div className="flex-1 bg-[#111] border border-[#333] rounded-lg relative overflow-hidden flex flex-col">
                <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#0A0A0A]">
                    <span className="text-xs uppercase tracking-widest text-[#666]">Stream Output</span>
                    <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${transport === 'websocket'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-blue-500/20 text-blue-400'
                            }`}>
                            {transport.toUpperCase()}
                        </span>
                        <div className="flex gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#FF5F57]"></span>
                            <span className="w-2 h-2 rounded-full bg-[#FEBC2E]"></span>
                            <span className="w-2 h-2 rounded-full bg-[#28C840]"></span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1a1a1a] to-[#0A0A0A]">
                    {streamUrl ? (
                        <div className="w-full max-w-2xl">
                            <AUIStreamHydrator
                                streamUrl={streamUrl}
                                transport={transport}
                                key={`${streamUrl}-${transport}`}
                                onError={(err) => console.error('Stream error:', err)}
                                onComplete={() => console.log('Stream completed')}
                            />
                        </div>
                    ) : (
                        <div className="text-[#333] text-center">
                            <p className="text-4xl opacity-20 font-serif">AWAITING SIGNAL</p>
                            <p className="text-xs opacity-10 mt-4">Select a demo to start streaming</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AUIStreamingDemo;

