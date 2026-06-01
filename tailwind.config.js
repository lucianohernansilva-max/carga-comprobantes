/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1e3a5f', light: '#2a4f7f', dark: '#162d4a' },
        danger:  '#C0392B',
        success: '#27AE60',
        warning: '#E67E22',
      },
    },
  },
  plugins: [],
}

