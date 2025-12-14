import React from 'react';
import { NavLink } from 'react-router-dom';
import { Zap, BookOpen, Terminal, Rocket, BarChart2 } from 'lucide-react';
import TopicInput from './TopicInput';

// NavItem is defined outside to prevent recreation on each render
const NavItem = ({ to, icon: Icon, label, disabled }) => {
    if (disabled) {
        return (
            <div className="group flex items-center gap-3 px-4 py-3 border-l-2 border-transparent transition-all font-mono text-sm uppercase tracking-wide mb-1 opacity-30 grayscale cursor-not-allowed">
                <Icon size={16} className="shrink-0" />
                <span className="font-bold">{label}</span>
            </div>
        );
    }

    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `group flex items-center gap-3 px-4 py-3 border-l-2 transition-all font-mono text-sm uppercase tracking-wide mb-1 ${isActive
                    ? 'border-neon-green bg-neon-green/5 text-neon-green'
                    : 'border-transparent text-ink-muted hover:text-ink hover:border-ink-faint hover:pl-5'
                }`
            }
        >
            <Icon size={16} className="shrink-0" />
            <span className="font-bold">{label}</span>
        </NavLink>
    );
};

// Sidebar receives topic as prop, NOT from context
// This prevents re-renders during story streaming
const Sidebar = React.memo(({ topic }) => {
    return (
        <aside className="hidden md:flex flex-col z-20 w-[280px] h-full bg-bg-paper border-r border-ink-faint shrink-0">
            <div className="p-6 border-b border-ink-faint bg-bg">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 bg-neon-green flex items-center justify-center shrink-0">
                        <Zap size={20} className="text-black fill-current" />
                    </div>
                    <div>
                        <h1 className="text-lg font-serif font-bold text-ink leading-none tracking-tight">Active Gym</h1>
                        <span className="text-[10px] font-mono text-neon-green tracking-[0.2em] uppercase">System Online</span>
                    </div>
                </div>
            </div>

            {topic && (
                <div className="p-6 pb-2">
                    <TopicInput />
                </div>
            )}

            <nav className="flex flex-col gap-1 w-full mt-4">
                <div className="px-6 mb-2 text-[10px] font-bold text-ink-muted uppercase tracking-widest">Modules</div>
                <NavItem to="/learn" icon={BookOpen} label="Context (Story)" />
                <NavItem to="/drill" icon={Terminal} label="Matrix (Drill)" disabled={!topic} />
                <NavItem to="/apply" icon={Rocket} label="Scenario (Sim)" disabled={!topic} />

                <div className="mt-8 px-6 mb-2 text-[10px] font-bold text-ink-muted uppercase tracking-widest">Data</div>
                <NavItem to="/stats" icon={BarChart2} label="Performance" />
            </nav>

            <div className="mt-auto p-6 border-t border-ink-faint">
                <div className="flex items-center gap-2 text-[10px] font-mono text-ink-muted">
                    <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></div>
                    <div>v2.1.0-CN <span className="opacity-50">STABLE</span></div>
                </div>
            </div>
        </aside >
    );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;

