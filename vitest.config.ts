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
    // The serializer's published dist uses directory imports (e.g. `./sorting`) that
    // node's ESM resolver rejects; inlining lets Vite/esbuild resolve them so the real
    // formatter can be imported in tests (mocked tests still use vi.mock).
    server: {
      deps: {
        inline: [/@faubulous\/mentor-rdf-serializers/],
      },
    },
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
        '**/mocks/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.browser.ts',
        '**/*.node.ts',
        'src/extension.ts',
        'src/services/container.ts',
      ]
    },
  },
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, 'src'),
      // Map vscode module to local stub for tests so the test explorer can resolve it
      'vscode': path.resolve(__dirname, 'src/utilities/mocks/vscode.ts'),
      // The `./browser` subpath of vscode-languageclient only resolves under the
      // `browser` export condition, which the Node.js test env does not set. Browser
      // factory tests fully mock this module via vi.mock, so its contents are never
      // used — alias it to the package's common entry purely so resolution succeeds.
      'vscode-languageclient/browser': 'vscode-languageclient'
    }
  }
});
