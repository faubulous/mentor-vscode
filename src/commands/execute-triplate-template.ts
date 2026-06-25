import * as vscode from 'vscode';
import { compile } from 'triplate';
import { resolveQueryContext, getContextDocument } from '@src/utilities/query-context';
import { renderTemplateInteractively } from '@src/languages/triplate/triplate-prompt';
import { routeRenderedTriplate } from '@src/languages/triplate/route-rendered-triplate';

/**
 * Lets the user pick a declared example or enter parameter values for a triplate template,
 * renders it, and executes (SPARQL) or validates/opens (RDF) the result.
 */
export const executeTriplateTemplate = {
	id: 'mentor.command.executeTriplateTemplate',
	handler: async (documentUri?: vscode.Uri | string): Promise<void> => {
		const source = resolveQueryContext(documentUri);

		if (!source) {
			vscode.window.showWarningMessage('No template document found to execute.');
			return;
		}

		const text = getContextDocument(source).getText();
		let compiled: ReturnType<typeof compile>;

		try {
			compiled = compile(text);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to compile template: ${(error as Error).message}`);
			return;
		}

		const rendered = await renderTemplateInteractively(compiled);

		if (rendered === undefined) {
			// The user cancelled, or rendering failed (already reported).
			return;
		}

		await routeRenderedTriplate(source, rendered);
	}
};
