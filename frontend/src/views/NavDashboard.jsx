import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen,
    Mic,
    BarChart2,
    Activity,
    Headphones,
    Radio,
    Clock,
    User
} from 'lucide-react';

const NavCard = ({ title, path, icon: Icon, description }) => { // eslint-disable-line no-unused-vars
    const navigate = useNavigate();

    return (
        <div
            onClick={() => navigate(path)}
            className="group relative flex flex-col p-6 h-full bg-bg-surface border border-border hover:border-accent-primary transition-all duration-300 cursor-pointer overflow-hidden"
        >
            <div className="absolute top-0 left-0 w-1 h-full bg-accent-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-none bg-bg-elevated group-hover:bg-accent-primary/10 transition-colors duration-300">
                    <Icon className="w-6 h-6 text-accent-primary" />
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-xs font-mono text-accent-primary">ENTER_SYSTEM &gt;&gt;</span>
                </div>
            </div>

            <h3 className="text-xl font-bold font-serif text-text-primary mb-2 group-hover:text-accent-primary transition-colors">
                {title}
            </h3>

            <p className="text-sm text-text-muted leading-relaxed font-sans">
                {description}
            </p>
        </div>
    );
};

const NavDashboard = () => {
    const routes = [
        {
            title: "Voice Mode",
            path: "/voice",
            icon: Mic,
            description: "Real-time voice conversation practice with AI tutors."
        },
        {
            title: "Reading Mode",
            path: "/reading",
            icon: BookOpen,
            description: "Immersive reading experience with instant dictionary lookups."
        },
        {
            title: "Sentence Study",
            path: "/sentence-study",
            icon: BookOpen,
            description: "Study articles sentence by sentence with Clear/Unclear feedback."
        },
        {
            title: "Performance",
            path: "/performance",
            icon: BarChart2,
            description: "Detailed analytics and progress tracking for your learning journey."
        },
        {
            title: "Proficiency Lab",
            path: "/lab/calibration",
            icon: Activity,
            description: "Deep diagnostic mission to calibrate your proficiency profile."
        },
        {
            title: "Voice Lab",
            path: "/voice-lab",
            icon: Radio,
            description: "Experimental lab for testing various voice synthesis providers."
        },
        {
            title: "AUI Stream Demo",
            path: "/aui-stream-demo",
            icon: Headphones,
            description: "Tech demo for the Agentic UI Streaming protocol."
        },
        {
            title: "Review Queue",
            path: "/review-queue",
            icon: Clock,
            description: "Spaced repetition queue for sentences due for review."
        }
    ];

    return (
        <div className="min-h-screen bg-bg-base p-8 md:p-12 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
                <header className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold font-serif text-text-primary mb-4">
                        Command Center
                    </h1>
                    <p className="text-lg text-text-muted font-mono border-l-2 border-accent-primary pl-4">
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
