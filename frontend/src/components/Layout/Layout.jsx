import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import TopicInput from './TopicInput';

import { useGlobalState } from '../../context/GlobalContext';

const Layout = () => {
    const { state } = useGlobalState();
    const { topic } = state;

    return (
        <div className="flex h-screen w-full relative overflow-hidden bg-bg text-ink font-sans antialiased selection:bg-neon-cyan selection:text-black">
            {/* Mobile Header - Only show when topic exists */}
            {topic && (
                <header className="md:hidden absolute top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 bg-bg border-b border-ink-faint h-[64px]">
                    <div className="flex-1">
                        <TopicInput className="w-full" />
                    </div>
                </header>
            )}

            <Sidebar topic={topic} />

            <main className={`flex-1 flex flex-col h-full overflow-hidden relative md:pt-0 bg-bg ${topic ? 'pt-[64px]' : 'pt-0'}`}>
                <Outlet />
            </main>

            <MobileNav topic={topic} />
        </div>
    );
};

export default Layout;
