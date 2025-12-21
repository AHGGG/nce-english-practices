/**
 * AUI Component Registry - Test Page
 * Demonstrates SSE streaming with AUIStreamHydrator
 */

import React, { useState } from 'react';
import AUIStreamHydrator from '../components/aui/AUIStreamHydrator';

const AUIStreamingDemo = () => {
    const [streamUrl, setStreamUrl] = useState('');
    const [testStory, setTestStory] = useState(
        'Once upon a time, in a small village, there lived a curious young girl named Emma. ' +
        'She loved exploring the nearby forest, where she would often discover hidden treasures. ' +
        'One day, while wandering through the woods, she stumbled upon a mysterious old book.'
    );
    const [testWords, setTestWords] = useState('explore,discover,mysterious,treasure,curious');
    const [userLevel, setUserLevel] = useState(1);

    const handleStreamStory = () => {
        const encodedContent = encodeURIComponent(testStory);
        // Use relative path - Vite proxy will handle HTTPS
        const url = `/aui/stream/story?content=${encodedContent}&title=Test Story&user_level=${userLevel}&chunk_size=3`;
        setStreamUrl(url);
    };

    const handleStreamVocab = () => {
        // Use relative path - Vite proxy will handle HTTPS
        const url = `/aui/stream/vocabulary?words=${testWords}&user_level=${userLevel}`;
        setStreamUrl(url);
    };

    const handleReset = () => {
        setStreamUrl('');
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="font-serif text-3xl mb-2">AUI Streaming Demo</h1>
                    <p className="text-[#666] font-mono text-sm">
                        Test SSE-based streaming with AG-UI compatible events
                    </p>
                </div>

                {/* Controls */}
                <div className="bg-[#111] border border-[#222] rounded-xl p-6 mb-8">
                    <h2 className="font-mono text-sm text-neon-cyan mb-4">STREAM CONTROLS</h2>

                    {/* User Level Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-mono mb-2 text-[#999]">
                            User Level (Scaffolding):
                        </label>
                        <div className="flex gap-2">
                            {[1, 2, 3].map(level => (
                                <button
                                    key={level}
                                    onClick={() => setUserLevel(level)}
                                    className={`px-4 py-2 rounded border font-mono text-sm ${userLevel === level
                                        ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan'
                                        : 'bg-[#0A0A0A] border-[#333] text-[#666] hover:border-[#555]'
                                        }`}
                                >
                                    L{level} {level === 1 ? 'Beginner' : level === 2 ? 'Intermediate' : 'Advanced'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Story Test */}
                    <div className="mb-6">
                        <label className="block text-sm font-mono mb-2 text-[#999]">
                            Test Story Content:
                        </label>
                        <textarea
                            value={testStory}
                            onChange={(e) => setTestStory(e.target.value)}
                            className="w-full bg-[#0A0A0A] border border-[#333] rounded px-3 py-2 font-mono text-sm text-white focus:border-neon-cyan focus:outline-none"
                            rows={4}
                        />
                        <button
                            onClick={handleStreamStory}
                            className="mt-2 px-4 py-2 bg-neon-cyan/10 border border-neon-cyan hover:bg-neon-cyan/20 rounded font-mono text-sm text-neon-cyan transition-colors"
                        >
                            Stream Story (SSE)
                        </button>
                    </div>

                    {/* Vocabulary Test */}
                    <div className="mb-6">
                        <label className="block text-sm font-mono mb-2 text-[#999]">
                            Test Vocabulary (comma-separated):
                        </label>
                        <input
                            type="text"
                            value={testWords}
                            onChange={(e) => setTestWords(e.target.value)}
                            className="w-full bg-[#0A0A0A] border border-[#333] rounded px-3 py-2 font-mono text-sm text-white focus:border-neon-cyan focus:outline-none"
                        />
                        <button
                            onClick={handleStreamVocab}
                            className="mt-2 px-4 py-2 bg-neon-pink/10 border border-neon-pink hover:bg-neon-pink/20 rounded font-mono text-sm text-neon-pink transition-colors"
                        >
                            Stream Vocabulary (SSE)
                        </button>
                    </div>

                    {/* Reset */}
                    {streamUrl && (
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 bg-[#222] border border-[#444] hover:bg-[#333] rounded font-mono text-sm text-white transition-colors"
                        >
                            Reset Stream
                        </button>
                    )}
                </div>

                {/* Stream Display */}
                <div className="bg-[#111] border border-[#222] rounded-xl p-6">
                    <h2 className="font-mono text-sm text-neon-green mb-4">STREAM OUTPUT</h2>

                    {streamUrl ? (
                        <AUIStreamHydrator
                            streamUrl={streamUrl}
                            onError={(err) => console.error('Stream error:', err)}
                            onComplete={() => console.log('Stream completed')}
                        />
                    ) : (
                        <div className="text-center text-[#666] font-mono text-sm py-8">
                            Select a test above to start streaming
                        </div>
                    )}
                </div>

                {/* Event Log */}
                <div className="mt-4 text-[#666] font-mono text-xs">
                    <strong>Current Stream URL:</strong> {streamUrl || 'None'}
                </div>
            </div>
        </div>
    );
};

export default AUIStreamingDemo;
