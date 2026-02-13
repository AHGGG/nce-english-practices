import UnifiedArticleListView from "../shared/UnifiedArticleListView";
import { BookOpen } from "lucide-react";

interface StudyProgress {
  studied_count: number;
  total: number;
}

interface ArticleItem {
  source_id: string;
  title: string;
  preview?: string;
  status?: "completed" | "in_progress" | "read" | "new";
  word_count?: number;
  last_read?: string;
  last_studied_at?: string;
  study_progress?: StudyProgress;
}

interface BookItem {
  filename?: string;
  id?: string;
  title: string;
  size_bytes: number;
}

interface ArticleListViewProps {
  articles: ArticleItem[];
  isLoading?: boolean;
  books?: BookItem[];
  selectedBookFilename?: string;
  onBookSelect: (filename: string) => void;
  onArticleClick: (sourceId: string) => void;
}

const ArticleListView = (props: ArticleListViewProps) => {
  return (
    <UnifiedArticleListView
      {...props}
      title="Reading Mode"
      icon={BookOpen}
      showSearch={true}
      showRecommend={true}
      showStats={true}
      // Map Reading Mode specific props to Unified props if names differ
      // ReadingMode passes: articles, isLoading, books, selectedBookFilename, onBookSelect, onArticleClick
      selectedBookId={props.selectedBookFilename}
      onArticleSelect={props.onArticleClick}
    />
  );
};

export default ArticleListView;
