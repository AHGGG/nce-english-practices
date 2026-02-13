import UnifiedArticleListView from "../../shared/UnifiedArticleListView";
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
  selectedBook?: BookItem | null;
  articles: ArticleItem[];
  loading?: boolean;
  onBack?: () => void;
  onSelectArticle: (sourceId: string) => void;
  books?: BookItem[];
  onSelectBook: (bookFilename: string) => void;
}

const ArticleListView = (props: ArticleListViewProps) => {
  // Extract ID from selectedBook object if present
  const selectedBookId = props.selectedBook?.filename || props.selectedBook?.id;

  return (
    <UnifiedArticleListView
      {...props}
      title="Sentence Study"
      icon={BookOpen}
      showSearch={false} // Maybe enable later if desired, but keep simple for now as per original
      showRecommend={false}
      showStats={false} // Original didn't have the same stats bar
      // Prop Mapping
      isLoading={props.loading}
      selectedBookId={selectedBookId}
      onBookSelect={props.onSelectBook}
      onArticleSelect={props.onSelectArticle}
      onBack={props.onBack}
    />
  );
};

export default ArticleListView;
