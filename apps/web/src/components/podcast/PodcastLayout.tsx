/**
 * Podcast Layout - Shared wrapper for podcast views with header and consistent styling.
 * Includes navigation tabs: Library, Search, Downloads
 */

import type { ReactNode } from "react";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  Headphones,
  Search,
  Library,
  CloudOff,
  HardDrive,
  Heart,
  ListMusic,
} from "lucide-react";
import { getStorageEstimate, getOfflineEpisodeIds } from "../../utils/offline";

interface PodcastLayoutProps {
  children: ReactNode;
  title?: string;
  showBackButton?: boolean;
}

interface StorageInfo {
  usedMB: string;
  quotaMB: string;
}

const PODCAST_TAB_SCROLL_KEY = "podcast:tabs:scrollLeft";

export default function PodcastLayout({
  children,
  title,
  showBackButton = true,
}: PodcastLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [offlineCount] = useState(() => getOfflineEpisodeIds().length);
  const navRef = useRef<HTMLElement | null>(null);
  const libraryTabRef = useRef<HTMLButtonElement | null>(null);
  const searchTabRef = useRef<HTMLButtonElement | null>(null);
  const downloadsTabRef = useRef<HTMLButtonElement | null>(null);
  const favoritesTabRef = useRef<HTMLButtonElement | null>(null);
  const playlistsTabRef = useRef<HTMLButtonElement | null>(null);
  const hasInitializedTabPositionRef = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const isLibrary = location.pathname === "/podcast";
  const isSearch = location.pathname === "/podcast/search";
  const isDownloads = location.pathname === "/podcast/downloads";
  const isFavorites = location.pathname === "/podcast/favorites";
  const isPlaylists =
    location.pathname === "/podcast/playlists" ||
    location.pathname.startsWith("/podcast/playlist/");

  const activeTabRef = isLibrary
    ? libraryTabRef
    : isSearch
      ? searchTabRef
      : isDownloads
        ? downloadsTabRef
        : isFavorites
          ? favoritesTabRef
          : playlistsTabRef;

  // Load storage info on mount
  useEffect(() => {
    getStorageEstimate().then(setStorageInfo);
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const savedScrollLeft = window.sessionStorage.getItem(
      PODCAST_TAB_SCROLL_KEY,
    );
    if (savedScrollLeft) {
      const parsedScrollLeft = Number(savedScrollLeft);
      if (Number.isFinite(parsedScrollLeft)) {
        nav.scrollLeft = parsedScrollLeft;
      }
    }

    const updateScrollState = () => {
      const maxScroll = nav.scrollWidth - nav.clientWidth;
      setCanScrollLeft(nav.scrollLeft > 4);
      setCanScrollRight(maxScroll - nav.scrollLeft > 4);
      window.sessionStorage.setItem(
        PODCAST_TAB_SCROLL_KEY,
        String(nav.scrollLeft),
      );
    };

    updateScrollState();
    nav.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      window.sessionStorage.setItem(
        PODCAST_TAB_SCROLL_KEY,
        String(nav.scrollLeft),
      );
      nav.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    const activeTab = activeTabRef.current;
    if (!nav || !activeTab) return;

    if (!hasInitializedTabPositionRef.current) {
      activeTab.scrollIntoView({
        behavior: "auto",
        inline: "center",
        block: "nearest",
      });
      hasInitializedTabPositionRef.current = true;
      return;
    }

    const navRect = nav.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    const isTabOutOfView =
      tabRect.left < navRect.left || tabRect.right > navRect.right;

    if (isTabOutOfView) {
      activeTab.scrollIntoView({
        behavior: "auto",
        inline: "nearest",
        block: "nearest",
      });
    }
  }, [location.pathname, activeTabRef]);

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
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 pb-0">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="flex items-center gap-4">
              {showBackButton && (
                <button
                  onClick={() => navigate("/nav")}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-white/[0.03] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all group"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-0.5 transition-transform" />
                </button>
              )}

              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent-primary/10 rounded-xl border border-accent-primary/20 shadow-[0_0_15px_rgba(var(--color-accent-primary-rgb),0.15)]">
                  <Headphones className="w-5 h-5 text-accent-primary" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold font-serif text-white tracking-wide leading-tight">
                    {title || "Podcast"}
                  </h1>
                  <p className="hidden sm:block text-[10px] text-white/40 font-mono uppercase tracking-widest mt-0.5">
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
          <div className="relative">
            <nav
              ref={navRef}
              className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto w-full no-scrollbar pb-0"
            >
              <button
                ref={libraryTabRef}
                onClick={() => navigate("/podcast")}
                className={`flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  isLibrary
                    ? "border-accent-primary text-accent-primary"
                    : "border-transparent text-white/40 hover:text-white hover:bg-white/[0.02] rounded-t-lg"
                }`}
              >
                <Library className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Library</span>
              </button>

              <button
                ref={searchTabRef}
                onClick={() => navigate("/podcast/search")}
                className={`flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  isSearch
                    ? "border-accent-primary text-accent-primary"
                    : "border-transparent text-white/40 hover:text-white hover:bg-white/[0.02] rounded-t-lg"
                }`}
              >
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Search</span>
              </button>

              <button
                ref={downloadsTabRef}
                onClick={() => navigate("/podcast/downloads")}
                className={`flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  isDownloads
                    ? "border-accent-primary text-accent-primary"
                    : "border-transparent text-white/40 hover:text-white hover:bg-white/[0.02] rounded-t-lg"
                }`}
              >
                <CloudOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Downloads</span>
                {offlineCount > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 text-[9px] rounded-full font-mono ${isDownloads ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/20" : "bg-white/10 text-white/60 border border-white/10"}`}
                  >
                    {offlineCount}
                  </span>
                )}
              </button>

              <button
                ref={favoritesTabRef}
                onClick={() => navigate("/podcast/favorites")}
                className={`flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  isFavorites
                    ? "border-accent-primary text-accent-primary"
                    : "border-transparent text-white/40 hover:text-white hover:bg-white/[0.02] rounded-t-lg"
                }`}
              >
                <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Favorites</span>
              </button>

              <button
                ref={playlistsTabRef}
                onClick={() => navigate("/podcast/playlists")}
                className={`flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  isPlaylists
                    ? "border-accent-primary text-accent-primary"
                    : "border-transparent text-white/40 hover:text-white hover:bg-white/[0.02] rounded-t-lg"
                }`}
              >
                <ListMusic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Playlists</span>
              </button>
            </nav>

            {canScrollLeft && (
              <div className="pointer-events-none absolute left-0 top-0 h-full w-7 bg-gradient-to-r from-[#0a0f0d] via-[#0a0f0d]/85 to-transparent sm:hidden" />
            )}
            {canScrollRight && (
              <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-[#0a0f0d] via-[#0a0f0d]/90 to-transparent sm:hidden flex items-center justify-end pr-1.5">
                <div className="flex items-center gap-1 text-white/45">
                  <span className="h-1 w-1 rounded-full bg-white/45" />
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 pb-32 relative z-10">
        {children}
      </main>
    </div>
  );
}
