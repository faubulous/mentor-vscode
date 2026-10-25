import { defineConfig } from '@vscode/test-cli';

/**
 * Configuration for the e2e suite (`npm run test:e2e`): runs the compiled
 * tests from `out/e2e` inside a real extension host, opened on a fixture
 * workspace. The `MENTOR_E2E` flag makes the extension register its
 * test-only introspection commands (see `configureServiceContainer`).
 *
 * Tests that need a workspace of their own live in a folder below `e2e` and
 * get a configuration here; the tests next to `e2e/helpers.ts` run on the
 * default fixture workspace.
 */
const mocha = {
	ui: 'tdd',
	timeout: 120000,
};

const env = {
	MENTOR_E2E: '1',
};

export default defineConfig([
	{
		label: 'workspace',
		files: 'out/e2e/*.test.js',
		workspaceFolder: 'e2e/fixtures/workspace',
		mocha,
		env,
	},
	{
		// Data files and the ontology that defines their predicates live in
		// separate folders here, which is how #90 was reported.
		label: 'definitions',
		files: 'out/e2e/definitions/*.test.js',
		workspaceFolder: 'e2e/fixtures/reveal-workspace',
		mocha,
		env,
	},
	{
		// VS Code starts with a document already open, as when it restores the editors
		// of the last session; its definitions must show up in the definition tree.
		label: 'startup-editor',
		files: 'out/e2e/startup-editor/*.test.js',
		workspaceFolder: 'e2e/fixtures/reveal-workspace',
		launchArgs: ['e2e/fixtures/reveal-workspace/data/people-teams.ttl'],
		mocha,
		env,
	},
	{
		// The tests create, move and delete folders in this workspace from outside
		// of VS Code, which is how #95 was reported.
		label: 'file-watcher',
		files: 'out/e2e/file-watcher/*.test.js',
		workspaceFolder: 'e2e/fixtures/file-watcher-workspace',
		mocha,
		env,
	},
]);
