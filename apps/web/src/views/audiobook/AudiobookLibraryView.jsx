/**
 * AudiobookLibraryView - List all available audiobooks
 */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Book, Headphones, Loader2 } from "lucide-react";
import { authFetch } from "../../api/auth";

export default function AudiobookLibraryView() {
  const navigate = useNavigate();
  const [audiobooks, setAudiobooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAudiobooks = async () => {
      try {
        const res = await authFetch("/api/content/audiobook/");
        if (!res.ok) throw new Error("Failed to fetch audiobooks");
        const data = await res.json();
        setAudiobooks(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAudiobooks();
  }, []);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      {/* Header */}
      <header className="sticky top-0 z-50 h-16 border-b border-white/[0.05] flex items-center px-6 bg-bg-base/80 backdrop-blur-xl">
        <button
          onClick={() => navigate("/nav")}
          className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors group px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-xs font-bold uppercase tracking-widest">
            Home
          </span>
        </button>

        <h1 className="ml-6 text-lg font-bold tracking-tight">Audiobooks</h1>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-text-muted">
            <p className="text-lg mb-2">Failed to load audiobooks</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : audiobooks.length === 0 ? (
          <div className="text-center py-20 text-text-muted">
            <Book className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No audiobooks found</p>
            <p className="text-sm">
              Add audiobooks to <code>resources/audiobooks/</code>
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {audiobooks.map((book) => (
              <button
                key={book.id}
                onClick={() => navigate(`/audiobook/${book.id}`)}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-accent-primary/50 hover:bg-accent-primary/5 transition-all text-left group"
              >
                <div className="p-3 rounded-lg bg-accent-primary/10 text-accent-primary group-hover:bg-accent-primary group-hover:text-black transition-colors">
                  <Headphones className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">
                    {book.title}
                  </h3>
                  {book.author && (
                    <p className="text-sm text-text-muted truncate">
                      by {book.author}
                    </p>
                  )}
                </div>
                {book.has_subtitles && (
                  <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">
                    Subtitles
                  </span>
                )}
                {book.track_count > 1 && (
                  <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-full">
                    {book.track_count} tracks
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
