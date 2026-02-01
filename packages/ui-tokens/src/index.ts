/**
 * @nce/ui-tokens - Shared Design System
 *
 * This package provides the Cyber-Noir design tokens
 * that work across Web and React Native.
 *
 * Usage:
 * ```js
 * // Tailwind config
 * const tokens = require('@nce/ui-tokens/generated/tailwind/colors');
 * module.exports = {
 *   theme: {
 *     extend: {
 *       colors: tokens,
 *     }
 *   }
 * };
 * ```
 *
 * ```ts
 * // TypeScript
 * import { colors, typography } from '@nce/ui-tokens';
 * const primaryColor = colors.accent.primary;
 * ```
 */

export {
  createSemanticTokens,
  type SemanticTokens,
  type SemanticColorPath,
} from "./semantic";
export type {
  AllTokens,
  DesignToken,
  ColorToken,
  DimensionToken,
} from "./primitives";

export const tokensVersion = "0.2.0";
