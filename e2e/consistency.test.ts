import * as assert from 'assert';
import { activateMentor, getMentorState, waitFor, waitForIndexing } from './helpers';

/**
 * Cross-surface consistency in a real extension host: after activation and
 * indexing, the SPARQL status bar must report the same workspace graph count
 * as the graph service — the status bar rendered "0 graphs" forever before
 * the workspace graphs-changed signal existed.
 */
suite('graph count consistency', () => {
	suiteSetup(async () => {
		await activateMentor();
	});

	test('the status bar reports the workspace graph count after indexing', async () => {
		const state = await waitForIndexing();

		assert.ok(state.workspaceGraphCount > 0, 'the fixture workspace must produce graphs in the store');

		// The status bar re-renders through the debounced graphs-changed signal;
		// poll until the label caught up with the store.
		await waitFor(async () => {
			const current = await getMentorState();
			const match = /(\d+) graphs/.exec(current.statusBarText);

			return match !== null && parseInt(match[1], 10) === current.workspaceGraphCount;
		}, { label: 'status bar to match the workspace graph count' });
	});
});
