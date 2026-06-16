import * as vscode from 'vscode';
import { compile } from 'triplate';

/**
 * Renders a triplate template using the declared values of a named example block
 * and opens (and, for SPARQL, executes) the result. No prompting.
 */
export const executeTriplateExample = {
	id: 'mentor.command.executeTriplateExample',
	handler: async (documentUri: vscode.Uri | string, exampleId: string): Promise<void> => {
		const uri = documentUri.toString();
		const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === uri);

		if (!document) {
			vscode.window.showWarningMessage('No template document found to execute.');
			return;
		}

		let compiled: ReturnType<typeof compile>;

		try {
			compiled = compile(document.getText());
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to compile template: ${(error as Error).message}`);
			return;
		}

		if (!compiled.examples.some(e => e.id === exampleId)) {
			vscode.window.showErrorMessage(`No example "${exampleId}" found in this template.`);
			return;
		}

		let rendered: string;

		try {
			rendered = compiled.previewExample(exampleId);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to render example "${exampleId}": ${(error as Error).message}`);
			return;
		}

		await vscode.commands.executeCommand('mentor.command.openRenderedTriplate', document.uri.toString(), rendered);
	}
};
