// @ts-nocheck
import { useState } from "react";
import { X, Sparkles, Check } from "lucide-react";
import { TOPIC_CATEGORIES } from "./recommendUtils";

/**
 * Recommend Modal - User preferences for article recommendations
 */
const RecommendModal = ({ isOpen, onClose, onApply, initialPrefs }) => {
  // Initialize state from initialPrefs when provided
  const [selectedTopics, setSelectedTopics] = useState(
    () => initialPrefs?.topics || [],
  );
  const [customKeywords, setCustomKeywords] = useState(
    () => initialPrefs?.customKeywords || "",
  );

  // Sync state when modal opens with new initialPrefs
  // Using a key-based reset pattern instead of useEffect with setState
  const modalKey = isOpen ? "open" : "closed";

  const toggleTopic = (label) => {
    setSelectedTopics((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label],
    );
  };

  const handleApply = () => {
    onApply({
      topics: selectedTopics,
      customKeywords,
    });
    onClose();
  };

  const handleClear = () => {
    setSelectedTopics([]);
    setCustomKeywords("");
  };

  const handleClose = () => {
    // Reset to initial prefs on close without apply
    setSelectedTopics(initialPrefs?.topics || []);
    setCustomKeywords(initialPrefs?.customKeywords || "");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[101] flex items-center justify-center p-4"
        key={modalKey}
      >
        <div className="w-full max-w-lg bg-[#0c1418] border border-white/10 rounded-2xl shadow-2xl animate-in zoom-in-95 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center">
                <Sparkles size={20} className="text-accent-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary">
                  Personalize Feed
                </h2>
                <p className="text-sm text-text-secondary">
                  Select topics you're interested in
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Topic Tags */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-3">
                Popular Topics
              </label>
              <div className="flex flex-wrap gap-2">
                {TOPIC_CATEGORIES.map((cat) => {
                  const isSelected = selectedTopics.includes(cat.label);
                  return (
                    <button
                      key={cat.label}
                      onClick={() => toggleTopic(cat.label)}
                      title={cat.description}
                      className={`
                        px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                        ${
                          isSelected
                            ? "bg-accent-primary text-bg-base shadow-lg shadow-accent-primary/25"
                            : "bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary border border-white/10"
                        }
                      `}
                    >
                      {isSelected && (
                        <Check size={14} className="inline mr-1" />
                      )}
                      {cat.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-text-tertiary mt-2">
                Hover over a topic to see what it includes
              </p>
            </div>

            {/* Custom Keywords */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-3">
                Custom Keywords{" "}
                <span className="text-text-tertiary">(comma separated)</span>
              </label>
              <input
                type="text"
                value={customKeywords}
                onChange={(e) => setCustomKeywords(e.target.value)}
                placeholder="e.g., climate change, cryptocurrency"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary/50 transition-colors"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-white/10 bg-white/[0.02]">
            <button
              onClick={handleClear}
              className="px-4 py-2 text-sm text-text-tertiary hover:text-text-primary transition-colors"
            >
              Clear All
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-accent-primary text-bg-base hover:bg-accent-primary/90 transition-colors shadow-lg shadow-accent-primary/25"
              >
                Apply Preferences
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RecommendModal;
