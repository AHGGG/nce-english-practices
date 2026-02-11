/**
 * Typography System
 *
 * Font families and sizes for the Cyber-Noir design system.
 */

export const typography = {
  fontFamily: {
    // Serif - for reading content
    serif: ["Merriweather", "Georgia", "serif"],
    // Mono - for data/UI elements
    mono: ["JetBrains Mono", "Menlo", "monospace"],
    // Sans - for headings
    sans: ["Inter", "system-ui", "sans-serif"],
  },

  // Font weights
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },

  // Line heights
  lineHeight: {
    tight: "1.2",
    normal: "1.5",
    relaxed: "1.75",
    loose: "2",
  },
} as const;

export type TypographyTokens = typeof typography;
