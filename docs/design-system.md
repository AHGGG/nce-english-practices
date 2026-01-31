# Frontend Design System ("Cyber-Noir")

## Philosophy

"Mental Gym" - High contrast, information-dense, no distractions.

## Tech Stack

- TailwindCSS + Lucide Icons + custom `index.css` utilities
- `react-chartjs-2` + `chart.js` for data visualization

## Design Tokens

### Colors

Uses semantic naming in `tailwind.config.js`:

- `bg-bg-base`, `bg-bg-surface`, `bg-bg-elevated`
- `text-text-primary`, `text-text-secondary`, `text-text-muted`
- `accent-primary` (green), `accent-warning` (yellow), `accent-danger` (red)

### Typography

- **Serif**: `Merriweather` for content
- **Mono**: `JetBrains Mono` for data/UI

### Source of Truth

- `src/index.css` (CSS Variables) mapped to Tailwind via `tailwind.config.js`

## Component Architecture

### Core UI (`src/components/ui/`)

Atomic components: Button, Input, Card, etc.

### Reading Mode (`src/components/reading/`)

| Component               | Description                      |
| ----------------------- | -------------------------------- |
| `ReadingMode.jsx`       | Main container with view routing |
| `ArticleListView.jsx`   | Article grid view                |
| `ReaderView.jsx`        | Article reader                   |
| `WordInspector.jsx`     | Word lookup modal                |
| `SentenceInspector.jsx` | Sentence explanation modal       |
| `Lightbox.jsx`          | Image viewer modal               |
| `MemoizedSentence.jsx`  | Performance-optimized sentence   |
| `MemoizedImage.jsx`     | Performance-optimized image      |

### Performance Report (`src/components/performance/`)

| Component               | Description                                  |
| ----------------------- | -------------------------------------------- |
| `PerformanceReport.jsx` | Main container                               |
| `cards/`                | KPI display components                       |
| `widgets/`              | Data visualization (Heatmap, Charts, Badges) |

### Shared Hooks (`src/hooks/`)

- `useWordExplainer.js`: Unified dictionary + LLM context explanation logic (Shared by Reading/SentenceStudy)

### Shared Utils (`src/utils/`)

- `sseParser.js`: Unified SSE stream parser supporting JSON (chunks) and Text (raw) streams

## Design Rule

**ALWAYS** prefer using:

1. `components/ui` primitives (Button, Card, Tag)
2. Semantic tokens (`accent-primary`, `text-muted`)

**AVOID** using raw Tailwind classes like `text-green-500` or undefined tokens like `category-green`.

### Available Category Colors

- `orange`, `blue`, `amber`, `red`, `gray`, `indigo`, `yellow`
- **NO `green`** - use `accent-success` or `accent-primary` instead
