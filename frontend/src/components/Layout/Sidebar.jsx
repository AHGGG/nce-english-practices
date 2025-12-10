import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';

const Sidebar = () => {
    const [inputTopic, setInputTopic] = useState('');
    const { loadTheme, loading, error } = useTheme();

    const handleLoad = async () => {
        if (!inputTopic.trim()) return;
        await loadTheme(inputTopic.trim());
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleLoad();
    };

    return (
        <aside className="hidden md:flex flex-col z-20 w-[260px] h-full bg-[#0f172a] border-r border-white/10 p-6">
            <div className="mb-8 flex items-center gap-3 px-2">
                <h1 className="text-xl font-bold tracking-tight text-white">NCE Practice</h1>
                <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-400/20 text-sky-400 border border-sky-400/20">
                    AI Tutor
                </span>
            </div>

            <div className="mb-8 relative">
                <input
                    type="text"
                    value={inputTopic}
                    onChange={(e) => setInputTopic(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter topic..."
                    autoComplete="off"
                    disabled={loading}
                    className="w-full bg-[#0f172a] border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all placeholder-slate-500 disabled:opacity-50"
                />
                <button
                    onClick={handleLoad}
                    disabled={loading}
                    className="absolute right-2 top-2 p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-white/5 transition-colors disabled:opacity-50"
                    title="Generate"
                >
                    {loading ? <div className="w-4 h-4 border-2 border-slate-500 border-t-sky-400 rounded-full animate-spin"></div> : '✨'}
                </button>
            </div>

            {error && <div className="mb-4 px-2 text-xs text-red-400">{error}</div>}

            <nav className="flex flex-col gap-1 w-full">
                <NavLink
                    to="/learn"
                    className={({ isActive }) =>
                        `nav-item w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1 text-left ${isActive ? 'bg-sky-400/10 text-sky-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`
                    }
                >
                    <span className="text-lg opacity-80">📚</span> <span className="font-medium">Learn</span>
                </NavLink>
                <NavLink
                    to="/drill"
                    className={({ isActive }) =>
                        `nav-item w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1 text-left ${isActive ? 'bg-sky-400/10 text-sky-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`
                    }
                >
                    <span className="text-lg opacity-80">⚡</span> <span className="font-medium">Drill</span>
                </NavLink>
                <NavLink
                    to="/apply"
                    className={({ isActive }) =>
                        `nav-item w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1 text-left ${isActive ? 'bg-sky-400/10 text-sky-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`
                    }
                >
                    <span className="text-lg opacity-80">🚀</span> <span className="font-medium">Apply</span>
                </NavLink>
                <div className="flex-1"></div>
                <NavLink
                    to="/stats"
                    className={({ isActive }) =>
                        `nav-item w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mt-auto text-left ${isActive ? 'bg-sky-400/10 text-sky-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`
                    }
                >
                    <span className="text-lg opacity-80">📊</span> <span className="font-medium">Stats</span>
                </NavLink>
            </nav>
        </aside>
    );
};

export default Sidebar;
