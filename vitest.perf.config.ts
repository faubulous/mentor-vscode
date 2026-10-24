import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

/**
 * Configuration for the performance harness under `perf/` (`npm run perf`).
 * It reuses the unit test setup — the `vscode` mock, the `@src` alias and the
 * Turtle text loader — but only runs the `*.perf.ts` files, one at a time, so
 * heap measurements are not disturbed by parallel workers. Run with
 * `--expose-gc` so the harness can force garbage collection between phases.
 *
 * The base config is spread rather than merged: `mergeConfig` would append the
 * perf pattern to the unit test `include` list and run the whole unit suite too.
 */
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['perf/**/*.perf.ts'],
    typecheck: {
      tsconfig: './perf/tsconfig.json'
    },
    fileParallelism: false,
    testTimeout: 600000,
    hookTimeout: 600000,
  },
});
