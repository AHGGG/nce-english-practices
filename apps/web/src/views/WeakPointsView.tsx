import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronDown,
  Search,
  Filter,
  BookOpen,
  Link2,
  Clock,
  Brain,
  Calendar,
  Loader2,
  ArrowDown,
} from "lucide-react";

import {
  getUnfamiliarItems,
  type UnfamiliarItem,
  type UnfamiliarItemType,
  type UnfamiliarSortType,
} from "../api/client";

const WeakPointsView = () => {
  const PAGE_SIZE = 40;
  const navigate = useNavigate();
  const requestIdRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<UnfamiliarItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [typeFilter, setTypeFilter] = useState<UnfamiliarItemType>("all");
  const [sort, setSort] = useState<UnfamiliarSortType>("recent");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [openMenu, setOpenMenu] = useState<"type" | "sort" | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [expandedContexts, setExpandedContexts] = useState<Set<string>>(
    new Set(),
  );

  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!filterMenuRef.current) return;
      const target = event.target;
      if (target instanceof Node && !filterMenuRef.current.contains(target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  const loadItems = async ({ append }: { append: boolean }) => {
    const requestId = ++requestIdRef.current;
    const nextOffset = append ? items.length : 0;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      const data = await getUnfamiliarItems(
        typeFilter,
        sort,
        PAGE_SIZE,
        nextOffset,
        debouncedQuery,
      );

      if (requestIdRef.current !== requestId) return;

      const received = data.items || [];
      const merged = append ? [...items, ...received] : received;
      setItems(merged);
      setTotal(data.total || 0);
      setHasMore(merged.length < (data.total || 0));
    } catch (e) {
      console.error("Failed to load unfamiliar items:", e);
      if (requestIdRef.current === requestId) {
        setError("Failed to load weak points. Please refresh.");
        if (!append) {
          setItems([]);
          setTotal(0);
          setHasMore(false);
        }
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    loadItems({ append: false });
    setExpandedItems(new Set());
    setExpandedContexts(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, sort, debouncedQuery]);

  const filteredItems = items;

  const getItemKey = (item: UnfamiliarItem) => `${item.item_type}:${item.text}`;

  const toggleItemExpanded = (itemKey: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemKey)) {
        next.delete(itemKey);
      } else {
        next.add(itemKey);
      }
      return next;
    });
  };

  const allExpanded = useMemo(() => {
    if (filteredItems.length === 0) return false;
    return filteredItems.every((item) => expandedItems.has(getItemKey(item)));
  }, [filteredItems, expandedItems]);

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedItems(new Set());
      return;
    }
    setExpandedItems(new Set(filteredItems.map((item) => getItemKey(item))));
  };

  const typeOptions: { value: UnfamiliarItemType; label: string }[] = [
    { value: "all", label: "All Types" },
    { value: "word", label: "Words" },
    { value: "phrase", label: "Phrases" },
  ];

  const sortOptions: { value: UnfamiliarSortType; label: string }[] = [
    { value: "recent", label: "Most Recent" },
    { value: "count", label: "Most Seen" },
    { value: "difficulty", label: "Most Difficult" },
  ];

  const renderDropdown = <T extends string>({
    icon,
    value,
    options,
    isOpen,
    onToggle,
    onSelect,
    prefix,
  }: {
    icon: ReactNode;
    value: T;
    options: { value: T; label: string }[];
    isOpen: boolean;
    onToggle: () => void;
    onSelect: (next: T) => void;
    prefix: string;
  }) => {
    const active = options.find((option) => option.value === value);
    return (
      <div className="relative">
        <button
          type="button"
          onClick={onToggle}
          className="w-full h-[42px] flex items-center gap-2 px-3 rounded-lg bg-black/20 border border-white/10 hover:border-white/25 transition-colors"
        >
          <span className="text-white/40">{icon}</span>
          <span className="text-sm text-white/90 truncate">
            {prefix}: {active?.label}
          </span>
          <ChevronDown
            className={`w-4 h-4 ml-auto text-white/40 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 mt-2 rounded-xl border border-white/15 bg-[#0f1614] shadow-2xl overflow-hidden z-40">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onSelect(option.value);
                  setOpenMenu(null);
                }}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                  option.value === value
                    ? "bg-accent-primary/20 text-accent-primary"
                    : "text-white/80 hover:bg-white/10"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const stats = useMemo(() => {
    const wordCount = items.filter((item) => item.item_type === "word").length;
    const phraseCount = items.filter(
      (item) => item.item_type === "phrase",
    ).length;
    const inQueueCount = items.filter((item) => item.in_review_queue).length;
    return { wordCount, phraseCount, inQueueCount };
  }, [items]);

  return (
    <section className="min-h-screen bg-[#0a0f0d] text-white relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-b from-[#0a1418] via-[#0c1815] to-[#0a0f0d]" />
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-radial from-emerald-900/20 via-transparent to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-gradient-radial from-teal-900/10 via-transparent to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-3 md:px-6 py-4 md:py-6 pb-14 md:pb-16">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/nav")}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-accent-primary font-bold">
                Personal Data Hub
              </p>
              <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight">
                Weak Points
              </h1>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 md:gap-2 w-full md:w-auto">
            <div className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-center min-w-[78px]">
              <p className="text-[10px] text-white/50 uppercase tracking-widest">
                Words
              </p>
              <p className="text-sm md:text-base font-mono font-bold text-accent-primary">
                {stats.wordCount}
              </p>
            </div>
            <div className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-center min-w-[78px]">
              <p className="text-[10px] text-white/50 uppercase tracking-widest">
                Phrases
              </p>
              <p className="text-sm md:text-base font-mono font-bold text-accent-info">
                {stats.phraseCount}
              </p>
            </div>
            <div className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-center min-w-[78px]">
              <p className="text-[10px] text-white/50 uppercase tracking-widest">
                In Queue
              </p>
              <p className="text-sm md:text-base font-mono font-bold text-accent-warning">
                {stats.inQueueCount}
              </p>
            </div>
          </div>
        </header>

        <div
          ref={filterMenuRef}
          className="relative z-30 bg-white/5 border border-white/10 rounded-2xl p-3 md:p-4 mb-4 backdrop-blur-sm"
        >
          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_220px] gap-2">
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/20 border border-white/10 h-[42px]">
              <Search className="w-4 h-4 text-white/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search weak points"
                className="w-full bg-transparent outline-none text-sm placeholder:text-white/30"
              />
            </label>

            {renderDropdown<UnfamiliarItemType>({
              icon: <Filter className="w-4 h-4" />,
              value: typeFilter,
              options: typeOptions,
              isOpen: openMenu === "type",
              onToggle: () =>
                setOpenMenu((current) => (current === "type" ? null : "type")),
              onSelect: setTypeFilter,
              prefix: "Type",
            })}

            {renderDropdown<UnfamiliarSortType>({
              icon: <Clock className="w-4 h-4" />,
              value: sort,
              options: sortOptions,
              isOpen: openMenu === "sort",
              onToggle: () =>
                setOpenMenu((current) => (current === "sort" ? null : "sort")),
              onSelect: setSort,
              prefix: "Sort",
            })}
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-[11px] text-white/40 font-mono tracking-wider uppercase">
            {loading
              ? "Loading..."
              : `${filteredItems.length} loaded / ${total} total unfamiliar items`}
          </div>
          {!loading && filteredItems.length > 0 && (
            <button
              type="button"
              onClick={toggleExpandAll}
              className="text-[11px] px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              {allExpanded ? "Collapse All" : "Expand All"}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-white/50 gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Building your weak-point map...</span>
          </div>
        ) : error ? (
          <div className="p-6 rounded-xl border border-accent-danger/30 bg-accent-danger/10 text-accent-danger">
            {error}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-10 rounded-2xl border border-white/10 bg-white/5 text-center text-white/50">
            No items found for current filters.
          </div>
        ) : (
          <div className="relative z-0 space-y-2.5">
            {filteredItems.map((item) => (
              <article
                key={getItemKey(item)}
                role="button"
                tabIndex={0}
                onClick={() => toggleItemExpanded(getItemKey(item))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleItemExpanded(getItemKey(item));
                  }
                }}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-3 md:p-4 backdrop-blur-sm cursor-pointer hover:border-white/25 transition-colors"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold ${
                          item.item_type === "phrase"
                            ? "bg-accent-info/15 text-accent-info border border-accent-info/30"
                            : "bg-accent-primary/15 text-accent-primary border border-accent-primary/30"
                        }`}
                      >
                        {item.item_type}
                      </span>
                      {item.in_review_queue && (
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-accent-warning/15 text-accent-warning border border-accent-warning/30">
                          in review queue
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg md:text-xl font-serif font-bold text-white break-words leading-tight">
                      {item.text}
                    </h2>
                    <div className="mt-1.5 flex items-center gap-2.5 text-[11px] md:text-xs text-white/50 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <Brain className="w-3.5 h-3.5" />
                        Seen {item.encounter_count} times
                      </span>
                      {item.last_seen_at && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Last:{" "}
                          {new Date(item.last_seen_at).toLocaleDateString()}
                        </span>
                      )}
                      {item.difficulty_score != null && (
                        <span className="font-mono">
                          Difficulty: {item.difficulty_score.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-white/50 text-right shrink-0 flex flex-col items-end gap-1">
                    <p className="font-mono">Rep: {item.review_repetition}</p>
                    {item.next_review_at && (
                      <p className="font-mono">
                        Next:{" "}
                        {new Date(item.next_review_at).toLocaleDateString()}
                      </p>
                    )}
                    <span className="inline-flex items-center gap-1 text-[10px] text-white/60">
                      Details
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${expandedItems.has(getItemKey(item)) ? "rotate-180" : ""}`}
                      />
                    </span>
                  </div>
                </div>

                {expandedItems.has(getItemKey(item)) && (
                  <>
                    {item.source_types.length > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        {item.source_types.map((source) => (
                          <span
                            key={`${item.text}:${source}`}
                            className="px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider bg-white/5 border border-white/10 text-white/50"
                          >
                            {source}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.sample_contexts.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {item.sample_contexts.map((ctx, idx) => {
                          const contextKey = `${item.text}:ctx:${idx}`;
                          const isExpanded = expandedContexts.has(contextKey);
                          const needsTruncation =
                            ctx.context_sentence.length > 200;
                          return (
                            <div
                              key={contextKey}
                              className="rounded-lg border border-white/10 bg-black/20 p-2.5"
                            >
                              <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1 flex items-center gap-1.5 flex-wrap">
                                <BookOpen className="w-3 h-3" />
                                {ctx.source_type}
                                {ctx.source_id && (
                                  <span className="inline-flex items-center gap-1">
                                    <Link2 className="w-3 h-3" />
                                    <span className="truncate max-w-[240px]">
                                      {ctx.source_id}
                                    </span>
                                  </span>
                                )}
                              </div>
                              <p className="text-[13px] md:text-sm text-white/75 leading-relaxed">
                                {!isExpanded && needsTruncation
                                  ? ctx.context_sentence.slice(0, 200) + "..."
                                  : ctx.context_sentence}
                                {needsTruncation && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedContexts((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(contextKey)) {
                                          next.delete(contextKey);
                                        } else {
                                          next.add(contextKey);
                                        }
                                        return next;
                                      });
                                    }}
                                    className="ml-1 text-accent-primary hover:underline text-xs"
                                  >
                                    {isExpanded ? "收起" : "展开"}
                                  </button>
                                )}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </article>
            ))}

            {hasMore && (
              <div className="pt-3 flex justify-center">
                <button
                  onClick={() => loadItems({ append: true })}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/15 text-white/80 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-60"
                >
                  {loadingMore ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowDown className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">Load More</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default WeakPointsView;
