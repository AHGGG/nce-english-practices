import React from 'react';
import { useGlobalState } from '../context/GlobalContext';
import VocabGrid from '../components/Learn/VocabGrid';
import StoryReader from '../components/Learn/StoryReader';

const Learn = () => {
    const { state, actions } = useGlobalState();
    const { vocab, stories, topic, currentLayer } = state;

    const currentStory = stories[`${topic}_${currentLayer}`];

    return (
        <section className="flex flex-col h-full w-full bg-[#0f172a] overflow-hidden">
            <header className="flex-none flex items-center justify-between px-4 py-3 md:px-8 md:py-6 border-b border-white/5 bg-[#0f172a]/50 backdrop-blur-md sticky top-0 z-10">
                <h2 className="text-lg md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-400">
                    Context & Vocabulary
                </h2>
                {/* Refresh button could go here */}
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth pb-24 md:pb-8">
                {!topic && (
                    <div className="text-center text-slate-500 mt-20">
                        Please enter a topic in the sidebar to start.
                    </div>
                )}

                {vocab && <VocabGrid vocab={vocab} />}
                {currentStory && <StoryReader story={currentStory} />}
            </div>
        </section>
    );
};

export default Learn;
