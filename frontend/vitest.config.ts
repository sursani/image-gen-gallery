import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      lines: 80,
      functions: 80,
      branches: 70,
      statements: 80,
      exclude: [
        '**/node_modules/**',
        '**/vite-env.d.ts',
        '**/vite.config.ts',
        '**/vitest.config.ts',
      ],
    },
  },
});