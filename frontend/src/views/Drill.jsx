import React, { useEffect, useState } from 'react';
import { useGlobalState } from '../context/GlobalContext';
import { fetchSentences } from '../api/client';
import MatrixGrid from '../components/Drill/MatrixGrid';
import TenseTabs from '../components/Drill/TenseTabs';
import QuizModal from '../components/Drill/QuizModal';

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

    return (
        <section className="flex flex-col h-full w-full bg-[#0f172a] overflow-hidden">
            <header className="flex-none flex flex-col md:flex-row md:items-center justify-between px-4 py-3 md:px-8 md:py-6 border-b border-white/5 bg-[#0f172a]/50 backdrop-blur-md sticky top-0 z-10 gap-3 md:gap-4">
                <h2 className="text-lg md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-400">
                    Tense Matrix Drill
                </h2>
                <TenseTabs currentLayer={currentLayer} onChange={actions.setLayer} />
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
                {!topic && (
                    <div className="text-center text-slate-500 mt-20">Please enter a topic first.</div>
                )}

                {loading && <div className="text-center text-sky-400 py-8">Generating sentences...</div>}
                {error && <div className="text-center text-red-400 py-8">{error}</div>}

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
