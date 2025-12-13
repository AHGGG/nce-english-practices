import { NavLink } from 'react-router-dom';
import { BookOpen, Terminal, Rocket, BarChart2 } from 'lucide-react';

const MobileNav = () => {
    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-elevated border-t-2 border-neon-cyan pb-[env(safe-area-inset-bottom)]">
            <div className="flex justify-around items-center h-[60px] px-2">
                <NavLink
                    to="/learn"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${isActive ? 'text-neon-cyan [&>svg]:drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'text-ink-muted hover:text-ink'
                        }`
                    }
                >
                    <BookOpen size={20} />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Learn</span>
                </NavLink>

                <NavLink
                    to="/drill"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${isActive ? 'text-neon-cyan [&>svg]:drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'text-ink-muted hover:text-ink'
                        }`
                    }
                >
                    <Terminal size={20} />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Drill</span>
                </NavLink>

                <NavLink
                    to="/apply"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${isActive ? 'text-neon-cyan [&>svg]:drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'text-ink-muted hover:text-ink'
                        }`
                    }
                >
                    <Rocket size={20} />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Apply</span>
                </NavLink>

                <NavLink
                    to="/stats"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${isActive ? 'text-neon-cyan [&>svg]:drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'text-ink-muted hover:text-ink'
                        }`
                    }
                >
                    <BarChart2 size={20} />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Stats</span>
                </NavLink>
            </div>
        </nav>
    );
};

export default MobileNav;
