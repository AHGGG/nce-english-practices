import React, { memo } from "react";
import type { HeadingBlockProps } from "../types";

/**
 * 标题渲染组件
 */

const headingStyles: Record<number, string> = {
  1: "text-3xl font-serif text-text-primary mt-10 mb-6",
  2: "text-2xl font-serif text-text-primary mt-8 mb-4",
  3: "text-xl font-serif text-text-secondary mt-6 mb-3",
  4: "text-lg font-serif text-text-secondary mt-4 mb-2",
};

export const HeadingBlock = memo(function HeadingBlock({
  text,
  level,
}: HeadingBlockProps) {
  const className = headingStyles[level] || headingStyles[2];

  // 使用对应的 HTML 标签
  const Tag = `h${Math.min(Math.max(level, 1), 6)}` as React.ElementType;

  return <Tag className={className}>{text}</Tag>;
});

export default HeadingBlock;
