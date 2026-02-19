import { ContentBlock, ArticleDetail } from "@nce/shared";
import { normalizePhrase } from "@nce/shared";

interface CollocationItem {
  text: string;
  start_word_idx: number;
  end_word_idx: number;
  difficulty?: number;
  confidence?: number;
  isStudiedPhrase?: boolean;
}

type CollocationMap = Record<string, CollocationItem[]>;

const CSS_STYLES = `
:root {
  --color-bg-base: #050505;
  --color-bg-surface: #0A0A0A;
  --color-text-primary: #E0E0E0;
  --color-text-secondary: #888888;
  --color-text-muted: #666666;
  --color-accent-primary: 0 255 148;
  --color-accent-warning: 245 158 11;
  --color-accent-info: 6 182 212;
}

body {
  background-color: var(--color-bg-base);
  color: var(--color-text-primary);
  font-family: 'Charter', 'Georgia', 'Times New Roman', serif;
  margin: 0;
  padding: 24px;
  padding-bottom: 100px;
  line-height: 2;
  font-size: 18px;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3 {
  font-weight: bold;
  line-height: 1.3;
  margin-top: 2rem;
  margin-bottom: 1rem;
}

h1 { font-size: 32px; color: var(--color-text-primary); }
h2 { font-size: 24px; color: var(--color-text-primary); }
h3 { font-size: 20px; color: var(--color-text-secondary); }

.subtitle {
  font-size: 18px;
  font-style: italic;
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
}

.image-container {
  margin: 2rem 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #333;
  background: var(--color-bg-surface);
  text-align: center;
}
.image-container img {
  max-width: 100%;
  height: auto;
  display: block;
}

.image-caption {
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  color: var(--color-text-muted);
  padding: 8px;
  font-style: italic;
}

/* Word Interaction */
.word {
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 2px 0;
  border-radius: 2px;
}

/* Active State (tapped) */
.word:active {
  background-color: rgba(var(--color-accent-primary), 0.2);
  color: rgb(var(--color-accent-primary));
}

/* Highlight States */
.highlight-studying {
  color: rgb(var(--color-accent-warning));
  background-color: rgba(var(--color-accent-warning), 0.1);
  font-weight: bold;
}

.highlight-new {
  color: rgb(var(--color-accent-info));
}

.highlight-collocation {
  border-bottom: 2px dashed rgb(var(--color-accent-warning));
  color: rgb(var(--color-accent-warning));
  background-color: rgba(var(--color-accent-warning), 0.08);
}

/* Unclear Sentence (Dashed Underline) */
.sentence[data-unclear="true"] {
  border-bottom: 1px dashed rgb(var(--color-accent-warning));
  cursor: help;
}

/* Header Badge */
.header-badge {
    display: inline-block;
    padding: 2px 8px;
    background: rgb(var(--color-accent-primary));
    color: black;
    font-family: 'Menlo', 'Consolas', monospace;
    font-size: 10px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 10px;
    border-radius: 2px;
}

.meta-info {
    font-family: 'Menlo', 'Consolas', monospace;
    font-size: 12px;
    color: var(--color-text-muted);
    margin-bottom: 2rem;
    padding-left: 1rem;
    border-left: 2px solid rgb(var(--color-accent-primary));
}
`;

