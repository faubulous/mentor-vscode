import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { DocumentContextService } from '@src/services/document/document-context-service';
import { ReferenceUpdateService } from '@src/services/core/reference-update-service';
import { WorkspaceUri } from '@src/providers/workspace-uri';

export const renumberNotebookCells = {
	id: 'mentor.command.renumberNotebookCells',
	handler: async (context?: any) => {
		// Resolve the target notebook from various argument shapes.
		let notebook: vscode.NotebookDocument | undefined;

		if (context && typeof context === 'object') {
			if ('notebook' in context && context.notebook) {
				notebook = context.notebook;
			} else if ('notebookEditor' in context && context.notebookEditor) {
				notebook = context.notebookEditor.notebook;
			} else if ('scheme' in context && 'fsPath' in context) {
				notebook = vscode.workspace.notebookDocuments.find(
					n => n.uri.toString() === (context as vscode.Uri).toString()
				);
			}
		}

		if (!notebook) {
			notebook = vscode.window.activeNotebookEditor?.notebook;
		}

		if (!notebook) {
			vscode.window.showWarningMessage('No notebook is currently open.');
			return;
		}

		// Collect only the cells that carry an auto-generated slug, in visual order.
		const autoCells = notebook.getCells().filter(c => c.metadata?.slugIsAuto === true);

		if (autoCells.length === 0) {
			vscode.window.showInformationMessage('All cells already have explicit slugs — nothing to renumber.');
			return;
		}

		const contextService = container.resolve<DocumentContextService>(ServiceToken.DocumentContextService);

		// Build the rename map: old IRI → new IRI.
		const changes = new Map<string, string>();
		const edits: vscode.NotebookEdit[] = [];
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
			const ctx = contextService.contexts[cell.document.uri.toString()];

			if (ctx) {
				ctx.slug = newSlug;
			}
		}

		if (edits.length === 0) {
			vscode.window.showInformationMessage('Cells are already numbered correctly.');
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

		vscode.window.setStatusBarMessage(
			`Renumbered ${edits.length} cell${edits.length === 1 ? '' : 's'} in notebook.`,
			3000
		);
	}
};
