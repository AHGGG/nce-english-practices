/** @type {import('tailwindcss').Config} */
const sharedConfig = require("@nce/ui-tokens/tailwind.config");

module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    ...sharedConfig.theme, // Merge shared theme
    extend: {
      ...sharedConfig.theme.extend, // Merge shared extensions
      // Mobile specific overrides if any
    },
  },
  plugins: [],
};
