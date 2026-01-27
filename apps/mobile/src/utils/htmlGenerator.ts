import { ContentBlock, ArticleDetail } from "../modules/study/types";

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
  font-family: 'Merriweather', serif;
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
  padding: 10px;
  text-align: center;
}

.image-caption {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 8px;
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

/* Header Badge */
.header-badge {
    display: inline-block;
    padding: 2px 8px;
    background: rgb(var(--color-accent-primary));
    color: black;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 10px;
    border-radius: 2px;
}

.meta-info {
    font-family: 'JetBrains Mono', monospace;
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

// Handle Word Clicks
document.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList.contains('word')) {
        const word = target.innerText;
        // Find parent sentence context
        const sentence = target.parentElement.innerText;
        notifyNative('wordClick', { word, sentence });
        
        // Add temporary active class
        document.querySelectorAll('.word').forEach(el => el.style.backgroundColor = '');
        target.style.backgroundColor = 'rgba(0, 255, 148, 0.2)';
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
  highlightSet?: Record<string, any>,
  studyHighlightSet?: Record<string, any>,
) {
  // Split by regex capturing delimiters
  const parts = text.split(/(\s+|[.,!?;:"'()])/);

  return parts
    .map((part) => {
      const isWord = /^[a-zA-Z\u00C0-\u00FF]+$/.test(part);
      if (!isWord) return `<span>${part}</span>`;

      const cleanWord = part.toLowerCase();
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
        classes += " highlight-new";
      }

      return `<span class="${classes}">${part}</span>`;
    })
    .join("");
}

export function generateArticleHTML(
  article: ArticleDetail,
  showHighlights: boolean,
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
            ?.map(
              (s) =>
                `<span class="sentence" data-index="${globalSentenceIndex++}">${renderSentence(s, article.highlightSet, article.studyHighlightSet)}</span>`,
            )
            .join(" ");
          return `<p>${sentencesHtml}</p>`;
        case "image":
          return `
                    <div class="image-container">
                        <div class="image-caption">[Image: ${block.alt}]</div>
                        <div class="image-caption">(Images load via Native View in future)</div>
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
    <link href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
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
