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
      colors: {
        dark: {
          bg: 'var(--dark-bg)',
          surface: 'var(--dark-surface)',
          elevated: 'var(--dark-surface-elevated)',
          border: 'var(--dark-border)',
          'text-primary': 'var(--dark-text-primary)',
          'text-secondary': 'var(--dark-text-secondary)',
          'text-muted': 'var(--dark-text-muted)',
          accent: 'var(--dark-accent)',
          input: 'var(--dark-input-bg)',
          button: 'var(--dark-button-bg)',
          'toggle-active': 'var(--dark-toggle-active)',
          'toggle-inactive': 'var(--dark-toggle-inactive)'
        }
      },
      borderRadius: {
        'ui-sm': 'var(--radius-sm)',
        'ui-md': 'var(--radius-md)',
        'ui-lg': 'var(--radius-lg)',
        'ui-pill': 'var(--radius-pill)'
      },
      spacing: {
        'xs': 'var(--space-xs)',
        'sm': 'var(--space-sm)',
        'md': 'var(--space-md)',
        'lg': 'var(--space-lg)',
        'xl': 'var(--space-xl)',
        'xxl': 'var(--space-xxl)'
      }
    },
  },
  plugins: [],
} 