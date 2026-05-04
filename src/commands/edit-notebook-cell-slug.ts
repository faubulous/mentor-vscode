import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { DocumentContextService } from '@src/services/document/document-context-service';
import { ReferenceUpdateService } from '@src/services/core/reference-update-service';
import { WorkspaceUri } from '@src/providers/workspace-uri';

/**
 * A regular expression that validates a notebook cell slug.
 * Must match the SLUG_PATTERN in notebook-serializer.ts.
 */
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export const editNotebookCellSlug = {
	id: 'mentor.command.editNotebookCellSlug',
	handler: async (cellDocumentUri: vscode.Uri) => {
		if (!cellDocumentUri) {
			vscode.window.showWarningMessage('No notebook cell specified.');
			return;
		}

		// Find the notebook that contains this cell.
		const notebook = vscode.workspace.notebookDocuments.find(
			nb => nb.getCells().some(c => c.document.uri.toString() === cellDocumentUri.toString())
		);

		if (!notebook) {
			vscode.window.showWarningMessage('Could not find the notebook containing this cell.');
			return;
		}

		const cell = notebook.getCells().find(
			c => c.document.uri.toString() === cellDocumentUri.toString()
		);

		if (!cell) {
			vscode.window.showWarningMessage('Could not find the notebook cell.');
			return;
		}

		const contextService = container.resolve<DocumentContextService>(ServiceToken.DocumentContextService);
		const ctx = contextService.contexts[cellDocumentUri.toString()];
		const currentSlug: string = cell.metadata?.slug ?? ctx?.slug ?? '';

		const newSlug = await vscode.window.showInputBox({
			title: 'Edit Cell Slug',
			prompt: 'Enter a human-readable identifier for this cell (used as the graph URI fragment).',
			value: currentSlug,
			placeHolder: 'e.g. my-data',
			validateInput: (value) => {
				if (!value) {
					return 'Slug cannot be empty.';
				}

				if (!SLUG_PATTERN.test(value)) {
					return 'Slug must start with a lowercase letter or digit and may only contain lowercase letters, digits, and hyphens.';
				}

				// Check for uniqueness among other cells in the same notebook.
				const isDuplicate = notebook.getCells().some(
					c => c.index !== cell.index && c.metadata?.slug === value
				);

				if (isDuplicate) {
					return `The slug "${value}" is already used by another cell in this notebook.`;
				}

				return undefined;
			}
		});

		if (!newSlug || newSlug === currentSlug) {
			return;
		}

		// Compute the old and new workspace IRIs for the reference update.
		const oldIri = WorkspaceUri.toWorkspaceUri(cellDocumentUri, currentSlug)?.toString();
		const newIri = WorkspaceUri.toWorkspaceUri(cellDocumentUri, newSlug)?.toString();

		// Update the cell metadata in the notebook document.
		const newMetadata = { ...cell.metadata, slug: newSlug, slugIsAuto: false };
		const notebookEdit = vscode.NotebookEdit.updateCellMetadata(cell.index, newMetadata);
		const workspaceEdit = new vscode.WorkspaceEdit();
		workspaceEdit.set(notebook.uri, [notebookEdit]);

		await vscode.workspace.applyEdit(workspaceEdit);

		// Update the document context slug immediately so CodeLens and graphIri reflect
		// the new slug without waiting for re-indexing.
		if (ctx) {
			ctx.slug = newSlug;
		}

		// Update all workspace: URI references across the workspace.
		if (oldIri && newIri && oldIri !== newIri) {
			const referenceService = container.resolve<ReferenceUpdateService>(ServiceToken.ReferenceUpdateService);
			
			await referenceService.batchUpdate(
				new Map([[oldIri, newIri]]),
				cellDocumentUri
			);
		}
	}
};