const JS_SCRIPT = `
// Bridge to React Native / Web Parent
function notifyNative(type, payload) {
    const message = JSON.stringify({ type, payload });
    
    if (window.ReactNativeWebView) {
        // Native (iOS/Android)
        window.ReactNativeWebView.postMessage(message);
    } else {
        // Web (iframe)
        window.parent.postMessage(message, '*');
    }
}

// Handle Clicks (Delegation)
document.addEventListener('click', (e) => {
    const target = e.target;
    
    // 1. Word Click
    if (target.classList.contains('word')) {
        e.stopPropagation(); // Prevent bubbling to sentence
        const word = target.innerText;
        const sentence = target.closest('.sentence')?.innerText || target.parentElement.innerText;
        notifyNative('wordClick', { word, sentence });
        
        // Visual feedback
        document.querySelectorAll('.word').forEach(el => el.style.backgroundColor = '');
        target.style.backgroundColor = 'rgba(0, 255, 148, 0.2)';
        return;
    }

    // 2. Image Click
    if (target.tagName === 'IMG') {
        e.stopPropagation();
        notifyNative('imageClick', { src: target.src });
        return;
    }

    // 3. Sentence Click (for Unclear Sentences)
    const sentenceEl = target.closest('.sentence');
    if (sentenceEl && sentenceEl.getAttribute('data-unclear') === 'true') {
        const sentenceText = sentenceEl.innerText;
        const index = sentenceEl.getAttribute('data-index');
        notifyNative('sentenceClick', { text: sentenceText, index });
    }
});

// Intersection Observer for Tracking
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const index = entry.target.getAttribute('data-index');
            if (index !== null) {
                notifyNative('sentenceView', parseInt(index, 10));
            }
        }
    });
}, {
    root: null, // viewport
    rootMargin: '0px',
    threshold: 0.5 // 50% visible
});

// Start observing
document.querySelectorAll('.sentence').forEach(el => observer.observe(el));

// Expose function to update highlights from Native
window.updateHighlights = (showHighlights) => {
    document.body.classList.toggle('show-highlights', showHighlights);
};
`;

