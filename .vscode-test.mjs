import { defineConfig } from '@vscode/test-cli';

/**
 * Configuration for the e2e suite (`npm run test:e2e`): runs the compiled
 * tests from `out/e2e` inside a real extension host, opened on the fixture
 * workspace. The `MENTOR_E2E` flag makes the extension register its
 * test-only introspection commands (see `configureServiceContainer`).
 */
export default defineConfig({
	files: 'out/e2e/**/*.test.js',
	workspaceFolder: 'e2e/fixtures/workspace',
	mocha: {
		ui: 'tdd',
		timeout: 120000,
	},
	env: {
		MENTOR_E2E: '1',
	},
});
