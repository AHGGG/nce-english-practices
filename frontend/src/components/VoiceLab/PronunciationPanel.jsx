import React, { useState, useRef } from 'react';
import { Card, Button, Input, Tag } from '../ui';
import { Mic, Square, Play, Activity } from 'lucide-react';

const PronunciationPanel = ({ config }) => {
    const [referenceText, setReferenceText] = useState("The quick brown fox jumps over the lazy dog.");
    const [isRecording, setIsRecording] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(audioBlob);
                setAudioUrl(url);
                submitAssessment(audioBlob);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setResult(null);
            setError(null);
        } catch (err) {
            console.error(err);
            setError("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const submitAssessment = async (audioBlob) => {
        const formData = new FormData();
        formData.append('file', audioBlob);
        formData.append('reference_text', referenceText);
        formData.append('provider', 'azure'); // Default to Azure for now

        try {
            const response = await fetch('/api/voice-lab/assess', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || "Assessment failed");
            }

            const data = await response.json();
            setResult(data);
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    };

    // Color coding for scores
    const getScoreColor = (score) => {
        if (score >= 90) return "text-neon-green";
        if (score >= 80) return "text-yellow-400";
        return "text-red-400";
    };

    // Color coding for words (error status)
    const getWordColor = (wordError) => {
        if (wordError === "None") return "text-neon-green";
        if (wordError === "Omission") return "text-gray-500 line-through decoration-red-500";
        if (wordError === "Insertion") return "text-neon-pink underline";
        if (wordError === "Mispronunciation") return "text-red-400";
        return "text-ink";
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Section */}
                <Card title="Assessment Input" className="h-full">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-mono text-ink-muted mb-2">REFERENCE TEXT</label>
                            <Input
                                as="textarea"
                                value={referenceText}
                                onChange={(e) => setReferenceText(e.target.value)}
                                className="w-full h-32 font-serif text-lg"
                                placeholder="Enter text to read..."
                            />
                        </div>

                        <div className="flex gap-4 items-center">
                            {!isRecording ? (
                                <Button onClick={startRecording} variant="neon" className="flex items-center gap-2">
                                    <Mic size={18} />
                                    Start Recording
                                </Button>
                            ) : (
                                <Button onClick={stopRecording} variant="destructive" className="flex items-center gap-2 animate-pulse">
                                    <Square size={18} />
                                    Stop Recording
                                </Button>
                            )}

                            {audioUrl && (
                                <audio controls src={audioUrl} className="h-10 w-48" />
                            )}
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/50 text-red-400 text-sm font-mono rounded">
                                Error: {error}
                            </div>
                        )}
                        <div className="text-xs text-ink-muted font-mono">
                            Note: Requires Azure Speech Resource configured in .env
                        </div>
                    </div>
                </Card>

                {/* Results Section */}
                <Card title="Assessment Results" className="h-full min-h-[300px]">
                    {result ? (
                        <div className="space-y-6">
                            {/* Overall Scores */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-3 bg-canvas-dark rounded border border-ink-faint">
                                    <div className={`text-2xl font-bold font-mono ${getScoreColor(result.accuracy)}`}>
                                        {Math.round(result.accuracy)}
                                    </div>
                                    <div className="text-xs text-ink-muted mt-1 uppercase">Accuracy</div>
                                </div>
                                <div className="text-center p-3 bg-canvas-dark rounded border border-ink-faint">
                                    <div className={`text-2xl font-bold font-mono ${getScoreColor(result.fluency)}`}>
                                        {Math.round(result.fluency)}
                                    </div>
                                    <div className="text-xs text-ink-muted mt-1 uppercase">Fluency</div>
                                </div>
                                <div className="text-center p-3 bg-canvas-dark rounded border border-ink-faint">
                                    <div className={`text-2xl font-bold font-mono ${getScoreColor(result.completeness)}`}>
                                        {Math.round(result.completeness)}
                                    </div>
                                    <div className="text-xs text-ink-muted mt-1 uppercase">Completeness</div>
                                </div>
                                <div className="text-center p-3 bg-canvas-dark rounded border border-ink-faint">
                                    <div className={`text-2xl font-bold font-mono ${getScoreColor(result.pronunciation)}`}>
                                        {Math.round(result.pronunciation)}
                                    </div>
                                    <div className="text-xs text-ink-muted mt-1 uppercase">Pronunciation</div>
                                </div>
                            </div>

                            {/* Word-level Breakdown */}
                            <div>
                                <h3 className="text-xs font-mono text-ink-muted mb-3 uppercase">Word Verification</h3>
                                <div className="p-4 bg-canvas-dark rounded border border-ink-faint font-serif text-lg leading-relaxed flex flex-wrap gap-2">
                                    {result.words && result.words.length > 0 ? (
                                        result.words.map((word, idx) => (
                                            <span
                                                key={idx}
                                                className={`cursor-help relative group ${getWordColor(word.ErrorType)}`}
                                                title={`Score: ${word.AccuracyScore} | Error: ${word.ErrorType}`}
                                            >
                                                {word.Word}
                                                {/* Tooltip */}
                                                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black border border-neon-cyan text-xs text-neon-cyan opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none font-mono">
                                                    {Math.round(word.AccuracyScore)}%
                                                </span>
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-ink-muted italic">No word details available.</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-ink-muted opacity-50">
                            <Activity size={48} className="mb-4" />
                            <p>Record audio to see pronunciation analysis</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default PronunciationPanel;
