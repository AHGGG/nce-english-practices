import React from 'react';
import { useCoach } from '../../context/CoachContext';
import VocabGrid from '../Learn/VocabGrid';
import StoryReader from '../Learn/StoryReader';
import DrillSingle from '../Drill/DrillSingle';
import { AUIHydrator } from '../aui/AUIHydrator';

const Container = ({ title, color, children }) => (
    <div className="h-full flex flex-col p-4 md:p-8 max-w-5xl mx-auto w-full">
        <div className="flex items-end gap-4 mb-8 border-b border-[#333] pb-4">
            <h2 className={`text-2xl font-serif font-bold text-white`}>{title}</h2>
            <div className="flex items-center gap-2 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full bg-${color === 'pink' ? '[#FF0055]' : color === 'green' ? '[#00FF94]' : '[#E0E0E0]'} animate-pulse`}></span>
                <span className={`text-[10px] font-mono text-[#666] uppercase tracking-widest`}>Active Protocol</span>
            </div>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
            {children}
        </div>
    </div>
);

const CoachCanvas = () => {
    const { activeTool, isLoading } = useCoach();

    const renderContent = () => {
        if (isLoading && !activeTool) {
            return (
                <div className="h-full flex flex-col items-center justify-center text-[#666]">
                    <div className="mb-8 relative">
                        <div className="w-16 h-16 border-2 border-[#333] border-t-[#00FF94] rounded-full animate-spin"></div>
                    </div>
                    <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#00FF94]">Initializing Neural Handshake</p>
                </div>
            );
        }

        if (!activeTool) {
            return (
                <div className="h-full flex flex-col items-center justify-center text-[#444]">
                    <div className="text-center p-10 border border-[#222] bg-[#0A0A0A]/50 backdrop-blur-sm shadow-[8px_8px_0px_0px_#111]">
                        <h1 className="text-6xl font-serif font-bold text-[#222] mb-4">ACTIVE<span className="text-[#00FF94]">.</span>GYM</h1>
                        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#666]">Ready for Instructions</p>
                    </div>
                </div>
            );
        }

        // Check for AUI Protocol Packet
        if (activeTool?.result?.type === 'aui_render') {
            return (
                <Container title="AUI Agent Interface" color="green">
                    <div className="flex items-center justify-center min-h-[50vh]">
                        <AUIHydrator packet={activeTool.result} onInteract={(data) => console.log('AUI Interact:', data)} />
                    </div>
                </Container>
            );
        }

        switch (activeTool.name) {
            case 'show_vocabulary':
                // Legacy Fallback (or if tool not yet on AUI)
                return (
                    <Container title="Vocabulary Matrix" color="green">
                        <VocabGrid
                            vocab={null}
                            isCollapsed={false}
                            mode="coach-list"
                            words={activeTool.args.words}
                        />
                    </Container>
                );

            case 'present_story':
                // Legacy Fallback
                return (
                    <Container title={`Context: ${activeTool.args.topic}`} color="white">
                        <StoryReader
                            story={{
                                title: activeTool.args.topic,
                                content: activeTool.result?.content || activeTool.args.content || "Generating story context...",
                                ...activeTool.args
                            }}
                            coachMode={true}
                            highlights={activeTool.args.highlights}
                        />
                    </Container>
                );

            case 'start_drill':
                return (
                    <Container title="Drill Sequence" color="pink">
                        <div className="flex items-center justify-center h-full">
                            <DrillSingle
                                question={activeTool.args.question || "Translate: " + activeTool.args.topic}
                                answer={activeTool.args.answer || "Example Answer"}
                                hint={activeTool.args.hint}
                                onComplete={(success) => console.log("Drill Complete:", success)}
                            />
                        </div>
                    </Container>
                );

            default:
                return (
                    <div className="p-8 flex items-center justify-center h-full">
                        <div className="text-center p-8 border border-[#FF0055] bg-[#FF0055]/5">
                            <p className="font-mono text-sm text-[#FF0055] font-bold mb-2">PROTOCOL ERROR</p>
                            <p className="font-mono text-xs text-[#888]">Unknown Tool: {activeTool.name}</p>
                            <pre className="mt-4 text-[10px] text-[#444] text-left bg-black p-4 border border-[#333]">{JSON.stringify(activeTool.args, null, 2)}</pre>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="h-full w-full relative overflow-hidden">
            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

            {/* Content Container */}
            <div className="relative z-10 h-full">
                {renderContent()}
            </div>
        </div>
    );
};

export default CoachCanvas;
