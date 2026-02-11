/**
 * BookShelfView - Book Selection Grid
 * Shows all available EPUB books for Sentence Study
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, BookOpen, Loader2, GraduationCap } from "lucide-react";
import { usePodcast } from "../../../context/PodcastContext";

const BookShelfView = ({ books = [], loading = false, onSelectBook }) => {
  const { currentEpisode } = usePodcast();
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-[#0a0f0d] text-white font-sans relative overflow-hidden">
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

      <header className="relative z-10 h-16 border-b border-white/[0.05] flex items-center px-6 md:px-8 bg-[#0a0f0d]/80 backdrop-blur-xl">
        <button
          onClick={() => navigate("/nav")}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/[0.03] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all group mr-4"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
        </button>
        <div className="p-2 bg-accent-primary/10 rounded-lg border border-accent-primary/20 mr-3">
          <GraduationCap className="w-5 h-5 text-accent-primary" />
        </div>
        <h1 className="text-sm font-bold uppercase tracking-widest text-white/80">
          Sentence Study Library
        </h1>
      </header>

      <main
        className={`relative z-10 flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 ${currentEpisode ? "pb-32" : ""}`}
      >
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-serif font-bold text-white mb-2">
              My Bookshelf
            </h2>
            <p className="text-white/40 text-sm font-mono uppercase tracking-wider">
              Select a book to start studying.
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-accent-primary" />
              <span className="text-xs font-mono uppercase tracking-widest text-white/40">
                Loading Library...
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map((book, i) => (
                <button
                  key={i}
                  onClick={() => onSelectBook(book)}
                  className="group relative text-left p-6 border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-accent-primary/30 transition-all rounded-2xl flex flex-col h-full overflow-hidden hover:shadow-2xl hover:shadow-black/50 hover:-translate-y-1"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:bg-accent-primary/10 group-hover:border-accent-primary/20 transition-colors">
                    <BookOpen className="w-6 h-6 text-white/60 group-hover:text-accent-primary transition-colors" />
                  </div>

                  <h3 className="font-serif text-xl text-white group-hover:text-accent-primary mb-3 line-clamp-2 leading-tight transition-colors">
                    {book.title}
                  </h3>

                  <div className="mt-auto pt-4 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-white/30 group-hover:text-white/50 transition-colors border-t border-white/5">
                    <span>EPUB Format</span>
                    <span>{(book.size_bytes / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                </button>
              ))}

              {books.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-24 border border-dashed border-white/10 rounded-3xl">
                  <p className="text-white/40 font-mono mb-4">
                    No books found in library.
                  </p>
                  <button className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold uppercase tracking-wider transition-all">
                    Refresh Library
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default BookShelfView;
