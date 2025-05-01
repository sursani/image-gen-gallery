/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  darkMode: 'selector', // Or 'class'
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      // Add dark theme colors here if needed, or rely on default dark mode variants
      // Example:
      // colors: {
      //   'dark-bg': '#000000',
      //   'dark-text': '#ffffff',
      //   'dark-accent': '#6366f1', // Example accent
      // },
    },
  },
  plugins: [],
} 