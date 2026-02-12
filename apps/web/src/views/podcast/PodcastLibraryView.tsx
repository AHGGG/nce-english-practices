/**
 * Podcast Library View - Shows subscribed podcasts with enhanced styling.
 */

import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Plus,
  RefreshCw,
  Upload,
  Download,
  Headphones,
  Loader2,
  Rss,
  X,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import * as podcastApi from "../../api/podcast";
import PodcastLayout from "../../components/podcast/PodcastLayout";
import RecentlyPlayed from "../../components/podcast/RecentlyPlayed";
import { useToast } from "../../components/ui";

interface PodcastFeed {
  id: number;
  title: string;
  author?: string | null;
  image_url?: string | null;
  episode_count?: number;
}

interface ImportProgressState {
  current: number;
  total: number;
  title: string;
}

interface ImportEvent {
  type?: string;
  current?: number;
  total?: number;
  title?: string;
}

interface ImportReportError {
  title?: string;
  rss_url: string;
  error: string;
}

interface ImportReport {
  imported: number;
  skipped: number;
  failed: number;
  total: number;
  errors?: ImportReportError[];
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Unknown error";
};

export default function PodcastLibraryView() {
  const navigate = useNavigate();
  const [feeds, setFeeds] = useState<PodcastFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Import progress state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgressState>({
    current: 0,
    total: 0,
    title: "",
  });
  const [importReport, setImportReport] = useState<ImportReport | null>(null);

  const { addToast } = useToast();

  useEffect(() => {
    loadFeeds();
  }, []);

  async function loadFeeds() {
    try {
      setLoading(true);
      const data = (await podcastApi.getSubscriptions()) as PodcastFeed[];
      setFeeds(data);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleImportOPML(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input
    e.target.value = "";

    try {
      setImporting(true);
      setImportProgress({ current: 0, total: 0, title: "Parsing OPML..." });

      const result = (await podcastApi.importOPMLStreaming(
        file,
        (event: ImportEvent) => {
          switch (event.type) {
            case "start":
              setImportProgress({
                current: 0,
                total: event.total ?? 0,
                title: "Starting import...",
              });
              break;
            case "progress":
              setImportProgress({
                current: event.current ?? 0,
                total: event.total ?? 0,
                title: event.title ?? "",
              });
              break;
            case "complete":
              setImportProgress({
                current: event.total ?? 0,
                total: event.total ?? 0,
                title: "Complete!",
              });
              break;
          }
        },
      )) as ImportReport;

      // Show detailed status
      const statusType = result.failed > 0 ? "warning" : "success";
      addToast(
        `Import Complete: ${result.imported} imported, ${result.skipped} skipped, ${result.failed} failed (Total: ${result.total})`,
        statusType,
      );

      if (result.failed > 0 && result.errors && result.errors.length > 0) {
        setImportReport(result);
      }

      loadFeeds();
    } catch (err: unknown) {
      addToast("Import failed: " + getErrorMessage(err), "error");
    } finally {
      setImporting(false);
    }
  }

  async function handleExportOPML() {
    try {
      const blob = await podcastApi.exportOPML();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "podcasts.opml";
      a.click();
      URL.revokeObjectURL(url);
      addToast("OPML export started", "info");
    } catch (err: unknown) {
      addToast("Export failed: " + getErrorMessage(err), "error");
    }
  }

  return (
    <PodcastLayout title="My Library">
      {/* Import Progress Overlay */}
      {importing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-bg-surface border border-border rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
                <h3 className="text-lg font-medium text-text-primary">
                  Importing Podcasts
                </h3>
              </div>

              {importProgress.total > 0 && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Progress</span>
                      <span className="text-accent-primary font-mono">
                        {importProgress.current} / {importProgress.total}
                      </span>
                    </div>
                    <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-300"
                        style={{
                          width: `${(importProgress.current / importProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <p
                    className="text-sm text-text-muted truncate"
                    title={importProgress.title}
                  >
                    {importProgress.title}
                  </p>
                </>
              )}

              {importProgress.total === 0 && (
                <p className="text-sm text-text-muted">
                  {importProgress.title || "Parsing OPML file..."}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import Report Modal */}
      {importReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-bg-surface border border-border rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-text-primary">
                    Import Report
                  </h3>
                  <p className="text-sm text-text-muted">
                    {importReport.imported} imported, {importReport.skipped}{" "}
                    skipped,{" "}
                    <span className="text-red-400">
                      {importReport.failed} failed
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setImportReport(null)}
                className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm text-text-muted bg-bg-elevated/50 p-4 rounded-lg">
                <span className="text-accent-primary">Tip:</span>
                <span>
                  Failed feeds often require a proxy or have invalid SSL
                  certificates. We've attempted to auto-retry with relaxed
                  security.
                </span>
              </div>

              <div className="space-y-3">
                {(importReport.errors ?? []).map((err, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-2"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h4 className="font-medium text-text-primary">
                        {err.title || "Unknown Feed"}
                      </h4>
                      <a
                        href={err.rss_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent-primary hover:underline flex items-center gap-1 shrink-0"
                      >
                        RSS <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="text-xs font-mono text-text-muted break-all bg-black/20 p-2 rounded">
                      {err.rss_url}
                    </div>
                    <p className="text-sm text-red-400">Error: {err.error}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-end">
              <button
                onClick={() => setImportReport(null)}
                className="px-6 py-2 bg-bg-elevated hover:bg-bg-elevated/80 text-text-primary rounded-lg transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Action bar */}
          <div className="flex items-center justify-between">
            <p className="text-text-muted text-sm">
              {feeds.length} subscriptions
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={loadFeeds}
                className="p-2 text-text-muted hover:text-accent-primary transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <label
                className="p-2 text-text-muted hover:text-accent-primary transition-colors cursor-pointer"
                title="Import OPML"
              >
                <Upload className="w-4 h-4" />
                <input
                  type="file"
                  accept=".opml,.xml"
                  onChange={handleImportOPML}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleExportOPML}
                className="p-2 text-text-muted hover:text-accent-primary transition-colors"
                title="Export OPML"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {/* Empty state */}
          {feeds.length === 0 && !error && (
            <div className="text-center py-16 space-y-6">
              <div className="inline-flex p-6 bg-gradient-to-br from-accent-primary/10 to-accent-secondary/10 rounded-2xl">
                <Rss className="w-16 h-16 text-accent-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-medium text-text-primary">
                  No podcasts yet
                </h3>
                <p className="text-text-muted max-w-sm mx-auto">
                  Search for your favorite podcasts or import your existing
                  subscriptions via OPML.
                </p>
              </div>
              <button
                onClick={() => navigate("/podcast/search")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-accent-primary to-accent-secondary text-black font-medium rounded-lg hover:shadow-lg hover:shadow-accent-primary/20 transition-all"
              >
                <Plus className="w-5 h-5" />
                Find Podcasts
              </button>
            </div>
          )}

          {/* Recently Played */}
          {feeds.length > 0 && <RecentlyPlayed />}

          {/* Grid of podcasts */}
          {feeds.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
              {feeds.map((feed) => (
                <Link
                  key={feed.id}
                  to={`/podcast/feed/${feed.id}`}
                  className="group block bg-[#0a0f0d]/40 backdrop-blur-md border border-white/10 hover:border-accent-primary/50 transition-all duration-300 rounded-2xl overflow-hidden hover:shadow-[0_0_30px_rgba(var(--color-accent-primary-rgb),0.15)] hover:-translate-y-1"
                >
                  <div className="aspect-square relative overflow-hidden">
                    {feed.image_url ? (
                      <img
                        src={feed.image_url}
                        alt={feed.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/0 flex items-center justify-center">
                        <Headphones className="w-12 h-12 text-white/20" />
                      </div>
                    )}
                    {/* Dynamic Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f0d] via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />

                    {/* Play Indicator */}
                    <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-primary/20 border border-accent-primary/50 backdrop-blur-md shadow-lg">
                        <div className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
                        <span className="text-[10px] font-bold tracking-wider text-accent-primary font-mono">
                          VIEW FEED
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <h3
                      className="font-serif font-bold text-white line-clamp-1 text-base mb-1.5 group-hover:text-accent-primary transition-colors"
                      title={feed.title}
                    >
                      {feed.title}
                    </h3>
                    <p className="text-xs text-white/50 truncate mb-3 font-mono">
                      {feed.author || "Unknown Author"}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-white/40 group-hover:text-white/70 transition-colors">
                        {feed.episode_count || 0} EPS
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </PodcastLayout>
  );
}
