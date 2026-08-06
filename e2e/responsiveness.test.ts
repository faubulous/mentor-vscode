import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateMentor, getMentorState, waitFor, waitForIndexing } from './helpers';

/**
 * Responsiveness smoke test: reindexing the workspace must not block the
 * extension host event loop. The sampler measures timer drift — the same
 * starvation that freezes the status bar, webviews and provider requests.
 * A regression to yield-free indexing shows up as multi-hundred-millisecond
 * (or multi-second) lag spikes.
 */
suite('extension host responsiveness', () => {
	suiteSetup(async () => {
		await activateMentor();
		await waitForIndexing();
	});

	test('reindexing keeps event-loop lag bounded', async () => {
		const sampleIntervalMs = 50;
		let maxLagMs = 0;
		let last = Date.now();

		const sampler = setInterval(() => {
			const now = Date.now();
			const lag = now - last - sampleIntervalMs;

			if (lag > maxLagMs) {
				maxLagMs = lag;
			}

			last = now;
		}, sampleIntervalMs);

		try {
			await vscode.commands.executeCommand('mentor.command.reindexWorkspace');

			await waitFor(async () => (await getMentorState()).indexingFinished, { label: 'reindexing to finish' });
		} finally {
			clearInterval(sampler);
		}

		// Generous bound for CI machines: the gate is against multi-second
		// freezes (the pre-yield indexer), not scheduling jitter.
		assert.ok(maxLagMs < 1000, `event-loop lag peaked at ${maxLagMs} ms during reindexing`);
	});
});
