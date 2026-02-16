import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test patterns - look for .test.ts and .spec.ts files
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    
    // Exclude patterns
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
    ],
    
    // Use jsdom for DOM-related tests
    environment: 'node',
    
    // Global test setup — mocks server-only, sets env vars
    setupFiles: ['./__tests__/setup.ts'],
    
    // Global timeout
    testTimeout: 30000,
    
    // Limit concurrent tests to prevent memory exhaustion
    maxConcurrency: 5,
    
    // Isolate test files
    fileParallelism: false,
    
    // Coverage settings
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/main/modules/bot/**/*.ts',
        'lib/server/**/*.ts',
        'lib/shared/**/*.ts',
        'lib/client/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/__tests__/**',
      ],
    },
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
