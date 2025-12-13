import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import TopicInput from './TopicInput';

const Layout = () => {
    return (
        <div className="flex h-screen w-full relative overflow-hidden bg-bg text-ink font-sans antialiased selection:bg-neon-cyan selection:text-black">
            {/* Mobile Header */}
            <header className="md:hidden absolute top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 bg-bg border-b border-ink-faint h-[64px]">
                <div className="flex-none flex items-center gap-2">
                    <h1 className="text-xl font-serif font-bold tracking-tight text-ink">NCE</h1>
                    <span className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 border border-neon-cyan text-neon-cyan bg-neon-cyan/10">AI</span>
                </div>
                <div className="flex-1">
                    <TopicInput className="w-full" />
                </div>
            </header>

            <Sidebar />

            <main className="flex-1 flex flex-col h-full overflow-hidden relative md:pt-0 pt-[64px] bg-bg">
                <Outlet />
            </main>

            <MobileNav />
        </div>
    );
};

export default Layout;
