import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateMentor, waitFor, waitForIndexing } from '../helpers';

/**
 * The part of the definition tree state, returned by the `mentor.e2e.getDefinitionTreeState`
 * command, that this suite reads.
 */
interface DefinitionTreeState {
	visible: boolean;
	activeContext?: string;
	document?: string;
	rootCount: number;
}

/**
 * Reads the state of the definition tree through the test-only command.
 */
function getDefinitionTreeState(): Thenable<DefinitionTreeState> {
	return vscode.commands.executeCommand<DefinitionTreeState>('mentor.e2e.getDefinitionTreeState');
}

/**
 * VS Code starts with a document already open, as when it restores the editors of the last
 * session. The document context service loaded it before the definition tree subscribed to
 * the document context events, so the tree stayed empty until another document was opened.
 */
suite('definition tree with an editor open at start-up', () => {
	test('shows the definitions of the document that is open at start-up', async () => {
		await activateMentor();
		await waitForIndexing();

		await vscode.commands.executeCommand('mentor.view.definitionTree.focus');

		const uri = vscode.window.activeTextEditor?.document.uri.toString();

		assert.ok(uri?.endsWith('/data/people-teams.ttl'), `the document open at start-up is ${uri}`);

		const state = await waitFor<DefinitionTreeState | undefined>(async () => {
			const current = await getDefinitionTreeState();

			return current.document === uri && current.rootCount > 0 ? current : undefined;
		}, { label: 'the definition tree to show the document', timeoutMs: 10000 }).catch(() => undefined);

		assert.ok(state, `the definition tree shows ${JSON.stringify(await getDefinitionTreeState())}`);
	});
});
