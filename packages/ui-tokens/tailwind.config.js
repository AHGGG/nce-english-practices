/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        // ============================================
        // Cyber-Noir Design System (Shared)
        // ============================================

        // Background Hierarchy
        bg: {
          base: "var(--color-bg-base)",
          surface: "var(--color-bg-surface)",
          elevated: "var(--color-bg-elevated)",
        },

        // Text Hierarchy
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
          inverse: "var(--color-bg-base)",
        },

        // Borders
        border: {
          DEFAULT: "var(--color-border-default)",
          subtle: "var(--color-border-subtle)",
        },

        // Accent Colors
        accent: {
          primary: "rgb(var(--color-accent-primary) / <alpha-value>)",
          danger: "rgb(var(--color-accent-danger) / <alpha-value>)",
          info: "rgb(var(--color-accent-info) / <alpha-value>)",
          warning: "rgb(var(--color-accent-warning) / <alpha-value>)",
          success: "rgb(var(--color-accent-success) / <alpha-value>)",
        },

        // Neon Colors
        neon: {
          green: "rgb(var(--color-neon-green) / <alpha-value>)",
          cyan: "rgb(var(--color-neon-cyan) / <alpha-value>)",
          purple: "rgb(var(--color-neon-purple) / <alpha-value>)",
          pink: "rgb(var(--color-neon-pink) / <alpha-value>)",
          lime: "rgb(var(--color-neon-lime) / <alpha-value>)",
          magenta: "rgb(var(--color-neon-magenta) / <alpha-value>)",
          yellow: "rgb(var(--color-neon-yellow) / <alpha-value>)",
          gold: "rgb(var(--color-neon-gold) / <alpha-value>)",
        },

        // Category Colors
        category: {
          orange: "rgb(var(--color-category-orange) / <alpha-value>)",
          blue: "rgb(var(--color-category-blue) / <alpha-value>)",
          amber: "rgb(var(--color-category-amber) / <alpha-value>)",
          red: "rgb(var(--color-category-red) / <alpha-value>)",
          gray: "rgb(var(--color-category-gray) / <alpha-value>)",
          indigo: "rgb(var(--color-category-indigo) / <alpha-value>)",
          yellow: "rgb(var(--color-category-yellow) / <alpha-value>)",
        },

        // Light Theme Surface
        light: {
          surface: "var(--color-light-surface)",
          border: "var(--color-light-border)",
          text: "var(--color-light-text)",
          muted: "var(--color-light-text-muted)",
        },

        // Legacy/Generic mappings for compatibility
        primary: {
          DEFAULT: "#3b82f6",
          foreground: "#ffffff",
        },
        background: "var(--color-bg-base)",
        surface: "var(--color-bg-surface)",
      },
      fontFamily: {
        serif: ["Merriweather", "serif"], // Removed quotes for RN compatibility
        mono: ["JetBrains Mono", "monospace"],
        sans: ["Inter", "sans-serif"],
      },
      backgroundImage: {
        noise: "url('https://grainy-gradients.vercel.app/noise.svg')",
      },
    },
  },
  plugins: [],
};
