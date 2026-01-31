/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ============================================
        // "Pointer Inspired" Design System
        // Modern Green Gradient + Glass Morphism
        // ============================================

        // Background Hierarchy
        bg: {
          base: "var(--color-bg-base)",
          surface: "var(--color-bg-surface)",
          elevated: "var(--color-bg-elevated)",
          gradient: {
            start: "var(--color-bg-gradient-start)",
            end: "var(--color-bg-gradient-end)",
          },
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
          hover: "var(--color-border-hover)",
        },

        // Accent Colors - Mint/Cyan Theme
        accent: {
          primary: "rgb(var(--color-accent-primary) / <alpha-value>)",
          secondary: "rgb(var(--color-accent-secondary) / <alpha-value>)",
          danger: "rgb(var(--color-accent-danger) / <alpha-value>)",
          info: "rgb(var(--color-accent-info) / <alpha-value>)",
          warning: "rgb(var(--color-accent-warning) / <alpha-value>)",
          success: "rgb(var(--color-accent-success) / <alpha-value>)",
        },

        // Neon Colors (for visual highlights)
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

        // Category Colors (for status indicators)
        category: {
          orange: "rgb(var(--color-category-orange) / <alpha-value>)",
          blue: "rgb(var(--color-category-blue) / <alpha-value>)",
          amber: "rgb(var(--color-category-amber) / <alpha-value>)",
          red: "rgb(var(--color-category-red) / <alpha-value>)",
          gray: "rgb(var(--color-category-gray) / <alpha-value>)",
          indigo: "rgb(var(--color-category-indigo) / <alpha-value>)",
          yellow: "rgb(var(--color-category-yellow) / <alpha-value>)",
        },

        // Light Theme Surface (for light-bg components)
        light: {
          surface: "var(--color-light-surface)",
          border: "var(--color-light-border)",
          text: "var(--color-light-text)",
          muted: "var(--color-light-text-muted)",
        },

        // Chart Colors
        chart: {
          primary: "var(--color-chart-primary)",
          secondary: "var(--color-chart-secondary)",
          bg: "var(--color-chart-bg)",
        },

        // Glass Effect
        glass: {
          bg: "var(--glass-bg)",
          border: "var(--glass-border)",
          hover: "var(--glass-hover)",
        },

        // Legacy compatibility
        ink: {
          DEFAULT: "var(--color-text-primary)",
          muted: "var(--color-text-muted)",
          faint: "var(--color-border-default)",
        },

        surface: {
          1: "var(--color-bg-surface)",
          2: "var(--color-bg-elevated)",
        },
      },
      fontFamily: {
        sans: ["Inter", "SF Pro Display", "system-ui", "sans-serif"],
        serif: ["Merriweather", "Georgia", "serif"],
        mono: ["JetBrains Mono", "SF Mono", "monospace"],
      },
      boxShadow: {
        soft: "0 4px 20px rgba(0, 0, 0, 0.3)",
        accent: "0 4px 20px rgba(111, 227, 177, 0.15)",
        glow: "0 0 40px rgba(111, 227, 177, 0.1)",
        card: "0 8px 32px rgba(0, 0, 0, 0.4)",
        float: "0 20px 60px rgba(0, 0, 0, 0.5)",
      },
      backgroundImage: {
        "gradient-radial":
          "radial-gradient(circle at center, var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        grid: "linear-gradient(rgba(111, 227, 177, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(111, 227, 177, 0.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "60px 60px",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
