import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import * as path from 'path';

/**
 * Configuration for the component tests that run in a real browser (`npm run test:browser`):
 * the webview components with the real VS Code elements, driven by real keyboard and pointer
 * input through Playwright. jsdom stubs those elements, so their focus, caret and shadow DOM are
 * only tested here. A browser component test is named `*.browser.test.tsx`.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.browser.test.tsx'],
    // The testing library unmounts what a test rendered after it, through the global hooks.
    globals: true,
    setupFiles: ['src/utilities/mocks/browser-test-setup.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium', viewport: { width: 1200, height: 900 } }],
    },
  },
  // One copy of React for the components and the testing library, which the browser loads as
  // prebundled modules.
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', '@testing-library/react'],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@src': path.resolve(__dirname, 'src'),
    },
  },
});
