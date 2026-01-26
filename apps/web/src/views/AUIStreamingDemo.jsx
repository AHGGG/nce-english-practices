/**
 * AUI Streaming Demo - Test Page
 * Demonstrates SSE and WebSocket streaming with extended AUI events
 * Layout inspired by Playground page
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import AUIStreamHydrator from '../components/aui/AUIStreamHydrator';
import { authFetch } from '../api/auth';

const AUIStreamingDemo = () => {
    const navigate = useNavigate();
    const [streamUrl, setStreamUrl] = useState('');
    const [selectedDemo, setSelectedDemo] = useState('');
    const [books, setBooks] = useState([]);
    const [selectedBook, setSelectedBook] = useState('');

    // Fetch books on mount
    React.useEffect(() => {
        const fetchBooks = async () => {
            try {
                const res = await authFetch('/api/books/');
                if (res.ok) {
                    const data = await res.json();
                    setBooks(data);
                    if (data.length > 0) setSelectedBook(data[0].code);
                }
            } catch (err) {
                console.error("Failed to fetch books", err);
            }
        };
        fetchBooks();
    }, []);

    // Demo configurations
    const demos = [
        {
            id: 'book-practice',
            label: 'Book Practice',
            icon: '📖',
            description: 'Practice words from selected book',
            getUrl: () => `/api/aui/stream/contexts?book=${selectedBook}&user_level=1`
        },
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
            getUrl: () => '/api/aui/stream/vocab-patch?level=1'
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
        <div className="min-h-screen bg-bg-base text-text-primary p-4 md:p-8 font-mono flex flex-col md:flex-row gap-8">
            {/* Control Panel */}
            <div className="w-full md:w-1/3 space-y-6">
                <header className="mb-4 md:mb-8 border-b border-border pb-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/nav')}
                            className="text-text-secondary hover:text-accent-primary transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-xl md:text-2xl font-serif font-bold text-text-primary">AUI Streaming Demo</h1>
                    </div>
                    <p className="text-xs text-text-muted mt-2">Event Streaming Testbed with Transport Selection</p>
                </header>

                {/* Transport Layer Indicator */}
                <div>
                    <p className="text-[10px] text-text-muted mt-2">
                        Using WebSocket (bidirectional)
                    </p>
                </div>

                {/* Book Selector */}
                {books.length > 0 && (
                    <div className="bg-bg-elevated p-3 rounded border border-border">
                        <label className="block text-xs uppercase text-text-muted mb-2">Select Word Book</label>
                        <select
                            value={selectedBook}
                            onChange={(e) => setSelectedBook(e.target.value)}
                            className="w-full bg-bg-elevated border border-border text-text-primary p-2 rounded text-sm"
                        >
                            {books.map(book => (
                                <option key={book.code} value={book.code}>
                                    {book.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Demo Selection Grid */}
                <div>
                    <label className="block text-xs uppercase text-text-muted mb-3">Select Demo</label>
                    <div className="grid grid-cols-2 gap-2">
                        {demos.map(demo => (
                            <button
                                key={demo.id}
                                onClick={() => handleSelectDemo(demo)}
                                className={`p-4 md:p-3 text-left rounded border transition-all active:scale-95 ${selectedDemo === demo.id
                                    ? 'bg-accent-primary text-text-inverse border-accent-primary font-bold'
                                    : 'bg-bg-elevated text-text-secondary border-border hover:border-text-muted hover:text-text-primary'
                                    }`}
                            >
                                <div className="text-xl md:text-lg mb-1">{demo.icon}</div>
                                <div className="text-sm md:text-xs font-bold">{demo.label}</div>
                                <div className="text-[10px] opacity-60 mt-1 hidden md:block">{demo.description}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Controls */}
                <div className="space-y-3">
                    {streamUrl && (
                        <button
                            onClick={handleReset}
                            className="w-full bg-bg-elevated text-text-primary border border-border py-2 rounded hover:bg-border transition text-sm"
                        >
                            RESET STREAM
                        </button>
                    )}
                </div>

                {/* Current Stream Info */}
                {streamUrl && (
                    <div className="mt-8">
                        <label className="block text-xs uppercase text-text-muted mb-2">Active Stream</label>
                        <div className="bg-bg-surface border border-border p-3 rounded space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-neon-purple/20 text-neon-purple border border-neon-purple/30">
                                    🔌 WS
                                </span>
                                <span className="text-[10px] text-text-muted">{selectedDemo}</span>
                            </div>
                            <div className="text-[10px] text-accent-primary break-all font-mono">
                                {streamUrl}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Viewport */}
            <div className="w-full md:flex-1 bg-bg-elevated border border-border rounded-lg relative overflow-hidden flex flex-col h-[60vh] md:h-auto">
                <div className="p-4 border-b border-border flex justify-between items-center bg-bg-surface">
                    <span className="text-xs uppercase tracking-widest text-text-muted">Stream Output</span>
                    <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase bg-neon-purple/20 text-neon-purple">
                            WEBSOCKET
                        </span>
                        <div className="flex gap-2">
                            <span className="w-2 h-2 rounded-full bg-accent-danger"></span>
                            <span className="w-2 h-2 rounded-full bg-accent-warning"></span>
                            <span className="w-2 h-2 rounded-full bg-accent-primary"></span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-bg-elevated to-bg-surface">
                    <div className="min-h-full w-full p-4 md:p-8 flex items-center justify-center">
                        {streamUrl ? (
                            <div className="w-full max-w-2xl">
                                <AUIStreamHydrator
                                    streamUrl={streamUrl}
                                    key={streamUrl}
                                    onError={(err) => console.error('Stream error:', err)}
                                    onComplete={() => console.log('Stream completed')}
                                />
                            </div>
                        ) : (
                            <div className="text-border text-center">
                                <p className="text-4xl opacity-20 font-serif">AWAITING SIGNAL</p>
                                <p className="text-xs opacity-10 mt-4">Select a demo to start streaming</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AUIStreamingDemo;

