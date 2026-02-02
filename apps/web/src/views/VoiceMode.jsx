import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Mic } from "lucide-react";
import NegotiationInterface from "../components/voice/NegotiationInterface";

const VoiceMode = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-bg-base overflow-hidden relative">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-accent-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent-secondary/5 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
      </div>

      {/* Header */}
      <header className="relative z-10 h-16 flex items-center px-6 border-b border-white/[0.05] bg-bg-base/50 backdrop-blur-xl">
        <button
          onClick={() => navigate("/nav")}
          className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full text-text-secondary hover:text-white hover:bg-white/5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          aria-label="Back to dashboard"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 ml-2">
          <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center border border-accent-primary/20">
            <Mic className="w-4 h-4 text-accent-primary" />
          </div>
          <h1 className="text-lg font-semibold text-white tracking-tight">
            Voice Mode
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 overflow-y-auto custom-scrollbar">
        <NegotiationInterface />
      </main>
    </div>
  );
};

export default VoiceMode;
