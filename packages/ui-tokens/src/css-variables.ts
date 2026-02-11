/**
 * CSS Variables Generator
 *
 * Generates CSS custom properties from the color tokens.
 * Use this in your global CSS file.
 */

import { colors } from "./colors";

/**
 * Generate CSS variables string for the :root selector
 */
export function generateCSSVariables(): string {
  return `
:root {
  /* Background */
  --color-bg-base: ${colors.bg.base};
  --color-bg-surface: ${colors.bg.surface};
  --color-bg-elevated: ${colors.bg.elevated};
  
  /* Text */
  --color-text-primary: ${colors.text.primary};
  --color-text-secondary: ${colors.text.secondary};
  --color-text-muted: ${colors.text.muted};
  
  /* Border */
  --color-border-default: ${colors.border.default};
  --color-border-subtle: ${colors.border.subtle};
  
  /* Accent (RGB for alpha) */
  --color-accent-primary: ${colors.accent.primary};
  --color-accent-danger: ${colors.accent.danger};
  --color-accent-info: ${colors.accent.info};
  --color-accent-warning: ${colors.accent.warning};
  --color-accent-success: ${colors.accent.success};
  
  /* Neon (RGB for alpha) */
  --color-neon-green: ${colors.neon.green};
  --color-neon-cyan: ${colors.neon.cyan};
  --color-neon-purple: ${colors.neon.purple};
  --color-neon-pink: ${colors.neon.pink};
  --color-neon-lime: ${colors.neon.lime};
  --color-neon-magenta: ${colors.neon.magenta};
  --color-neon-yellow: ${colors.neon.yellow};
  --color-neon-gold: ${colors.neon.gold};
  
  /* Category (RGB for alpha) */
  --color-category-orange: ${colors.category.orange};
  --color-category-blue: ${colors.category.blue};
  --color-category-amber: ${colors.category.amber};
  --color-category-red: ${colors.category.red};
  --color-category-gray: ${colors.category.gray};
  --color-category-indigo: ${colors.category.indigo};
  --color-category-yellow: ${colors.category.yellow};
  
  /* Light Theme Surface */
  --color-light-surface: ${colors.light.surface};
  --color-light-border: ${colors.light.border};
  --color-light-text: ${colors.light.text};
  --color-light-text-muted: ${colors.light.textMuted};
}
`.trim();
}

/**
 * Pre-generated CSS string for convenience
 */
export const cssVariables = generateCSSVariables();
