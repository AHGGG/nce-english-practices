/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./templates/**/*.html",
    "./static/js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        'app-bg': '#0f172a',
        'sidebar-bg': '#1e293b',
        'card-bg': 'rgba(30, 41, 59, 0.6)',
        'text-primary': '#f8fafc',
        'text-secondary': '#94a3b8',
        'accent': {
            DEFAULT: '#38bdf8',
            glow: 'rgba(56, 189, 248, 0.4)'
        }
      },
      fontFamily: {
        'sans': ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
      }
    },
  },
  plugins: [],
}
