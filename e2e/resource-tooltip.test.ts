import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateMentor, waitFor, waitForIndexing } from './helpers';

/**
 * The text of the hovers at a position, as VS Code shows them.
 * @param uri The document.
 * @param position The position.
 * @returns The Markdown of each hover.
 */
async function hoverTextsAt(uri: vscode.Uri, position: vscode.Position): Promise<string[]> {
	const hovers = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', uri, position);

	return hovers.flatMap(hover => hover.contents.map(content => typeof content === 'string' ? content : content.value));
}

/**
 * The hover of a resource in the text editor shows the compact card of the form editor, as
 * Markdown: its type and usage count above the label, the description, and the IRI, the resources
 * linked to "Go to Definition", which looks for the definition where it is told.
 */
suite('resource tooltip', () => {
	suiteSetup(async () => {
		await activateMentor();
		await waitForIndexing();
	});

	suiteTeardown(async () => {
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
	});

	test('shows the compact card of a class in the hover of the text editor', async () => {
		const uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, 'data', 'ontology.ttl');
		const document = await vscode.workspace.openTextDocument(uri);

		// A hover is asked for in an editor that shows the document, which loads its tokens.
		await vscode.window.showTextDocument(document);

		const offset = document.getText().indexOf('ex:Thing a owl:Class') + 4;
		const position = document.positionAt(offset);

		let texts: string[] = [];

		await waitFor(async () => {
			texts = await hoverTextsAt(uri, position);

			return texts.some(text => text.includes('**Thing**'));
		}, { label: 'the hover of ex:Thing', timeoutMs: 10000 }).catch(() => assert.fail(`The hovers of ex:Thing were ${JSON.stringify(texts)}`));

		const card = texts.find(text => text.includes('**Thing**'))!;

		assert.match(card, /^_\[.+\]\(command:mentor\.command\.revealDefinition\?.+\) · \d+ usages?_\n\n---\n\n\*\*Thing\*\*/);
		assert.ok(card.includes('The root class of the e2e fixture'), card);
		assert.ok(card.includes('\n---\n'), card);
		assert.match(card, /\n\[http:\/\/example\\\.org\/e2e\\#Thing\]\(command:mentor\.command\.revealDefinition\?[^)]+\)$/);
	});

	test('goes to the definition in another file with the workspace scope, and stays in the document without', async () => {
		const folder = vscode.workspace.workspaceFolders![0].uri;
		const instances = vscode.Uri.joinPath(folder, 'data', 'instances.ttl');
		const thing = 'http://example.org/e2e#Thing';

		await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(instances));
		await vscode.commands.executeCommand('mentor.command.revealDefinition', thing, { scope: 'document' });

		assert.strictEqual(vscode.window.activeTextEditor?.document.uri.toString(), instances.toString());

		await vscode.commands.executeCommand('mentor.command.revealDefinition', thing, { scope: 'workspace' });
		await waitFor(() => vscode.window.activeTextEditor?.document.uri.path.endsWith('/data/ontology.ttl') === true, { label: 'the ontology to be shown', timeoutMs: 10000 });

		const editor = vscode.window.activeTextEditor!;

		assert.ok(editor.document.getText(editor.selection).startsWith('ex:Thing'), editor.document.getText(editor.selection));
	});
});
