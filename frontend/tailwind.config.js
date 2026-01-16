/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ============================================
        // Cyber-Noir Design System
        // All colors reference CSS variables defined in index.css
        // ============================================
        
        // Background Hierarchy
        bg: {
          base: 'var(--color-bg-base)',
          surface: 'var(--color-bg-surface)',
          elevated: 'var(--color-bg-elevated)',
        },
        
        // Text Hierarchy
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        
        // Borders
        border: {
          DEFAULT: 'var(--color-border-default)',
          subtle: 'var(--color-border-subtle)',
        },
        
        // Accent Colors
        accent: {
          primary: 'var(--color-accent-primary)',
          danger: 'var(--color-accent-danger)',
          info: 'var(--color-accent-info)',
          warning: 'var(--color-accent-warning)',
        },
        
        // Neon Colors (for charts and visual highlights)
        // Reference CSS variables for easy theme customization
        neon: {
          green: 'var(--color-neon-green)',
          cyan: 'var(--color-neon-cyan)',
          purple: 'var(--color-neon-purple)',
          pink: 'var(--color-neon-pink)',
          lime: 'var(--color-neon-lime)',
          magenta: 'var(--color-neon-magenta)',
          yellow: 'var(--color-neon-yellow)',
          gold: 'var(--color-neon-gold)',
        },
        
        // Legacy ink colors (used by older components)
        ink: {
          DEFAULT: '#E0E0E0',
          muted: '#666666',
          faint: '#333333',
        },
        
        // Legacy surface colors
        surface: {
          1: '#0A0A0A',
          2: '#111111',
        },
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

