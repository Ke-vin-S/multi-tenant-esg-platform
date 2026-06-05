import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup-integration.ts'],
    include: ['tests/integration/**/*.test.ts'],
    // RLS tests share DB state — run sequentially to avoid cross-test interference.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
});
