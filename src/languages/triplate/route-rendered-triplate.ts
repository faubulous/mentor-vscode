import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { NotebookController } from '@src/services/notebook/notebook-controller';
import { isNotebookCell, getContextDocument } from '@src/utilities/query-context';

/**
 * Routes the rendered output of a triplate template to the right execution target.
 *
 * - SPARQL templates are executed via the generic `executeSparqlQueryFromString`
 *   command, which shows results in the cell output (notebook) or results panel (editor).
 * - RDF templates in a notebook cell render their result into the cell output as Turtle.
 * - RDF templates in a text editor open the rendered document as the end result.
 *
 * The compiled query/document text is never opened for SPARQL templates.
 *
 * @param source The template's source document or notebook cell.
 * @param rendered The rendered template output.
 */
export async function routeRenderedTriplate(source: vscode.TextDocument | vscode.NotebookCell, rendered: string): Promise<void> {
	const document = getContextDocument(source);

	if (document.languageId === 'sparql') {
		await vscode.commands.executeCommand('mentor.command.executeSparqlQueryFromString', rendered, document.uri.toString());
		return;
	}

	if (isNotebookCell(source)) {
		const controller = container.resolve<NotebookController>(ServiceToken.NotebookController);
		await controller.renderContentInCell(source, rendered);
		return;
	}

	const renderedDocument = await vscode.workspace.openTextDocument({ content: rendered, language: document.languageId });

	await vscode.window.showTextDocument(renderedDocument);
}
