import { escapeHtml } from "../../utils/security";

interface MarkdownMessageProps {
  content?: string;
}

const MarkdownMessage = ({ content }: MarkdownMessageProps) => {
  if (!content) return null;

  // Simple replacement for bold/italic/code basics without a heavy lib
  // In production, use react-markdown
  const processText = (text: string): string => {
    // First escape HTML to prevent XSS
    const safeText = escapeHtml(text);

    // Then apply markdown formatting to the safe text
    return safeText
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-neon-green">$1</strong>')
      .replace(
        /`([^`]+)`/g,
        '<code class="bg-bg-elevated border border-border px-1 rounded text-neon-pink font-mono text-xs">$1</code>',
      )
      .replace(/\n/g, "<br/>");
  };

  return (
    <div
      className="p-4 bg-bg-elevated border border-border rounded-lg font-serif text-ink leading-relaxed shadow-sm max-w-xl"
      dangerouslySetInnerHTML={{ __html: processText(content) }}
    />
  );
};

export default MarkdownMessage;
