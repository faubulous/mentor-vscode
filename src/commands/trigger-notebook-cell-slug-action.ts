import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { DocumentContextService } from '@src/services/document/document-context-service';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { findNotebookContainingCell } from '@src/utilities/vscode/notebook';
import { editNotebookCellSlug } from './edit-notebook-cell-slug';

export const triggerNotebookCellSlugAction = {
	id: 'mentor.command.triggerNotebookCellSlugAction',
	handler: async (cellDocumentUri: vscode.Uri) => {
		if (!cellDocumentUri) {
			vscode.window.showWarningMessage('No notebook cell specified.');
			return;
		}

		const notebook = findNotebookContainingCell(cellDocumentUri);

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
		const slug: string = cell.metadata?.slug ?? ctx?.slug ?? '';

		if (!slug) {
			vscode.window.showWarningMessage('This cell has no slug.');
			return;
		}

		const picked = await vscode.window.showQuickPick(
			[
				{
					id: 'edit',
					label: '$(pencil) Edit ID',
					description: 'Edit the ID of this cell',
				},
				{
					id: 'copy',
					label: '$(copy) Copy URI',
					description: 'Copy the workspace URI of this cell',
				},
			],
			{ title: `Cell: #${slug}` }
		);

		if (!picked) {
			return;
		}

		if (picked.id === 'edit') {
			await editNotebookCellSlug.handler(cellDocumentUri);
		} else if (picked.id === 'copy') {
			const workspaceUri = WorkspaceUri.toWorkspaceUri(cellDocumentUri, slug);

			if (workspaceUri) {
				const uriString = WorkspaceUri.toCanonicalString(workspaceUri);
				await vscode.env.clipboard.writeText(uriString);
				vscode.window.showInformationMessage(`Copied: ${uriString}`);
			}
		}
	}
};