function renderSentence(
  text: string,
  highlightSet?: Record<string, number>, // rank
  studyHighlightSet?: Record<string, boolean>,
  studyPhraseSet?: Set<string>,
  highlightFilter: { min: number; max: number } = { min: 0, max: 99999 },
  collocations: CollocationItem[] = [],
) {
  const words = text.split(" ");
  const collocationByWordIndex: Array<CollocationItem | null> = new Array(
    words.length,
  ).fill(null);
  const usedIndices = new Set<number>();

  const hasStudiedPhrase = (phraseText: string) => {
    const normalized = normalizePhrase(phraseText);
    if (!normalized) return false;
    if (studyPhraseSet?.has(normalized)) return true;
    if (!studyHighlightSet) return false;
    if (Object.prototype.hasOwnProperty.call(studyHighlightSet, normalized)) {
      return true;
    }
    return Object.keys(studyHighlightSet).some(
      (candidate) => normalizePhrase(candidate) === normalized,
    );
  };

  const sortedCollocations = [...(collocations || [])]
    .map((item) => ({ ...item, isStudiedPhrase: hasStudiedPhrase(item.text) }))
    .sort((a, b) => {
      if (a.isStudiedPhrase !== b.isStudiedPhrase) {
        return a.isStudiedPhrase ? -1 : 1;
      }
      const aLen = a.end_word_idx - a.start_word_idx;
      const bLen = b.end_word_idx - b.start_word_idx;
      if (aLen !== bLen) return bLen - aLen;
      const aConfidence = Number(a.confidence || 0);
      const bConfidence = Number(b.confidence || 0);
      return bConfidence - aConfidence;
    });

  sortedCollocations.forEach((collocation) => {
    if (
      typeof collocation.start_word_idx !== "number" ||
      typeof collocation.end_word_idx !== "number"
    ) {
      return;
    }

    let overlap = false;
    for (
      let i = collocation.start_word_idx;
      i <= collocation.end_word_idx;
      i += 1
    ) {
      if (usedIndices.has(i)) {
        overlap = true;
        break;
      }
    }
    if (overlap) return;

    for (
      let i = collocation.start_word_idx;
      i <= collocation.end_word_idx;
      i += 1
    ) {
      if (i >= 0 && i < words.length) {
        collocationByWordIndex[i] = collocation;
        usedIndices.add(i);
      }
    }
  });

  const rendered: string[] = [];
  let i = 0;

  while (i < words.length) {
    const collocation = collocationByWordIndex[i];

    if (collocation && i === collocation.start_word_idx) {
      const phraseWords = words.slice(
        collocation.start_word_idx,
        collocation.end_word_idx + 1,
      );
      const phraseText = phraseWords.join(" ");
      const studiedClass = collocation.isStudiedPhrase
        ? " highlight-studying"
        : "";
      rendered.push(
        `<span class="word highlight-collocation${studiedClass}" data-collocation="true">${phraseText}</span>`,
      );
      i = collocation.end_word_idx + 1;
      continue;
    }

    if (collocation) {
      i += 1;
      continue;
    }

    const part = words[i];
    const cleanWord = part
      .toLowerCase()
      .replace(/^[^a-zA-Z']+|[^a-zA-Z']+$/g, "");
    const isWord = /^[a-zA-Z\u00C0-\u00FF'-]+$/.test(cleanWord);

    if (!isWord) {
      rendered.push(`<span>${part}</span>`);
      i += 1;
      continue;
    }

    let classes = "word";
    if (
      studyHighlightSet &&
      Object.prototype.hasOwnProperty.call(studyHighlightSet, cleanWord)
    ) {
      classes += " highlight-studying";
    } else if (
      highlightSet &&
      Object.prototype.hasOwnProperty.call(highlightSet, cleanWord)
    ) {
      const rank = highlightSet[cleanWord];
      if (rank >= highlightFilter.min && rank < highlightFilter.max) {
        classes += " highlight-new";
      }
    }

    rendered.push(`<span class="${classes}">${part}</span>`);
    i += 1;
  }

  return rendered.join(" ");
}

export function generateArticleHTML(
  article: ArticleDetail,
  showHighlights: boolean,
  baseUrl: string = "",
  highlightFilter: { min: number; max: number } = { min: 0, max: 99999 },
  collocationsBySentence: CollocationMap = {},
) {
  let globalSentenceIndex = 0;

  const contentHtml = article.blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
          return `<h${block.level || 2}>${block.text}</h${block.level || 2}>`;
        case "subtitle":
          return `<div class="subtitle">${block.text}</div>`;
        case "paragraph":
          const sentencesHtml = block.sentences
            ?.map((s) => {
              const idx = globalSentenceIndex++;
              const isUnclear = article.unclearSentenceMap?.[idx];
              const sentenceCollocations = collocationsBySentence[s] || [];
              // Use data-unclear attribute for detection
              return `<span class="sentence" data-index="${idx}" data-unclear="${!!isUnclear}">${renderSentence(s, article.highlightSet, article.studyHighlightSet, article.studyPhraseSet, highlightFilter, sentenceCollocations)}</span>`;
            })
            .join(" ");
          return `<p>${sentencesHtml}</p>`;
        case "image":
          const imageUrl = `${baseUrl}/api/content/asset?source_id=${encodeURIComponent(article.id || "")}&path=${encodeURIComponent(block.image_path || "")}`;
          return `
                    <div class="image-container">
                        <img src="${imageUrl}" alt="${block.alt || "Article Image"}" loading="lazy" />
                        ${block.caption ? `<div class="image-caption">${block.caption}</div>` : ""}
                    </div>
                `;
        default:
          return "";
      }
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        ${CSS_STYLES}
        ${showHighlights ? "" : ".highlight-studying, .highlight-new { color: inherit; background-color: transparent; font-weight: normal; }"}
    </style>
</head>
<body class="${showHighlights ? "show-highlights" : ""}">
    <div class="header-badge">Reading Mode</div>
    <h1>${article.title}</h1>
    <div class="meta-info">
        ${article.sentence_count} SENTENCES • ${article.word_count || 0} WORDS
    </div>

    ${contentHtml}

    <script>
        ${JS_SCRIPT}
    </script>
</body>
</html>
    `;
}
