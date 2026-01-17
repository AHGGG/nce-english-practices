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
          inverse: 'var(--color-bg-base)',
        },
        
        // Borders
        border: {
          DEFAULT: 'var(--color-border-default)',
          subtle: 'var(--color-border-subtle)',
        },
        
        // Accent Colors
        accent: {
          primary: 'rgb(var(--color-accent-primary) / <alpha-value>)',
          danger: 'rgb(var(--color-accent-danger) / <alpha-value>)',
          info: 'rgb(var(--color-accent-info) / <alpha-value>)',
          warning: 'rgb(var(--color-accent-warning) / <alpha-value>)',
          success: 'rgb(var(--color-accent-success) / <alpha-value>)',
        },
        
        // Neon Colors (for charts and visual highlights)
        // Reference CSS variables for easy theme customization
        neon: {
          green: 'rgb(var(--color-neon-green) / <alpha-value>)',
          cyan: 'rgb(var(--color-neon-cyan) / <alpha-value>)',
          purple: 'rgb(var(--color-neon-purple) / <alpha-value>)',
          pink: 'rgb(var(--color-neon-pink) / <alpha-value>)',
          lime: 'rgb(var(--color-neon-lime) / <alpha-value>)',
          magenta: 'rgb(var(--color-neon-magenta) / <alpha-value>)',
          yellow: 'rgb(var(--color-neon-yellow) / <alpha-value>)',
          gold: 'rgb(var(--color-neon-gold) / <alpha-value>)',
        },
        
        // Category Colors (for gap types, status indicators)
        // Category Colors (for gap types, status indicators)
        category: {
          orange: 'rgb(var(--color-category-orange) / <alpha-value>)',
          blue: 'rgb(var(--color-category-blue) / <alpha-value>)',
          amber: 'rgb(var(--color-category-amber) / <alpha-value>)',
          red: 'rgb(var(--color-category-red) / <alpha-value>)',
          gray: 'rgb(var(--color-category-gray) / <alpha-value>)',
          indigo: 'rgb(var(--color-category-indigo) / <alpha-value>)',
          yellow: 'rgb(var(--color-category-yellow) / <alpha-value>)',
        },
        
        // Light Theme Surface (for light-bg components)
        light: {
          surface: 'var(--color-light-surface)',
          border: 'var(--color-light-border)',
          text: 'var(--color-light-text)',
          muted: 'var(--color-light-text-muted)',
        },
        
        // Chart Colors
        chart: {
          primary: 'var(--color-chart-primary)',
          secondary: 'var(--color-chart-secondary)',
          bg: 'var(--color-chart-bg)',
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

