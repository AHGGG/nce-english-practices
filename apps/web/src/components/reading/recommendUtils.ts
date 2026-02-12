/**
 * Recommendation utilities - Topic matching and scoring algorithms
 *
 * Topics are now standardized from backend LLM analysis.
 * Matching is simple exact match.
 */

/**
 * Predefined topic categories - must match backend ALLOWED_TOPICS
 */
export const TOPIC_CATEGORIES = [
  { label: "Tech", description: "Technology, AI, Software, Digital" },
  { label: "Business", description: "Economy, Finance, Markets, Trade" },
  { label: "Politics", description: "Government, Policy, Elections" },
  { label: "Science", description: "Research, Climate, Space, Nature" },
  { label: "Culture", description: "Art, Music, Film, History, Society" },
  { label: "Health", description: "Medicine, Healthcare, Wellness" },
  { label: "World", description: "International, Geopolitics, Regions" },
  { label: "Sports", description: "Athletics, Competitions, Teams" },
];

interface RecommendationArticle {
  index?: number;
  sentence_count?: number;
  topics?: string[];
  title?: string;
  preview?: string;
}

/**
 * Check if an article matches a category (exact match)
 */
export const matchesCategory = (
  articleTopics: unknown,
  categoryLabel: string,
) => {
  if (!articleTopics || !Array.isArray(articleTopics)) return false;
  return articleTopics.includes(categoryLabel);
};

/**
 * Calculate recommendation score for an article
 */
export const calculateScore = (
  article: RecommendationArticle,
  selectedTopics: string[],
  customKeywords: string,
) => {
  let score = 0;

  // Base score: Small weight for original order
  score -= (article.index || 0) * 0.01;

  // Short article penalty (likely non-content like TOC, copyright)
  if ((article.sentence_count ?? 0) < 10) {
    score -= 50;
  }

  const articleTopics = article.topics || [];

  // Topic match bonus - exact match since topics are standardized
  selectedTopics.forEach((selectedLabel) => {
    if (matchesCategory(articleTopics, selectedLabel)) {
      score += 15; // Strong bonus for exact match
    }
  });

  // Custom keyword match bonus (search in title and preview)
  if (customKeywords && customKeywords.trim()) {
    const keywords = customKeywords
      .toLowerCase()
      .split(/[,\s]+/)
      .filter((k) => k.length > 1);

    keywords.forEach((kw: string) => {
      // Check in title (high weight)
      if (article.title && article.title.toLowerCase().includes(kw)) {
        score += 10;
      }
      // Check in preview (medium weight)
      if (article.preview && article.preview.toLowerCase().includes(kw)) {
        score += 5;
      }
    });
  }

  return score;
};
