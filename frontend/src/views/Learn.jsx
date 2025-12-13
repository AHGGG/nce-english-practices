import React from 'react';
import { useGlobalState } from '../context/GlobalContext';
import VocabGrid from '../components/Learn/VocabGrid';
import StoryReader from '../components/Learn/StoryReader';

const Learn = () => {
    const { state, actions } = useGlobalState();
    const { vocab, stories, topic, currentLayer } = state;

    const currentStory = stories[`${topic}_${currentLayer}`];

    return (
        <section className="flex flex-col h-full w-full bg-bg overflow-hidden">
            <header className="flex-none flex items-center justify-between px-6 py-4 border-b border-ink-faint bg-bg sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-neon-green"></div>
                    <h2 className="text-xl font-serif font-bold text-ink">
                        Context & Vocabulary
                    </h2>
                </div>
                {/* Refresh button could go here */}
            </header>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth pb-24 md:pb-8">
                {!topic && (
                    <div className="text-center text-ink-muted mt-20 font-mono">
                        {`> Waiting for Topic Initialization...`}
                    </div>
                )}

                {vocab && <VocabGrid vocab={vocab} />}
                {currentStory && <StoryReader story={currentStory} />}
            </div>
        </section>
    );
};

export default Learn;
