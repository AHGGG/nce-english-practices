/**
 * Cyber-Noir Color System
 *
 * These are the raw color values that power the design system.
 * They are used to generate both CSS variables and Tailwind config.
 */

export const colors = {
  // ============================================
  // Background Hierarchy (OLED-optimized)
  // ============================================
  bg: {
    base: "#050505", // Pure black for OLED
    surface: "#0A0A0A", // Card backgrounds
    elevated: "#121212", // Modal backgrounds
  },

  // ============================================
  // Text Hierarchy
  // ============================================
  text: {
    primary: "#E0E0E0", // Main content
    secondary: "#888888", // Supporting text
    muted: "#555555", // Disabled/hints
  },

  // ============================================
  // Borders
  // ============================================
  border: {
    default: "#1A1A1A",
    subtle: "#0F0F0F",
  },

  // ============================================
  // Accent Colors (RGB triplets for alpha support)
  // ============================================
  accent: {
    primary: "0 255 148", // Matrix Green #00FF94
    danger: "255 68 68", // #FF4444
    info: "59 130 246", // #3B82F6
    warning: "255 184 0", // #FFB800
    success: "0 255 148", // Same as primary
  },

  // ============================================
  // Neon Colors (RGB triplets)
  // ============================================
  neon: {
    green: "0 255 148", // #00FF94
    cyan: "0 212 255", // #00D4FF
    purple: "155 89 182", // #9B59B6
    pink: "255 0 128", // #FF0080
    lime: "180 255 0", // #B4FF00
    magenta: "255 0 255", // #FF00FF
    yellow: "255 230 0", // #FFE600
    gold: "255 215 0", // #FFD700
  },

  // ============================================
  // Category Colors (RGB triplets)
  // ============================================
  category: {
    orange: "249 115 22", // #F97316
    blue: "59 130 246", // #3B82F6
    amber: "245 158 11", // #F59E0B
    red: "239 68 68", // #EF4444
    gray: "107 114 128", // #6B7280
    indigo: "99 102 241", // #6366F1
    yellow: "234 179 8", // #EAB308
  },

  // ============================================
  // Light Theme (for dictionary popups etc.)
  // ============================================
  light: {
    surface: "#FFFFFF",
    border: "#E5E5E5",
    text: "#1A1A1A",
    textMuted: "#666666",
  },
} as const;

export type ColorTokens = typeof colors;
