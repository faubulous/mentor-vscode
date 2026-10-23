import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateMentor, waitFor, waitForIndexing } from './helpers';

/**
 * The state of the definition tree returned by the `mentor.e2e.getDefinitionTreeState` command.
 */
interface DefinitionTreeState {
	activeContext?: string;
}

/**
 * Waits until the document with the given URI is the active document context.
 * @param uri The URI of the document.
 * @param label A description of the document for the timeout message.
 */
function waitForActiveContext(uri: vscode.Uri, label: string): Promise<boolean> {
	return waitFor(async () => {
		const state = await vscode.commands.executeCommand<DefinitionTreeState>('mentor.e2e.getDefinitionTreeState');

		return state.activeContext === uri.toString();
	}, { label: `${label} to be the active document context`, timeoutMs: 10000 });
}

/**
 * A document whose language is changed in the editor must become the active document context,
 * e.g. an unsaved file that is switched from plain text to Turtle (faubulous/mentor-vscode#104).
 */
suite('language change', () => {
	suiteSetup(async () => {
		await activateMentor();
		await waitForIndexing();
	});

	teardown(async () => {
		await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
	});

	test('makes an unsaved document the active context after switching it to Turtle', async () => {
		// Another document is the active context before the unsaved document is created.
		const [file] = await vscode.workspace.findFiles('data/ontology.ttl');

		await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(file));
		await waitForActiveContext(file, 'the workspace document');

		await vscode.commands.executeCommand('workbench.action.files.newUntitledFile');

		const document = vscode.window.activeTextEditor!.document;

		assert.strictEqual(document.languageId, 'plaintext');

		// Give the extension time to handle the new plain text editor, like a user who picks the
		// language afterwards. Switching right away is handled by the pending editor change.
		await new Promise(resolve => setTimeout(resolve, 1000));

		await vscode.languages.setTextDocumentLanguage(document, 'turtle');
		await vscode.window.activeTextEditor!.edit(builder => {
			builder.insert(new vscode.Position(0, 0), '@prefix ex: <http://example.org/> .\nex:Thing a <http://www.w3.org/2004/02/skos/core#Concept> .\n');
		});

		await waitForActiveContext(document.uri, 'the unsaved document');
	});
});
