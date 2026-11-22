/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0B0F17',
        surface: '#111827',
        'surface-card': '#1E293B',
        'surface-border': '#334155',
        primary: {
          DEFAULT: '#10B981',
          hover: '#059669',
          dark: '#047857',
          light: '#34D399',
        },
        secondary: {
          DEFAULT: '#06B6D4',
          hover: '#0891B2',
        },
        accent: {
          amber: '#F59E0B',
          indigo: '#6366F1',
          rose: '#F43F5E',
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      screens: {
        's23': '360px',
        'xs': '400px',
      }
    },
  },
  plugins: [],
};
