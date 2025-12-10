import React from 'react';
import { NavLink } from 'react-router-dom';

const MobileNav = () => {
    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0f172a]/90 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
            <div className="flex justify-around items-center h-[65px] px-2">
                <NavLink
                    to="/learn"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isActive ? 'text-sky-400' : 'text-slate-400 hover:text-white'
                        }`
                    }
                >
                    <span className="text-xl">📚</span>
                    <span className="text-[10px] font-medium">Learn</span>
                </NavLink>

                <NavLink
                    to="/drill"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isActive ? 'text-sky-400' : 'text-slate-400 hover:text-white'
                        }`
                    }
                >
                    <span className="text-xl">⚡</span>
                    <span className="text-[10px] font-medium">Drill</span>
                </NavLink>

                <NavLink
                    to="/apply"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isActive ? 'text-sky-400' : 'text-slate-400 hover:text-white'
                        }`
                    }
                >
                    <span className="text-xl">🚀</span>
                    <span className="text-[10px] font-medium">Apply</span>
                </NavLink>

                <NavLink
                    to="/stats"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isActive ? 'text-sky-400' : 'text-slate-400 hover:text-white'
                        }`
                    }
                >
                    <span className="text-xl">📊</span>
                    <span className="text-[10px] font-medium">Stats</span>
                </NavLink>
            </div>
        </nav>
    );
};

export default MobileNav;
