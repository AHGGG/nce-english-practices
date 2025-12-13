import { NavLink } from 'react-router-dom';
import { useGlobalState } from '../../context/GlobalContext';
import { BookOpen, Terminal, Rocket, BarChart2 } from 'lucide-react';

const MobileNav = () => {
    const { state } = useGlobalState();
    const { topic } = state;

    const NavItem = ({ to, icon: Icon, label, disabled }) => {
        if (disabled) {
            return (
                <div className="flex flex-col items-center justify-center w-full h-full gap-1 opacity-20 grayscale pointer-events-none">
                    <Icon size={20} />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider">{label}</span>
                </div>
            );
        }

        return (
            <NavLink
                to={to}
                className={({ isActive }) =>
                    `flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${isActive ? 'text-neon-cyan [&>svg]:drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'text-ink-muted hover:text-ink'
                    }`
                }
            >
                <Icon size={20} />
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider">{label}</span>
            </NavLink>
        );
    };

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-elevated border-t-2 border-neon-cyan pb-[env(safe-area-inset-bottom)]">
            <div className="flex justify-around items-center h-[60px] px-2 gap-1">
                <NavItem to="/learn" icon={BookOpen} label="Learn" />
                <NavItem to="/drill" icon={Terminal} label="Drill" disabled={!topic} />
                <NavItem to="/apply" icon={Rocket} label="Apply" disabled={!topic} />
                <NavItem to="/stats" icon={BarChart2} label="Stats" />
            </div>
        </nav>
    );
};

export default MobileNav;
