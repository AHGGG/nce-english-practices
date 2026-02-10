import React from "react";
import UnifiedArticleListView from "../shared/UnifiedArticleListView";
import { BookOpen } from "lucide-react";

const ArticleListView = (props) => {
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
