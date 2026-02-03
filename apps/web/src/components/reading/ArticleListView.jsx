import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  ChevronLeft,
  Loader2,
  Check,
  Clock,
  BookOpenCheck,
  Zap,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

/**
 * Get status styling based on article status
 */
const getStatusConfig = (status) => {
  switch (status) {
    case "completed":
      return {
        borderClass: "border-accent-primary/50",
        badgeClass:
          "bg-accent-primary/10 text-accent-primary border-accent-primary/30",
        badgeText: "COMPLETED",
        Icon: Check,
        iconClass: "text-accent-primary",
      };
    case "in_progress":
      return {
        borderClass: "border-accent-warning/40",
        badgeClass:
          "bg-accent-warning/10 text-accent-warning border-accent-warning/30",
        badgeText: "IN PROGRESS",
        Icon: Clock,
        iconClass: "text-accent-warning",
      };
    case "read":
      return {
        borderClass: "border-text-secondary/40",
        badgeClass:
          "bg-text-secondary/10 text-text-secondary border-text-secondary/30",
        badgeText: "READ",
        Icon: BookOpenCheck,
        iconClass: "text-text-secondary",
      };
    default: // 'new' or undefined
      return {
        borderClass: "border-border",
        badgeClass: null,
        badgeText: null,
        Icon: null,
        iconClass: null,
      };
  }
};

/**
 * Article List View - Library grid showing available articles
 */
