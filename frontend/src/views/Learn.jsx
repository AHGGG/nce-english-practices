import React, { useEffect } from 'react';
import { useGlobalState } from '../context/GlobalContext';
import { fetchStory, fetchStoryStream } from '../api/client';
import VocabGrid from '../components/Learn/VocabGrid';
import StoryReader from '../components/Learn/StoryReader';
import EmptyState from '../components/Layout/EmptyState';

const Learn = () => {
    const { state, actions } = useGlobalState();
    const { vocab, stories, topic, isLoading, currentLayer, loadingLayers } = state;

    // Use currentLayer for story to match the specific tense being studied
    const storyKey = `${topic}_${currentLayer}`;
    const currentStory = stories[storyKey];

    const [isScrolled, setIsScrolled] = React.useState(false);

    const [partialStory, setPartialStory] = React.useState(null);

    useEffect(() => {
        if (!topic) return;

        // Lazy load story for the current layer if missing
        if (!currentStory && !loadingLayers.has(storyKey) && !partialStory) {
            const loadStory = async () => {
                actions.addLoadingLayer(storyKey);
                setPartialStory({ title: '', content: '', target_tense: currentLayer }); // Initialize placeholder

                try {
                    console.log(`Fetching story stream for ${storyKey}...`);
                    await fetchStoryStream(
                        topic,
                        currentLayer,
                        (chunk) => {
                            setPartialStory(prev => ({
                                ...prev,
                                content: (prev?.content || "") + chunk
                            }));
                        },
                        (finalStory) => {
                            if (finalStory) {
                                actions.cacheStory(storyKey, finalStory);
                            }
                            setPartialStory(null);
                        }
                    );
                } catch (e) {
                    console.error(`Failed to load story for ${currentLayer}`, e);
                    setPartialStory(null);
                } finally {
                    actions.removeLoadingLayer(storyKey);
                }
            };
            loadStory();
        }
    }, [topic, currentLayer, currentStory, loadingLayers, actions, storyKey]);

    const handleScroll = (e) => {
        const scrollTop = e.target.scrollTop;
        if (scrollTop > 10 && !isScrolled) {
            setIsScrolled(true);
        } else if (scrollTop <= 10 && isScrolled) {
            setIsScrolled(false);
        }
    };

    // Show loading state when loading a new theme (initial load)
    // For subsequent layer switches, we might want a different loading indicator or just skeleton
    // But keeping it simple for now: if global isLoading is true, show full screen loader.
    if (isLoading && !vocab) {
        return (
            <section className="flex flex-col h-full w-full bg-bg overflow-hidden items-center justify-center">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <div className="w-12 h-12 border-2 border-neon-green border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-neon-green font-mono text-sm">{`>> INITIALIZING NEURAL CORE... <<`}</p>
                </div>
            </section>
        );
    }

    if (!topic) return <EmptyState />;

    return (
        <section className="flex flex-col h-full w-full bg-bg overflow-hidden">
            <header className="flex-none flex items-center justify-between px-6 py-4 border-b border-ink-faint bg-bg sticky top-0 z-10 transition-all duration-300">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-neon-green"></div>
                    <h2 className="text-xl font-serif font-bold text-ink">
                        Context & Vocabulary
                    </h2>
                </div>
                {/* Refresh button could go here */}
            </header>

            <div
                className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth pb-24 md:pb-8"
                onScroll={handleScroll}
            >
                {vocab && <VocabGrid vocab={vocab} isCollapsed={isScrolled} />}
                {currentStory || partialStory ? (
                    <StoryReader story={currentStory || partialStory} />
                ) : (
                    loadingLayers.has(storyKey) && (
                        <div className="py-12 flex justify-center">
                            <div className="w-8 h-8 border-2 border-neon-green border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )
                )}
            </div>
        </section>
    );
};

export default Learn;
