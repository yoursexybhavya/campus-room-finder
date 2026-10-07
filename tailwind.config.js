/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        campus: {
          dark: '#0f172a',
          card: 'rgba(15, 23, 42, 0.75)',
          accent: '#06b6d4',
          sandstone: '#d97706',
          ground: '#059669',
          first: '#8b5cf6',
        },
      },
    },
  },
  plugins: [],
};
