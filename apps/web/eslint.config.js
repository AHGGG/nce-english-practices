import js from "@eslint/js";
import globals from "globals";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    rules: {
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
      // Enforce semantic color tokens - prevent hardcoded Tailwind colors
      "no-restricted-syntax": [
        "warn",
        {
          // Match className containing hardcoded color patterns
          selector:
            'JSXAttribute[name.name="className"] Literal[value=/(?:^|\\s)(?:text|bg|border|ring|shadow|outline|fill|stroke)-(?:white|black|zinc|gray|slate|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-?\\d*/]',
          message:
            "Please use semantic color tokens instead of hardcoded Tailwind colors.\n  - text-white -> text-text-primary\n  - bg-zinc-800 -> bg-bg-surface\n  - border-gray-700 -> border-border\n  read tailwind.config.js for color system.",
        },
        {
          // Match text-white or text-black specifically (common cases)
          selector:
            'JSXAttribute[name.name="className"] Literal[value=/(?:^|\\s)(?:text-white|text-black|bg-white|bg-black)(?:\\s|$)/]',
          message:
            "Please use semantic color tokens instead of hardcoded Tailwind colors.\n  - text-white -> text-text-primary\n  - text-black -> text-bg-base or component specific color\n  - bg-white -> bg-light-surface\n  - bg-black -> bg-bg-base",
        },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
        project: "./tsconfig.json",
      },
      globals: globals.browser,
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "warn",
    },
  },
  {
    files: ["vite.config.js", "postcss.config.js", "tailwind.config.js"],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
