import React from "react";
import { Text, View, StyleSheet } from "react-native";

interface SimpleMarkdownProps {
  children: string;
  style?: any;
}

/**
 * A lightweight Markdown renderer for React Native.
 * Supports:
 * - Bold: **text**
 * - Italic: *text*
 * - Bullet points: - item
 * - Numbered lists: 1. item (rendered as simple text for now)
 */
export const SimpleMarkdown: React.FC<SimpleMarkdownProps> = ({
  children,
  style,
}) => {
  if (!children) return null;

  const lines = children.split("\n");

  return (
    <View>
      {lines.map((line, index) => {
        // Check for headers
        const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
        if (headerMatch) {
          const level = headerMatch[1].length;
          const content = headerMatch[2];
          // Parse formatting inside header too (e.g. **Bold** in header)
          const parts = parseFormatting(content);

          return (
            <Text
              key={index}
              style={[
                style,
                styles.header,
                styles[`h${level}` as keyof typeof styles],
              ]}
            >
              {parts.map((part, i) => (
                <Text
                  key={i}
                  style={[
                    part.bold && styles.bold,
                    part.italic && styles.italic,
                  ]}
                >
                  {part.text}
                </Text>
              ))}
            </Text>
          );
        }

        // Check for bullet points
        const isBullet = line.trim().startsWith("- ");
        const isOrdered = /^\d+\.\s/.test(line.trim());

        let content = line;
        let prefix = "";

        if (isBullet) {
          content = line.trim().substring(2);
          prefix = "• ";
        } else if (isOrdered) {
          // Keep the number
        }

        // Parse bold and italic
        const parts = parseFormatting(content);

        return (
          <View
            key={index}
            style={[styles.line, isBullet && styles.bulletLine]}
          >
            {isBullet && <Text style={[style, styles.bullet]}>{prefix}</Text>}
            <Text style={[style, styles.text]}>
              {parts.map((part, i) => (
                <Text
                  key={i}
                  style={[
                    part.bold && styles.bold,
                    part.italic && styles.italic,
                  ]}
                >
                  {part.text}
                </Text>
              ))}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

function parseFormatting(text: string) {
  const parts: { text: string; bold?: boolean; italic?: boolean }[] = [];

  // Simple parser for **bold**
  // Note: This is a basic implementation and doesn't handle nested or complex markdown perfectly
  const boldSplit = text.split(/(\*\*.*?\*\*)/g);

  boldSplit.forEach((segment) => {
    if (segment.startsWith("**") && segment.endsWith("**")) {
      parts.push({
        text: segment.substring(2, segment.length - 2),
        bold: true,
      });
    } else {
      // Check for italic *text* within non-bold segments
      const italicSplit = segment.split(/(\*.*?\*)/g);
      italicSplit.forEach((subSegment) => {
        if (subSegment.startsWith("*") && subSegment.endsWith("*")) {
          parts.push({
            text: subSegment.substring(1, subSegment.length - 1),
            italic: true,
          });
        } else {
          if (subSegment) parts.push({ text: subSegment });
        }
      });
    }
  });

  return parts;
}

const styles = StyleSheet.create({
  line: {
    flexDirection: "row",
    marginBottom: 4,
    flexWrap: "wrap",
  },
  header: {
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 12,
    color: "#E0E0E0",
  },
  h1: { fontSize: 24 },
  h2: { fontSize: 20 },
  h3: { fontSize: 18 },
  h4: { fontSize: 16 },
  h5: { fontSize: 14 },
  h6: { fontSize: 12 },
  bulletLine: {
    paddingLeft: 8,
  },
  bullet: {
    marginRight: 4,
    opacity: 0.7,
  },
  text: {
    flex: 1,
    lineHeight: 24,
  },
  bold: {
    fontWeight: "bold",
  },
  italic: {
    fontStyle: "italic",
  },
});
