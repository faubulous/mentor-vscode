import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { DocumentContextService } from '@src/services/document/document-context-service';
import { ReferenceUpdateService } from '@src/services/core/reference-update-service';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { resolveNotebookFromContext } from '../utilities/vscode/notebook';

export const renumberNotebookCells = {
	id: 'mentor.command.renumberNotebookCells',
	handler: async (context?: any) => {
		const notebook = resolveNotebookFromContext(context);

		if (!notebook) {
			vscode.window.showWarningMessage('No notebook is currently open.');
			return;
		}

		// Collect only the cells that carry an auto-generated slug, in visual order.
		const autoCells = notebook.getCells().filter(c => c.metadata?.slugIsAuto === true);

		if (autoCells.length === 0) {
			vscode.window.showInformationMessage('There are no automatically numbered cells.');
			return;
		}

		const contextService = container.resolve<DocumentContextService>(ServiceToken.DocumentContextService);

		// Build the rename map: old IRI → new IRI.
		const changes = new Map<string, string>();
		const edits: vscode.NotebookEdit[] = [];
		const updatedContexts: Set<string> = new Set(); // Track which cell contexts were updated
		let counter = 0;

		for (const cell of notebook.getCells()) {
			if (cell.metadata?.slugIsAuto !== true) {
				continue;
			}

			counter++;

			const newSlug = `cell-${counter}`;
			const oldSlug: string = cell.metadata?.slug ?? '';

			if (oldSlug === newSlug) {
				continue;
			}

			// Build workspace IRI change.
			const oldIri = WorkspaceUri.toWorkspaceUri(cell.document.uri, oldSlug)?.toString();
			const newIri = WorkspaceUri.toWorkspaceUri(cell.document.uri, newSlug)?.toString();

			if (oldIri && newIri && oldIri !== newIri) {
				changes.set(oldIri, newIri);
			}

			// Prepare notebook metadata edit.
			const newMetadata = { ...cell.metadata, slug: newSlug, slugIsAuto: true };
			edits.push(vscode.NotebookEdit.updateCellMetadata(cell.index, newMetadata));

			// Update the document context slug immediately.
			const cellContext = contextService.contexts[cell.document.uri.toString()];

			if (cellContext) {
				cellContext.slug = newSlug;
				updatedContexts.add(cell.document.uri.toString());
			}
		}

		if (edits.length === 0) {
			vscode.window.showInformationMessage('All cells are already numbered correctly.');
			return;
		}

		// Apply all metadata edits as one atomic WorkspaceEdit.
		const workspaceEdit = new vscode.WorkspaceEdit();
		workspaceEdit.set(notebook.uri, edits);

		await vscode.workspace.applyEdit(workspaceEdit);

		// Update all workspace: URI references across the workspace.
		if (changes.size > 0) {
			const referenceService = container.resolve<ReferenceUpdateService>(ServiceToken.ReferenceUpdateService);

			await referenceService.batchUpdate(changes, notebook.uri);
		}

		// Fire context change events for updated cells so code lenses and other providers re-evaluate.
		for (const cellUri of updatedContexts) {
			const context = contextService.contexts[cellUri];
			
			if (context) {
				(contextService as any)._onDidChangeDocumentContext?.fire(context);
			}
		}

		const message = `Renumbered ${edits.length} cell${edits.length === 1 ? '' : 's'}`;

		vscode.window.setStatusBarMessage(message, 3000);
	}
};
