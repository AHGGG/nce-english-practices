import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import { GlobalProvider } from "./context/GlobalContext";
import { DictionaryProvider } from "./context/DictionaryContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Auth Pages
import { LoginPage, RegisterPage } from "./views/auth";

// Main Pages
import PerformanceReport from "./views/PerformanceReport";
import StudyTimeDetail from "./views/StudyTimeDetail";
import VoiceLab from "./views/VoiceLab";
import AUIStreamingDemo from "./views/AUIStreamingDemo";
import VoiceMode from "./views/VoiceMode";
import ReadingMode from "./views/ReadingMode";
import NavDashboard from "./views/NavDashboard";
import LabCalibration from "./components/lab/LabCalibration";
import SentenceStudy from "./components/sentence-study";
import ReviewQueue from "./views/ReviewQueue";
import ReviewDebug from "./views/ReviewDebug";
import MemoryCurveDebug from "./views/MemoryCurveDebug";
import SettingsPage from "./views/SettingsPage";
import WeakPointsView from "./views/WeakPointsView";

// Podcast
import { PodcastProvider } from "./context/PodcastContext";

import PlayerBar from "./components/podcast/PlayerBar";
import PodcastLibraryView from "./views/podcast/PodcastLibraryView";
import PodcastSearchView from "./views/podcast/PodcastSearchView";
import PodcastFeedDetailView from "./views/podcast/PodcastFeedDetailView";
import PodcastDownloadsView from "./views/podcast/PodcastDownloadsView";
import PodcastFavoritesView from "./views/podcast/PodcastFavoritesView";
import PodcastPlaylistsView from "./views/podcast/PodcastPlaylistsView";
import PodcastPlaylistDetailView from "./views/podcast/PodcastPlaylistDetailView";

// Audiobook
import { AudiobookLibraryView, AudiobookPlayerView } from "./views/audiobook";

// Unified Player
import UnifiedPlayerView from "./views/player/UnifiedPlayerView";

/**
 * Public Route - Redirects to nav if already authenticated
 */
function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth() as {
    isAuthenticated: boolean;
    loading: boolean;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <div className="w-12 h-12 border-4 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/nav" replace />;
  }

  return children;
}

function AppRoutes() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return (
    <Routes>
      {/* Auth routes (public only) */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/nav"
        element={
          <ProtectedRoute>
            <NavDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/voice-lab"
        element={
          <ProtectedRoute>
            <VoiceLab />
          </ProtectedRoute>
        }
      />
      <Route
        path="/voice"
        element={
          <ProtectedRoute>
            <VoiceMode />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reading"
        element={
          <ProtectedRoute>
            <ReadingMode />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sentence-study"
        element={
          <ProtectedRoute>
            <SentenceStudy />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lab/calibration"
        element={
          <ProtectedRoute>
            <LabCalibration />
          </ProtectedRoute>
        }
      />
      <Route
        path="/performance"
        element={
          <ProtectedRoute>
            <PerformanceReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/performance/time"
        element={
          <ProtectedRoute>
            <StudyTimeDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/aui-stream-demo"
        element={
          <ProtectedRoute>
            <AUIStreamingDemo />
          </ProtectedRoute>
        }
      />
      <Route
        path="/review-queue"
        element={
          <ProtectedRoute>
            <ReviewQueue />
          </ProtectedRoute>
        }
      />
      <Route
        path="/performance/debug"
        element={
          <ProtectedRoute>
            <ReviewDebug />
          </ProtectedRoute>
        }
      />
      <Route
        path="/performance/memory-debug"
        element={
          <ProtectedRoute>
            <MemoryCurveDebug />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/weak-points"
        element={
          <ProtectedRoute>
            <WeakPointsView />
          </ProtectedRoute>
        }
      />

      <Route
        path="/podcast"
        element={
          <ProtectedRoute>
            <PodcastLibraryView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/podcast/search"
        element={
          <ProtectedRoute>
            <PodcastSearchView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/podcast/feed/:feedId"
        element={
          <ProtectedRoute>
            <PodcastFeedDetailView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/podcast/downloads"
        element={
          <ProtectedRoute>
            <PodcastDownloadsView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/podcast/favorites"
        element={
          <ProtectedRoute>
            <PodcastFavoritesView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/podcast/playlists"
        element={
          <ProtectedRoute>
            <PodcastPlaylistsView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/podcast/playlist/:playlistId"
        element={
          <ProtectedRoute>
            <PodcastPlaylistDetailView />
          </ProtectedRoute>
        }
      />

      {/* Audiobook routes */}
      <Route
        path="/audiobook"
        element={
          <ProtectedRoute>
            <AudiobookLibraryView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audiobook/:bookId"
        element={
          <ProtectedRoute>
            <AudiobookPlayerView />
          </ProtectedRoute>
        }
      />

      {/* Unified Player route (Podcast intensive listening + Audiobook) */}
      <Route
        path="/player/:sourceType/:contentId"
        element={
          <ProtectedRoute>
            <UnifiedPlayerView />
          </ProtectedRoute>
        }
      />

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/nav" replace />} />
      <Route
        path="/profile-stats"
        element={<Navigate to="/performance" replace />}
      />
      <Route path="*" element={<Navigate to="/nav" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <GlobalProvider>
        <DictionaryProvider>
          <PodcastProvider>
            <BrowserRouter>
              <AppRoutes />
              <PlayerBar />
            </BrowserRouter>
          </PodcastProvider>
        </DictionaryProvider>
      </GlobalProvider>
    </AuthProvider>
  );
}

export default App;
