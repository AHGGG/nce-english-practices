/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cyber-Noir Palette
        // Cyber-Noir Palette
        bg: {
          DEFAULT: '#050505', // OLED Black with subtle noise
          paper: '#0A0A0A',   // Secondary background
          elevated: '#111111', // Tertiary background
        },
        ink: {
          DEFAULT: '#E0E0E0', // Primary Text (Off-white)
          muted: '#888888',   // Secondary Text
          faint: '#333333',   // Borders / Dividers
        },
        neon: {
          green: '#00FF94',   // Primary Accent (Matrix Green)
          pink: '#FF0055',    // Secondary Accent (Razor Pink)
          cyan: '#06b6d4',    // Info / Tech
          amber: '#f59e0b',   // Warning
        }
      },
      fontFamily: {
        serif: ['"Merriweather"', 'serif'], // Headings / Story
        mono: ['"JetBrains Mono"', 'monospace'], // UI / Data / Code
        sans: ['"Inter"', 'sans-serif'], // Fallback
      },
      boxShadow: {
        'neon-green': '4px 4px 0px 0px rgba(0, 255, 148, 0.2)',
        'neon-pink': '4px 4px 0px 0px rgba(255, 0, 85, 0.2)',
        'hard': '4px 4px 0px 0px rgba(255, 255, 255, 0.1)',
      },
      backgroundImage: {
        'noise': "url('https://grainy-gradients.vercel.app/noise.svg')",
      }
    },
  },
  plugins: [],
}

