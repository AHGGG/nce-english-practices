import { useState, type ComponentType } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Mic,
  BarChart2,
  Activity,
  Headphones,
  Radio,
  User,
  LogOut,
  ChevronDown,
  Settings,
  Zap,
  Sparkles,
  ChevronRight,
  Target,
  Brain,
  Play,
  Compass,
  BookMarked,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

interface NavRoute {
  title: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
}

interface FeaturedModule {
  title: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  primary: boolean;
}

interface NavCardProps extends NavRoute {
  index: number;
}

const NavCard = ({
  title,
  path,
  icon: Icon,
  description,
  index,
}: NavCardProps) => {
  return (
    <Link
      to={path}
      className="group relative flex items-start gap-4 p-5 bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] rounded-2xl hover:bg-white/[0.05] hover:border-accent-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f0d] transition-all duration-500 cursor-pointer overflow-hidden"
    >
      {/* Number indicator */}
      <div className="absolute top-4 right-4 text-[10px] font-mono text-white/30 group-hover:text-accent-primary/40 transition-colors">
        {String(index + 1).padStart(2, "0")}
      </div>

      {/* Icon container */}
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-accent-primary/20 to-accent-secondary/10 border border-accent-primary/20 flex items-center justify-center group-hover:scale-110 group-hover:border-accent-primary/40 transition-all duration-300">
        <Icon className="w-5 h-5 text-accent-primary" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-white/90 mb-1 group-hover:text-accent-primary transition-colors duration-300">
          {title}
        </h3>
        <p className="text-sm text-white/50 leading-relaxed line-clamp-2">
          {description}
        </p>
      </div>

      {/* Arrow indicator */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-300 transform group-hover:translate-x-1 group-focus-visible:translate-x-1">
        <ChevronRight className="w-5 h-5 text-accent-primary/60" />
      </div>

      {/* Hover glow */}
      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-accent-primary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
    </Link>
  );
};

const UserMenu = () => {
  const { user, logout } = useAuth() as {
    user?: { username?: string; email?: string } | null;
    logout: () => Promise<void>;
  };
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-white/[0.05] backdrop-blur-xl border border-white/[0.1] rounded-full hover:bg-white/[0.08] hover:border-white/[0.2] transition-all duration-300"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
          <User className="w-4 h-4 text-bg-base" />
        </div>
        <span className="text-sm font-medium text-white/80 hidden sm:block">
          {user?.username || user?.email?.split("@")[0] || "User"}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-white/50 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-56 bg-[#0c1418] backdrop-blur-xl border border-white/[0.1] rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-4 border-b border-white/[0.05]">
              <p className="text-sm font-medium text-white">
                {user?.username || "User"}
              </p>
              <p className="text-xs text-white/50 truncate">{user?.email}</p>
            </div>
            <div className="p-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-accent-danger/80 hover:bg-accent-danger/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Sign out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const NavDashboard = () => {
  const navigate = useNavigate();

  const routes: NavRoute[] = [
    {
      title: "Voice Mode",
      path: "/voice",
      icon: Mic,
      description: "Real-time voice conversation practice with AI tutors.",
    },
    {
      title: "Reading Mode",
      path: "/reading",
      icon: BookOpen,
      description: "Immersive reading with instant dictionary lookups.",
    },
    {
      title: "Sentence Study",
      path: "/sentence-study",
      icon: Target,
      description: "Study articles sentence by sentence with feedback.",
    },
    {
      title: "Performance",
      path: "/performance",
      icon: BarChart2,
      description: "Detailed analytics and progress tracking.",
    },
    {
      title: "Review Queue",
      path: "/review-queue",
      icon: Brain,
      description: "Spaced repetition for optimal retention.",
    },
    {
      title: "Proficiency Lab",
      path: "/lab/calibration",
      icon: Activity,
      description: "Diagnostic mission to calibrate your profile.",
    },
    {
      title: "Voice Lab",
      path: "/voice-lab",
      icon: Radio,
      description: "Test various voice synthesis providers.",
    },
    {
      title: "Podcast",
      path: "/podcast",
      icon: Headphones,
      description: "Listen and study with transcription mode.",
    },
    {
      title: "Audiobook",
      path: "/audiobook",
      icon: BookOpen,
      description: "Listen to audiobooks with synchronized subtitles.",
    },
    {
      title: "Weak Points",
      path: "/weak-points",
      icon: BookMarked,
      description:
        "Review your unfamiliar words and collocations in one place.",
    },
    {
      title: "System Settings",
      path: "/settings",
      icon: Settings,
      description: "Configure application preferences.",
    },
  ];

  // Featured modules for quick access
  const featuredModules: FeaturedModule[] = [
    {
      title: "Start Learning",
      path: "/sentence-study",
      icon: Play,
      primary: true,
    },
    {
      title: "Continue Reading",
      path: "/reading",
      icon: BookOpen,
      primary: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f0d] relative overflow-hidden">
      {/* Deep atmospheric gradient background */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0a1418] via-[#0c1815] to-[#0a0f0d]" />

      {/* Atmospheric mist effect */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-radial from-emerald-900/20 via-transparent to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-gradient-radial from-teal-900/10 via-transparent to-transparent blur-3xl" />
      </div>

      {/* Subtle grid overlay */}
      <div
        className="fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Navigation Bar */}
      <nav className="relative z-20 px-4 md:px-12 py-4 md:py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-[0_0_15px_rgba(var(--color-accent-primary-rgb),0.3)]">
              <Zap className="w-5 h-5 text-[#0a0f0d]" />
            </div>
            <span className="text-lg md:text-xl font-bold font-serif text-white tracking-tight">
              English101.ai
            </span>
          </div>

          {/* Center nav links */}
          {/* <div className="hidden md:flex items-center gap-8">
            {["About", "Features", "Pricing"].map((item) => (
              <button
                key={item}
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                {item}
              </button>
            ))}
          </div> */}

          {/* User menu */}
          <UserMenu />
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 md:px-12 pt-16 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary/10 border border-accent-primary/20 rounded-full mb-8 backdrop-blur-md shadow-[0_0_15px_rgba(var(--color-accent-primary-rgb),0.1)] animate-fade-in">
            <Sparkles className="w-4 h-4 text-accent-primary animate-pulse-slow" />
            <span className="text-sm font-medium text-accent-primary/90 tracking-wide">
              AI-Powered Learning Platform
            </span>
          </div>

          {/* Main headline */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold text-white leading-[1.1] tracking-tight mb-8 drop-shadow-2xl">
            Grammar Training
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary bg-[length:200%_auto] animate-gradient">
              Through the Dark
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed px-4">
            Master English with intelligent AI tutors that guide your journey
            <span className="text-accent-primary/80 font-medium">
              {" "}
              through the complexities
            </span>{" "}
            of grammar.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4">
            {featuredModules.map((module) => (
              <button
                key={module.path}
                onClick={() => navigate(module.path)}
                className={`group w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold uppercase tracking-wider text-sm transition-all duration-300 ${
                  module.primary
                    ? "bg-accent-primary text-[#0a0f0d] hover:bg-white hover:scale-105 shadow-[0_0_20px_rgba(var(--color-accent-primary-rgb),0.3)] hover:shadow-[0_0_30px_rgba(var(--color-accent-primary-rgb),0.5)]"
                    : "bg-white/[0.05] text-white border border-white/[0.1] hover:bg-white/[0.1] hover:border-white/[0.3] hover:text-accent-primary"
                }`}
              >
                <module.icon
                  className={`w-5 h-5 ${module.primary ? "text-[#0a0f0d]" : "text-current"}`}
                />
                <span>{module.title}</span>
                <ChevronRight
                  className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${module.primary ? "text-[#0a0f0d]/60" : "text-white/40"}`}
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Grid */}
      <section className="relative z-10 px-4 md:px-12 pb-20">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="flex items-center gap-4 mb-8 md:mb-10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent-primary/10">
                <Compass className="w-5 h-5 text-accent-primary" />
              </div>
              <h2 className="text-lg font-bold text-white uppercase tracking-widest">
                Training Modules
              </h2>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-white/[0.1] to-transparent" />
            <span className="text-xs text-white/40 font-mono border border-white/10 px-2 py-1 rounded-md">
              {routes.length} MODULES
            </span>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {routes.map((route, index) => (
              <NavCard key={route.path} {...route} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.05] px-6 md:px-12 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/40">
            © 2026 English101.ai. Built with precision.
          </p>
          {/* <div className="flex items-center gap-6">
            {["Privacy", "Terms", "Support"].map((link) => (
              <button
                key={link}
                className="text-sm text-white/40 hover:text-white/60 transition-colors"
              >
                {link}
              </button>
            ))}
          </div> */}
        </div>
      </footer>
    </div>
  );
};

export default NavDashboard;
