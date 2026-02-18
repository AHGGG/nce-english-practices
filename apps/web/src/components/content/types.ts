import { ReactNode } from "react";

// ============================================================
// Source & Block Types (Mirror backend enums)
// ============================================================

export type SourceType =
  | "epub"
  | "podcast"
  | "rss"
  | "plain_text"
  | "audiobook" // Phase 2
  | "comic"; // Phase 3

export type BlockType =
  | "paragraph"
  | "image"
  | "heading"
  | "subtitle"
  | "audio_segment"; // Phase 2

export interface ContentCapabilities {
  has_catalog?: boolean;
  has_units?: boolean;
  has_text?: boolean;
  has_segments?: boolean;
  has_audio?: boolean;
  has_images?: boolean;
  has_timeline?: boolean;
  has_region_alignment?: boolean;
  supports_tts_fallback?: boolean;
  supports_highlight?: boolean;
  supports_sentence_study?: boolean;
}

// ============================================================
// Content Block
// ============================================================

export interface ContentBlock {
  type: BlockType;

  // For paragraph/heading/subtitle
  text?: string;
  sentences?: string[];

  // For image
  image_path?: string;
  alt?: string;
  caption?: string;

  // For heading
  level?: number;

  // For audio_segment (Phase 2)
  audio_url?: string;
  start_time?: number;
  end_time?: number;
}

// ============================================================
// Content Bundle (Main data structure)
// ============================================================

export interface ContentBundle {
  id: string;
  source_type: SourceType;
  title: string;

  // Primary content
  blocks: ContentBlock[];

  // Optional fields
  language?: string;
  audio_url?: string;
  thumbnail_url?: string;
  published_at?: string;
  full_text?: string;
  source_url?: string;
  metadata?: Record<string, any> & { capabilities?: ContentCapabilities };

  // Frontend-enriched fields (added by hooks)
  highlightSet?: Set<string>;
  studyWordSet?: Set<string>;
  studyPhraseSet?: Set<string>;
  unclearSentenceMap?: Record<number, UnclearSentenceInfo>;
}

// ============================================================
// Unclear Sentence Info
// ============================================================

export interface UnclearSentenceInfo {
  sentence_index: number;
  unclear_choice: "vocabulary" | "grammar" | "both";
  max_simplify_stage?: number;
}

// ============================================================
// Reading Tracker Ref
// ============================================================

export interface ReadingTrackerRef {
  sessionId: number | null;
  onSentenceView: (index: number) => void;
  onWordClick: () => void;
  onInteraction: () => void;
}

// ============================================================
// Renderer Props
// ============================================================

export interface ContentRendererProps {
  /** 内容数据 */
  bundle: ContentBundle;

  /** 词汇高亮集合 */
  highlightSet?: Set<string>;

  /** 学习单词集合 (looked up during study - amber underline) */
  studyWordSet?: Set<string>;

  /** 学习短语集合 (looked up during study - amber background) */
  studyPhraseSet?: Set<string>;

  /** 已知词汇集合 */
  knownWords?: Set<string>;

  /** 是否显示高亮 */
  showHighlights?: boolean;

  /** 获取句子的搭配词组回调 */
  getCollocations?: (sentence: string) => Collocation[];

  /** 不清楚句子映射 */
  unclearSentenceMap?: Record<number, UnclearSentenceInfo>;

  /** 词汇点击回调 */
  onWordClick?: (word: string, sentence: string) => void;

  /** 句子点击回调 */
  onSentenceClick?: (sentence: string, meta?: any) => void;

  /** 图片点击回调 */
  onImageClick?: (src: string, alt?: string, caption?: string) => void;

  /** 自动转写回调 (Audiobook) */
  onTranscribe?: () => Promise<void>;

  /** 转写状态 (Audiobook) */
  isTranscribing?: boolean;

  /** 阅读追踪器 */
  tracker?: ReadingTrackerRef;

  /** 可见内容数量（渐进加载） */
  visibleCount?: number;

  /** 文章元数据（用于构建图片 URL 等） */
  metadata?: Record<string, any>;
}

// ============================================================
// Collocation
// ============================================================

