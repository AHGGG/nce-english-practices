import React from "react";
import UnifiedArticleListView from "../../shared/UnifiedArticleListView";
import { BookOpen } from "lucide-react";

const ArticleListView = (props) => {
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
