// @ts-nocheck
/**
 * Podcast Layout - Shared wrapper for podcast views with header and consistent styling.
 * Includes navigation tabs: Library, Search, Downloads
 */

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Headphones,
  Search,
  Library,
  CloudOff,
  HardDrive,
} from "lucide-react";
import { getStorageEstimate, getOfflineEpisodeIds } from "../../utils/offline";

export default function PodcastLayout({
  children,
  title,
  showBackButton = true,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [storageInfo, setStorageInfo] = useState(null);
  const [offlineCount, setOfflineCount] = useState(0);

  const isLibrary = location.pathname === "/podcast";
  const isSearch = location.pathname === "/podcast/search";
  const isDownloads = location.pathname === "/podcast/downloads";

  // Load storage info on mount
  useEffect(() => {
    getStorageEstimate().then(setStorageInfo);
    setOfflineCount(getOfflineEpisodeIds().length);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white font-sans relative overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0a1418] via-[#0c1815] to-[#0a0f0d] pointer-events-none" />
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-radial from-emerald-900/20 via-transparent to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-gradient-radial from-teal-900/10 via-transparent to-transparent blur-3xl" />
      </div>
      <div
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0f0d]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {showBackButton && (
                <button
                  onClick={() => navigate("/nav")}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-white/[0.03] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all group"
                >
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                </button>
              )}

              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent-primary/10 rounded-xl border border-accent-primary/20 shadow-[0_0_15px_rgba(var(--color-accent-primary-rgb),0.15)]">
                  <Headphones className="w-5 h-5 text-accent-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold font-serif text-white tracking-wide leading-tight">
                    {title || "Podcast"}
                  </h1>
                  <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest mt-0.5">
                    Audio Learning
                  </p>
                </div>
              </div>
            </div>

            {/* Storage indicator */}
            {storageInfo && (
              <div className="hidden md:flex items-center gap-2 text-[10px] text-white/40 px-3 py-1.5 bg-white/[0.03] rounded-lg border border-white/[0.08] font-mono uppercase tracking-wider">
                <HardDrive className="w-3 h-3" />
                <span>{storageInfo.usedMB} MB</span>
                <span className="opacity-30">/</span>
                <span>{storageInfo.quotaMB} MB</span>
              </div>
            )}
          </div>

          {/* Nav tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto w-full no-scrollbar pb-0">
            <button
              onClick={() => navigate("/podcast")}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                isLibrary
                  ? "border-accent-primary text-accent-primary"
                  : "border-transparent text-white/40 hover:text-white hover:bg-white/[0.02] rounded-t-lg"
              }`}
            >
              <Library className="w-4 h-4" />
              <span>Library</span>
            </button>

            <button
              onClick={() => navigate("/podcast/search")}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                isSearch
                  ? "border-accent-primary text-accent-primary"
                  : "border-transparent text-white/40 hover:text-white hover:bg-white/[0.02] rounded-t-lg"
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>

            <button
              onClick={() => navigate("/podcast/downloads")}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                isDownloads
                  ? "border-accent-primary text-accent-primary"
                  : "border-transparent text-white/40 hover:text-white hover:bg-white/[0.02] rounded-t-lg"
              }`}
            >
              <CloudOff className="w-4 h-4" />
              <span>Downloads</span>
              {offlineCount > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.5 text-[9px] rounded-full font-mono ${isDownloads ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/20" : "bg-white/10 text-white/60 border border-white/10"}`}
                >
                  {offlineCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-8 pb-32 relative z-10">
        {children}
      </main>
    </div>
  );
}
