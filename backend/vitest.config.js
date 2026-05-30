import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@clerk/backend': path.resolve(__dirname, 'tests/mocks/clerkBackend.cjs'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    testTimeout: 30000,
    hookTimeout: 60000,
    include: ['tests/**/*.test.js'],
  },
});
