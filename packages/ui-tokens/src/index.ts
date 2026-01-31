/**
 * @nce/ui-tokens - Shared Design System
 *
 * This package provides the Cyber-Noir design tokens
 * that work across Web and React Native.
 *
 * Usage in Tailwind config:
 * ```js
 * const { tailwindPreset } = require('@nce/ui-tokens');
 *
 * module.exports = {
 *   presets: [tailwindPreset],
 *   content: ['./src/**\/*.{js,jsx,ts,tsx}'],
 * };
 * ```
 *
 * Usage for CSS variables:
 * ```ts
 * import { cssVariables } from '@nce/ui-tokens';
 * // Inject into <style> or global CSS
 * ```
 */

export { colors, type ColorTokens } from "./colors";
export { typography, type TypographyTokens } from "./typography";
export { cssVariables, generateCSSVariables } from "./css-variables";

// Re-export the Tailwind preset from the root config
// (Tailwind configs need CommonJS, so we keep it as .js)
