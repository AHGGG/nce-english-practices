import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen,
    Mic,
    BarChart2,
    Activity,
    Headphones,
    Radio,
    Zap,
    Layers
} from 'lucide-react';

const NavCard = ({ title, path, icon: Icon, description, color = "neon-cyan" }) => {
    const navigate = useNavigate();

    return (
        <div
            onClick={() => navigate(path)}
            className="group relative flex flex-col p-6 h-full bg-surface-1 border border-ink-faint hover:border-neon-cyan transition-all duration-300 cursor-pointer overflow-hidden"
        >
            <div className={`absolute top-0 left-0 w-1 h-full bg-${color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-none bg-surface-2 group-hover:bg-${color}/10 transition-colors duration-300`}>
                    <Icon className={`w-6 h-6 text-${color}`} />
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-xs font-mono text-neon-cyan">ENTER_SYSTEM &gt;&gt;</span>
                </div>
            </div>

            <h3 className="text-xl font-bold font-serif text-ink mb-2 group-hover:text-neon-cyan transition-colors">
                {title}
            </h3>

            <p className="text-sm text-ink-muted leading-relaxed font-sans">
                {description}
            </p>
        </div>
    );
};

const NavDashboard = () => {
    const routes = [
        {
            title: "Core Learning",
            path: "/learn",
            icon: BookOpen,
            description: "Master English tenses through interactive exercises and structured lessons.",
            color: "neon-cyan"
        },
        {
            title: "Drill Mode",
            path: "/drill",
            icon: Zap,
            description: "Intensive practice sessions to build muscle memory and speed.",
            color: "neon-magenta"
        },
        {
            title: "Apply (Chat)",
            path: "/apply",
            icon: Layers,
            description: "Roleplay scenarios to apply grammar in realistic contexts.",
            color: "neon-cyan"
        },
        {
            title: "Coach Intelligence",
            path: "/coach",
            icon: Activity,
            description: "AI-powered coaching system for personalized guidance and adaptive learning.",
            color: "neon-lime"
        },
        {
            title: "Voice Mode",
            path: "/voice",
            icon: Mic,
            description: "Real-time voice conversation practice with AI tutors.",
            color: "neon-magenta"
        },
        {
            title: "Reading Mode",
            path: "/reading",
            icon: BookOpen,
            description: "Immersive reading experience with instant dictionary lookups.",
            color: "neon-lime"
        },
        {
            title: "Voice Lab",
            path: "/voice-lab",
            icon: Radio,
            description: "Experimental lab for testing various voice synthesis providers.",
            color: "neon-cyan"
        },
        {
            title: "Performance",
            path: "/performance",
            icon: BarChart2,
            description: "Detailed analytics and progress tracking for your learning journey.",
            color: "neon-magenta"
        },
        {
            title: "AUI Stream Demo",
            path: "/aui-stream-demo",
            icon: Headphones,
            description: "Tech demo for the Agentic UI Streaming protocol.",
            color: "neon-lime"
        },
        {
            title: "Proficiency Lab",
            path: "/lab/calibration",
            icon: Activity,
            description: "Deep diagnostic mission to calibrate your proficiency profile.",
            color: "neon-cyan"
        },
        {
            title: "Sentence Study",
            path: "/sentence-study",
            icon: BookOpen,
            description: "Study articles sentence by sentence with Clear/Unclear feedback.",
            color: "neon-lime"
        }
    ];

    return (
        <div className="min-h-screen bg-bg p-8 md:p-12 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
                <header className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold font-serif text-ink mb-4">
                        Command Center
                    </h1>
                    <p className="text-lg text-ink-muted font-mono border-l-2 border-neon-cyan pl-4">
            // SELECT_MODULE_TO_INITIATE_TRAINING
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {routes.map((route) => (
                        <NavCard key={route.path} {...route} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default NavDashboard;
