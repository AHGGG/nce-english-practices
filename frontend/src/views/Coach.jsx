import React, { useEffect } from 'react';
import { useCoach } from '../context/CoachContext';
import CoachCanvas from '../components/Coach/CoachCanvas';
import CoachFooter from '../components/Coach/CoachFooter';

const Coach = () => {
    const { startSession, sessionId } = useCoach();

    useEffect(() => {
        if (!sessionId) {
            startSession();
        }
    }, [sessionId]);

    return (
        <div className="h-screen w-full bg-[#050505] text-[#E0E0E0] flex flex-col overflow-hidden font-mono selection:bg-[#00FF94] selection:text-black">
            {/* GLOBAL NOISE TEXTURE OVERLAY */}
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

            {/* Top 65% - Teaching Content */}
            <div className="flex-1 overflow-hidden relative border-b border-[#333]">
                <CoachCanvas />
            </div>

            {/* Bottom 35% - Conversation Interface */}
            {/* Using a darker background for the chat to distinguish it, or keeping it unified? 
                Reference uses grid layout. Let's make the footer a distinct 'Control Panel' 
            */}
            <div className="h-[35vh] min-h-[300px] bg-[#0A0A0A] relative z-10 shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
                <CoachFooter />
            </div>
        </div>
    );
};

export default Coach;
