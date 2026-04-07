import { defineConfig } from 'vitest/config';
import * as path from 'path';

export default defineConfig({
  test: {
    typecheck: {
      tsconfig: './tsconfig.spec.json'
    },
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        'media/',
        '**/*.d.ts',
        'test/',
        'vitest.config.ts',
        'jest.config.ts',
        'extension.ts',
        '**/mocks/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.browser.ts',
        '**/*.node.ts',
      ]
    },
  },
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, 'src'),
      // Map vscode module to local stub for tests so the test explorer can resolve it
      'vscode': path.resolve(__dirname, 'src/utilities/mocks/vscode.ts')
    }
  }
});
