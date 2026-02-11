import tailwindScrollbar from "tailwind-scrollbar";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#050505",
          surface: "#0A0A0A",
          elevated: "#121212",
          gradient: {
            start: "#0a0f0d",
            end: "#152821",
          },
        },
        text: {
          primary: "#E0E0E0",
          secondary: "#888888",
          muted: "#555555",
          inverse: "#050505",
        },
        border: {
          DEFAULT: "rgb(26 26 26 / <alpha-value>)",
          subtle: "rgb(15 15 15 / <alpha-value>)",
          hover: "rgb(0 255 148 / <alpha-value>)",
        },
        accent: {
          primary: "rgb(0 255 148 / <alpha-value>)",
          secondary: "rgb(0 212 255 / <alpha-value>)",
          danger: "rgb(255 68 68 / <alpha-value>)",
          info: "rgb(59 130 246 / <alpha-value>)",
          warning: "rgb(255 184 0 / <alpha-value>)",
          success: "rgb(0 255 148 / <alpha-value>)",
        },
        neon: {
          green: "rgb(0 255 148 / <alpha-value>)",
          cyan: "rgb(0 212 255 / <alpha-value>)",
          purple: "rgb(155 89 182 / <alpha-value>)",
          pink: "rgb(255 0 128 / <alpha-value>)",
          lime: "rgb(180 255 0 / <alpha-value>)",
          magenta: "rgb(255 0 255 / <alpha-value>)",
          yellow: "rgb(255 230 0 / <alpha-value>)",
          gold: "rgb(255 215 0 / <alpha-value>)",
        },
        category: {
          orange: "rgb(249 115 22 / <alpha-value>)",
          blue: "rgb(59 130 246 / <alpha-value>)",
          amber: "rgb(245 158 11 / <alpha-value>)",
          red: "rgb(239 68 68 / <alpha-value>)",
          gray: "rgb(107 114 128 / <alpha-value>)",
          indigo: "rgb(99 102 241 / <alpha-value>)",
          yellow: "rgb(234 179 8 / <alpha-value>)",
        },
        light: {
          surface: "#FFFFFF",
          border: "#E5E5E5",
          text: "#1A1A1A",
          muted: "#666666",
        },
        glass: {
          bg: "rgba(255, 255, 255, 0.03)",
          border: "rgba(255, 255, 255, 0.08)",
          hover: "rgba(255, 255, 255, 0.05)",
        },
        surface: {
          1: "rgba(255, 255, 255, 0.03)",
          2: "rgba(255, 255, 255, 0.05)",
        },
      },
      fontFamily: {
        sans: ["Inter", "SF Pro Display", "system-ui", "sans-serif"],
        serif: ["Merriweather", "Georgia", "serif"],
        mono: ["JetBrains Mono", "SF Mono", "monospace"],
      },
      boxShadow: {
        soft: "0 4px 20px rgba(0, 0, 0, 0.3)",
        accent: "0 4px 20px rgba(0, 255, 148, 0.15)",
        glow: "0 0 40px rgba(0, 255, 148, 0.1)",
        card: "0 8px 32px rgba(0, 0, 0, 0.4)",
        float: "0 20px 60px rgba(0, 0, 0, 0.5)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(0, 255, 148, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 148, 0.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "60px 60px",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
    },
  },
  plugins: [tailwindScrollbar({ nocompatible: true })],
};
