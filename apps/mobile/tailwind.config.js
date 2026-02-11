/** @type {import('tailwindcss').Config} */
import { platformSelect } from "nativewind/theme";

module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "../../packages/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  corePlugins: {
    aspectRatio: false,
  },
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
          DEFAULT: "#1A1A1A",
          subtle: "#0F0F0F",
          hover: "#00FF94",
        },
        accent: {
          primary: "rgb(0 255 148)",
          secondary: "rgb(0 212 255)",
          danger: "rgb(255 68 68)",
          info: "rgb(59 130 246)",
          warning: "rgb(255 184 0)",
          success: "rgb(0 255 148)",
        },
        neon: {
          green: "rgb(0 255 148)",
          cyan: "rgb(0 212 255)",
          purple: "rgb(155 89 182)",
          pink: "rgb(255 0 128)",
          lime: "rgb(180 255 0)",
          magenta: "rgb(255 0 255)",
          yellow: "rgb(255 230 0)",
          gold: "rgb(255 215 0)",
        },
        category: {
          orange: "rgb(249 115 22)",
          blue: "rgb(59 130 246)",
          amber: "rgb(245 158 11)",
          red: "rgb(239 68 68)",
          gray: "rgb(107 114 128)",
          indigo: "rgb(99 102 241)",
          yellow: "rgb(234 179 8)",
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
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Merriweather", "Georgia", "serif"],
        mono: ["JetBrains Mono", "monospace"],
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
  plugins: [],
};
