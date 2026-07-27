import * as vscode from 'vscode';

/**
 * The state snapshot returned by the `mentor.e2e.getState` test command.
 */
export interface MentorE2eState {
	workspaceGraphCount: number;
	statusBarText: string;
	indexingFinished: boolean;
}

/**
 * Activates the Mentor extension and returns once activation has completed.
 */
export async function activateMentor(): Promise<void> {
	const extension = vscode.extensions.getExtension('faubulous.mentor');

	if (!extension) {
		throw new Error('The Mentor extension is not installed in the test host.');
	}

	await extension.activate();
}

/**
 * Reads the extension's internal state through the test-only command.
 */
export function getMentorState(): Thenable<MentorE2eState> {
	return vscode.commands.executeCommand<MentorE2eState>('mentor.e2e.getState');
}

/**
 * Polls until the condition returns a truthy value or the timeout elapses.
 * @param condition The probe; a truthy return value ends the wait.
 * @param options Timeout and polling interval in milliseconds.
 * @returns The condition's final value.
 */
export async function waitFor<T>(
	condition: () => Thenable<T> | T,
	options: { timeoutMs?: number; intervalMs?: number; label?: string } = {}
): Promise<T> {
	const timeoutMs = options.timeoutMs ?? 60000;
	const intervalMs = options.intervalMs ?? 250;
	const start = Date.now();

	for (;;) {
		const value = await condition();

		if (value) {
			return value;
		}

		if (Date.now() - start > timeoutMs) {
			throw new Error(`Timed out waiting for ${options.label ?? 'condition'} after ${timeoutMs} ms.`);
		}

		await new Promise(resolve => setTimeout(resolve, intervalMs));
	}
}

/**
 * Waits until the workspace indexer reports completion.
 */
export async function waitForIndexing(): Promise<MentorE2eState> {
	await waitFor(async () => (await getMentorState()).indexingFinished, { label: 'workspace indexing' });

	return getMentorState();
}
