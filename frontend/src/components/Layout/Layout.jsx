import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
    return (
        <div className="flex h-screen w-full relative overflow-hidden bg-[#0f172a] text-white font-sans antialiased selection:bg-sky-400 selection:text-white">
            {/* Mobile Header Placeholder - To be implemented properly for mobile */}
            <header className="md:hidden absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-[#0f172a] border-b border-white/10 h-[54px]">
                <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold tracking-tight text-white">NCE</h1>
                    <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-sky-400/20 text-sky-400 border border-sky-400/20">AI</span>
                </div>
            </header>

            <Sidebar />

            <main className="flex-1 flex flex-col h-full overflow-hidden relative md:pt-0 pt-[54px]">
                <Outlet />
            </main>

            {/* Mobile Bottom Nav Placeholder - To be implemented */}
        </div>
    );
};

export default Layout;
