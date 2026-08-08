import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    pool: 'threads',
    isolate: true,
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    maxWorkers: 2,
    setupFiles: './src/setupTests.tsx',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      exclude: [
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.config.{ts,js,mjs,cjs}',
        '**/vite.config.ts',
        '**/vitest.config.ts',
        '**/eslint.config.js',
        '**/src/main.tsx',
        '**/src/setupTests.tsx',
        '**/src/**/types.ts',
        '**/src/**/types.tsx',
        '**/src/**/types/**',
      ],
    },
  },
})