const ArticleListView = ({
  articles,
  isLoading,
  books = [],
  selectedBookFilename,
  onBookSelect,
  onArticleClick,
}) => {
  const navigate = useNavigate();
  const [isBookMenuOpen, setIsBookMenuOpen] = useState(false);

  // Find current book title
  const currentBook = books.find((b) => b.filename === selectedBookFilename);
  const currentBookTitle = currentBook ? currentBook.title : "Library";
  // Separate completed and non-completed articles
  const completedArticles = articles.filter((a) => a.status === "completed");
  const nonCompletedArticles = articles.filter((a) => a.status !== "completed");
  const [now] = useState(() => Date.now());

  const renderArticleCard = (article, idx, showOriginalIndex = false) => {
    const statusConfig = getStatusConfig(article.status);
    const displayIdx = showOriginalIndex
      ? articles.indexOf(article) + 1
      : idx + 1;

    // Check if recently accessed (within 24 hours)
    const lastActivity = Math.max(
      new Date(article.last_read || 0).getTime(),
      new Date(article.last_studied_at || 0).getTime(),
    );
    const isRecent = lastActivity > now - 24 * 60 * 60 * 1000;

    return (
      <button
        key={article.source_id}
        onClick={() => onArticleClick(article.source_id)}
        className={`group relative flex flex-col items-start text-left p-6 md:p-8 bg-white/[0.02] backdrop-blur-sm border ${statusConfig.borderClass} hover:border-accent-primary/50 transition-all duration-500 h-full hover:shadow-[0_10px_40px_-10px_rgba(var(--color-accent-primary-rgb),0.1)] hover:-translate-y-1 rounded-2xl overflow-hidden`}
      >
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        {/* Corner Index + Status Icon */}
        <div className="absolute top-0 right-0 p-4 flex items-center gap-2">
          {statusConfig.Icon && (
            <statusConfig.Icon size={14} className={statusConfig.iconClass} />
          )}
          <span className="opacity-30 text-[10px] font-mono text-white/50 group-hover:text-accent-primary transition-colors">
            {String(displayIdx).padStart(2, "0")}
          </span>
        </div>

        <div className="relative z-10 flex items-center gap-2 mb-6 w-full">
          <span className="px-2 py-1 bg-white/5 text-accent-primary text-[10px] font-bold uppercase tracking-wider border border-white/10 group-hover:border-accent-primary/50 rounded transition-colors">
            Chapter {displayIdx}
          </span>
          {/* Status Badge */}
          {statusConfig.badgeText && (
            <span
              className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider border rounded ${statusConfig.badgeClass}`}
            >
              {statusConfig.badgeText}
            </span>
          )}
          {/* Recent Badge */}
          {isRecent && (
            <span className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider border rounded bg-orange-500/10 text-orange-500 border-orange-500/30 flex items-center gap-1">
              <Zap size={8} /> RECENT
            </span>
          )}
        </div>

        <h3 className="relative z-10 text-xl md:text-2xl font-serif font-bold text-white group-hover:text-accent-primary transition-colors mb-4 line-clamp-3 leading-tight min-h-[3rem]">
          {article.title}
        </h3>

        <p className="relative z-10 text-sm text-white/60 line-clamp-3 leading-relaxed font-sans mb-8 flex-grow">
          {article.preview}
        </p>

        {/* Footer with progress or action hint */}
        <div className="relative z-10 mt-auto pt-4 border-t border-white/5 w-full flex justify-between items-center group-hover:border-accent-primary/20 transition-colors">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">
            {article.study_progress
              ? `${article.study_progress.studied_count}/${article.study_progress.total} studied`
              : article.word_count
                ? `${article.word_count} words`
                : "Read Article"}
          </span>
          <span className="text-accent-primary text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 flex items-center gap-1">
            {article.status === "completed" ? "Review" : "Read Now"}{" "}
            <ChevronLeft size={12} className="rotate-180" />
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-sans selection:bg-accent-primary selection:text-bg-base">
      {/* GLOBAL NOISE TEXTURE OVERLAY */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-50 bg-[url('/noise.svg')]"></div>

      {/* Ambient Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-accent-primary/5 blur-[120px] rounded-full mix-blend-screen opacity-50" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-accent-secondary/5 blur-[100px] rounded-full mix-blend-screen opacity-30" />
      </div>

      {/* HEADER SECTION */}
      <header className="relative z-[60] border-b border-white/[0.05] bg-bg-base/50 backdrop-blur-xl px-6 md:px-12 py-8 flex justify-between items-end sticky top-0">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate("/nav")}
              className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-3 py-1 rounded-full bg-accent-primary/10 border border-accent-primary/20 flex items-center gap-2">
              <BookOpen size={12} className="text-accent-primary" />
              <span className="text-accent-primary text-[10px] font-bold tracking-[0.2em] uppercase">
                Reading Mode
              </span>
            </div>
          </div>

          {/* Book Selector (Dropdown) */}
          <div className="relative">
            <button
              onClick={() => setIsBookMenuOpen(!isBookMenuOpen)}
              className="group flex items-center gap-3 text-3xl md:text-5xl font-serif font-bold text-white tracking-tight hover:text-accent-primary transition-colors text-left"
            >
              <span className="line-clamp-1">{currentBookTitle}</span>
              {books.length > 1 && (
                <ChevronDown
                  className={`w-6 h-6 md:w-8 md:h-8 opacity-50 group-hover:opacity-100 transition-transform duration-300 ${isBookMenuOpen ? "rotate-180" : ""}`}
                />
              )}
            </button>

            {/* Dropdown Menu */}
            {isBookMenuOpen && books.length > 0 && (
              <>
                <div
                  className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
                  onClick={() => setIsBookMenuOpen(false)}
                ></div>
                <div className="absolute left-0 top-full mt-4 w-[320px] md:w-[400px] max-w-[90vw] bg-[#0c1418] border border-white/10 shadow-2xl z-[70] animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl rounded-2xl overflow-hidden">
                  <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
                    {books.map((book) => (
                      <button
                        key={book.filename}
                        onClick={() => {
                          onBookSelect(book.filename);
                          setIsBookMenuOpen(false);
                        }}
                        className={`w-full text-left p-4 rounded-xl transition-all flex items-center justify-between group/item ${selectedBookFilename === book.filename ? "bg-accent-primary/10 border border-accent-primary/20" : "hover:bg-white/5 border border-transparent"}`}
                      >
                        <div className="flex flex-col gap-1">
                          <span
                            className={`font-serif font-bold text-lg leading-tight ${selectedBookFilename === book.filename ? "text-accent-primary" : "text-white"}`}
                          >
                            {book.title}
                          </span>
                          <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                            {(book.size_bytes / 1024 / 1024).toFixed(1)} MB
                          </span>
                        </div>
                        {selectedBookFilename === book.filename && (
                          <Check
                            size={18}
                            className="text-accent-primary flex-shrink-0 ml-4"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4">
          {/* Stats: Completed / Total */}
          {completedArticles.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.03] border border-accent-primary/30 rounded-xl backdrop-blur-md">
              <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center">
                <Check size={14} className="text-accent-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-white/40 uppercase tracking-wider leading-none mb-1">
                  Completed
                </span>
                <span className="text-sm font-bold text-accent-primary font-mono leading-none">
                  {completedArticles.length}/{articles.length}
                </span>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl backdrop-blur-md">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <BookOpen size={14} className="text-white/60" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-white/40 uppercase tracking-wider leading-none mb-1">
                Articles
              </span>
              <span className="text-sm font-bold text-white font-mono leading-none">
                {articles.length}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-6 md:px-12 py-12">
        {isLoading && articles.length === 0 ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-text-secondary" />
          </div>
        ) : (
          <>
            {/* Non-Completed Articles Section */}
            {nonCompletedArticles.length > 0 && (
              <>
                <h2 className="text-sm font-bold text-white/40 uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                  01. To Read
                  <div className="h-[1px] bg-white/10 flex-grow"></div>
                  <span className="text-white/60">
                    {nonCompletedArticles.length}
                  </span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1920px] mb-16">
                  {nonCompletedArticles.map((article, idx) =>
                    renderArticleCard(article, idx, true),
                  )}
                </div>
              </>
            )}

            {/* Completed Articles Section */}
            {completedArticles.length > 0 && (
              <>
                <h2 className="text-sm font-bold text-accent-primary/70 uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                  <Check size={14} className="text-accent-primary" />
                  Completed
                  <div className="h-[1px] bg-accent-primary/20 flex-grow"></div>
                  <span className="text-accent-primary">
                    {completedArticles.length}
                  </span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1920px]">
                  {completedArticles.map((article, idx) =>
                    renderArticleCard(article, idx, true),
                  )}
                </div>
              </>
            )}

            {/* Empty State */}
            {articles.length === 0 && (
              <div className="text-center py-20 text-white/30">
                <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
                <p>No articles available</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default ArticleListView;