export interface Collocation {
  reasoning?: string;
  text: string;
  key_word: string;
  start_word_idx: number;
  end_word_idx: number;
  difficulty?: 1 | 2 | 3;
  confidence?: number;
}

// ============================================================
// Content Renderer Interface
// ============================================================

export interface ContentRenderer {
  /**
   * 判断是否可以渲染该内容类型
   */
  canRender(bundle: ContentBundle): boolean;

  /**
   * 渲染内容
   */
  render(props: ContentRendererProps): ReactNode;

  /**
   * 可选：获取渲染器名称（用于调试）
   */
  readonly name?: string;
}

// ============================================================
// Audio Sync Types (Phase 2)
// ============================================================

export interface AudioSegment {
  index: number;
  text: string;
  sentences: string[];
  startTime: number;
  endTime: number;
}

export interface AudioSyncState {
  /** 当前播放时间 */
  currentTime: number;

  /** 是否正在播放 */
  isPlaying: boolean;

  /** 当前高亮的 segment index */
  activeSegmentIndex: number;

  /** 总时长 */
  duration: number;

  /** 播放速度 */
  playbackRate: number;
}

export interface AudioSyncActions {
  /** 播放/暂停 */
  togglePlay: () => void;

  /** 跳转到指定时间 */
  seekTo: (time: number) => void;

  /** 跳转到指定 segment */
  seekToSegment: (index: number) => void;

  /** 设置播放速度 */
  setPlaybackRate: (rate: number) => void;
}

export interface UseAudioSyncReturn {
  state: AudioSyncState;
  actions: AudioSyncActions;
  audioRef: React.RefObject<HTMLAudioElement>;
}

// ============================================================
// Comic Types (Phase 3)
// ============================================================

export interface BoundingBox {
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
}

export interface TextRegion {
  id: string;
  text: string;
  bounds: BoundingBox;
  confidence: number;
  reading_order: number;
}

export interface ComicPage {
  page_index: number;
  image_url: string;
  text_regions: TextRegion[];
  full_text?: string;
}

// ============================================================
// Shared Block Component Props
// ============================================================

export interface SentenceBlockProps {
  /** 句子文本 */
  text: string;

  /** 词汇高亮集合 (COCA/CET vocabulary) */
  highlightSet?: Set<string>;

  /** 学习单词集合 (looked up during study - amber underline) */
  studyWordSet?: Set<string>;

  /** 学习短语集合 (looked up during study - amber background) */
  studyPhraseSet?: Set<string>;

  /** 已知词汇 */
  knownWords?: Set<string>;

  /** 是否显示高亮 */
  showHighlights?: boolean;

  /** 搭配词组 */
  collocations?: Collocation[];

  /** 不清楚句子信息 */
  unclearInfo?: UnclearSentenceInfo;
}

export interface ImageBlockProps {
  /** 图片 URL */
  src: string;

  /** Alt 文本 */
  alt?: string;

  /** 图片说明 */
  caption?: string;

  /** 点击回调 */
  onImageClick?: (src: string, alt?: string, caption?: string) => void;
}

export interface HeadingBlockProps {
  /** 标题文本 */
  text: string;

  /** 标题级别 (1-4) */
  level: number;
}

export interface AudioSegmentBlockProps {
  /** Segment 数据 */
  segment: AudioSegment;

  /** 是否当前播放 */
  isActive: boolean;

  /** 词汇高亮集合 */
  highlightSet?: Set<string>;

  /** 学习高亮集合 */
  studyHighlightSet?: Set<string>;

  /** 是否显示高亮 */
  showHighlights?: boolean;

  /** 点击回调（跳转到该 segment） */
  onClick?: () => void;
}

// ============================================================
// Type Guards
// ============================================================

export function isTextContent(bundle: ContentBundle): boolean {
  return ["epub", "rss", "plain_text"].includes(bundle.source_type);
}

export function isAudioContent(bundle: ContentBundle): boolean {
  return ["podcast", "audiobook"].includes(bundle.source_type);
}

export function isComicContent(bundle: ContentBundle): boolean {
  return bundle.source_type === "comic";
}

export function hasAudioSegments(bundle: ContentBundle): boolean {
  return bundle.blocks.some((b) => b.type === "audio_segment");
}
