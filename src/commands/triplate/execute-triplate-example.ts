import * as vscode from 'vscode';
import { compile } from 'triplate';
import { resolveQueryContext, getContextDocument } from '@src/utilities/query-context';
import { routeRenderedTriplate } from '@src/languages/triplate/route-rendered-triplate';

/**
 * Renders a triplate template using the declared values of a named example block
 * and executes (SPARQL) or validates/opens (RDF) the result. No prompting.
 */
export const executeTriplateExample = {
	id: 'mentor.command.executeTriplateExample',
	handler: async (documentUri: vscode.Uri | string, exampleId: string): Promise<void> => {
		const source = resolveQueryContext(documentUri);

		if (!source) {
			vscode.window.showWarningMessage('No template document found to execute.');
			return;
		}

		let compiled: ReturnType<typeof compile>;

		try {
			compiled = compile(getContextDocument(source).getText());
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

		await routeRenderedTriplate(source, rendered);
	}
};
