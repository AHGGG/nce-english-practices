export interface Book {
  code: string;
  name: string;
}

export interface Article {
  id: number;
  title: string;
  author: string;
  content: string; // Preview text
  created_at: string;
  updated_at: string;
  book_code: string;
  source_id: string;
  status: "new" | "in_progress" | "completed" | "read";
  study_progress?: {
    total: number;
    current_index: number;
  };
}

// New types for Article Detail
export interface ContentBlock {
  type: "paragraph" | "heading" | "image" | "subtitle";
  text?: string;
  sentences?: string[];
  level?: number; // For headings
  image_path?: string;
  alt?: string;
  caption?: string;
}

export interface ArticleDetail extends Article {
  blocks: ContentBlock[];
  sentence_count: number;
  word_count: number;
  highlightSet?: Record<string, number>; // Word -> Status (0=Unknown, 1=Studying, etc) or just existence
  studyHighlightSet?: Record<string, boolean>; // Words currently in study queue
  metadata: {
    filename: string;
    [key: string]: any;
  };
}
