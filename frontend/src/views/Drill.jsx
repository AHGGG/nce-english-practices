import React, { useEffect, useState } from 'react';
import { useGlobalState } from '../context/GlobalContext';
import { fetchSentences } from '../api/client';
import MatrixGrid from '../components/Drill/MatrixGrid';
import TenseTabs from '../components/Drill/TenseTabs';
import QuizModal from '../components/Drill/QuizModal';
import EmptyState from '../components/Layout/EmptyState';

const Drill = () => {
    const { state, actions } = useGlobalState();
    const { topic, vocab, sentences, currentLayer } = state;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Quiz State
    const [quizState, setQuizState] = useState({
        isOpen: false,
        aspect: null,
        sentence: null
    });

    useEffect(() => {
        // If topic exists but sentences for this layer don't, fetch them.
        // Also need vocab to be present.
        if (topic && vocab && !sentences[currentLayer]) {
            const loadLayer = async () => {
                setLoading(true);
                setError(null);
                try {
                    const v = vocab.verbs && vocab.verbs[0];
                    // Construct payload similar to legacy drill.js
                    const payload = {
                        topic,
                        time_layer: currentLayer,
                        subject: (vocab.slots.subject || [])[0] || "I",
                        verb_base: v ? v.base : "study",
                        verb_past: v ? v.past : "studied",
                        verb_participle: v ? v.participle : "studied",
                        object: (vocab.slots.object || [])[0] || "",
                        manner: (vocab.slots.manner || [])[0] || "",
                        place: (vocab.slots.place || [])[0] || "",
                        time: (vocab.slots.time || [])[0] || ""
                    };

                    const data = await fetchSentences(payload);
                    actions.cacheSentences(currentLayer, data);
                } catch (err) {
                    setError(err.message || "Failed to load sentences");
                } finally {
                    setLoading(false);
                }
            };
            loadLayer();
        }
    }, [topic, vocab, currentLayer, sentences, actions]);

    const handleCellClick = (e, aspect, text) => {
        if (e.shiftKey) {
            navigator.clipboard.writeText(text);
            // Toast?
        } else {
            setQuizState({ isOpen: true, aspect, sentence: text });
        }
    };

    const closeQuiz = () => setQuizState(prev => ({ ...prev, isOpen: false }));

    const currentData = sentences[currentLayer];

    if (!topic) return <EmptyState />;

    return (
        <section className="flex flex-col h-full w-full bg-bg overflow-hidden">
            <header className="flex-none flex flex-col md:flex-row md:items-center justify-between px-6 py-4 border-b border-ink-faint bg-bg sticky top-0 z-10 gap-3 md:gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-neon-pink"></div>
                    <h2 className="text-xl font-serif font-bold text-ink">
                        Tense Matrix Drill
                    </h2>
                </div>
                <TenseTabs currentLayer={currentLayer} onChange={actions.setLayer} />
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 text-neon-green font-mono animate-pulse">
                        {`>> GENERATING NEURAL MATRIX... <<`}
                    </div>
                )}

                {error && <div className="text-center text-neon-pink py-8 font-mono border border-neon-pink/20 bg-neon-pink/5 mx-auto max-w-lg">{`[ERROR]: ${error}`}</div>}

                {currentData && <MatrixGrid data={currentData} onCellClick={handleCellClick} />}
            </div>

            <QuizModal
                isOpen={quizState.isOpen}
                onClose={closeQuiz}
                topic={topic}
                layer={currentLayer}
                aspect={quizState.aspect}
                sentence={quizState.sentence}
            />
        </section>
    );
};

export default Drill;
