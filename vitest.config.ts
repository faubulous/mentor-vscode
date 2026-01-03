import { defineConfig } from 'vitest/config';
import path from 'path';

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
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'out/',
        'media/',
        '**/*.d.ts',
        'test/',
        'vitest.config.ts',
        'jest.config.ts'
      ]
    },
  },
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, 'src'),
      // Map vscode module to local stub for tests so the test explorer can resolve it
      'vscode': path.resolve(__dirname, 'src/mocks/vscode.ts')
    }
  }
});
