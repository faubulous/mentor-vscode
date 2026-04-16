import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IWorkspaceIndexerService } from '@src/services/core';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';

export const viewShaclReport = {
	id: 'mentor.command.viewShaclReport',
	handler: async () => {
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			return;
		}

		const indexer = container.resolve<IWorkspaceIndexerService>(ServiceToken.WorkspaceIndexerService);

		if (!indexer.indexed) {
			// Wait for indexing to finish; allow the user to cancel.
			const proceeded = await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'Mentor: Waiting for workspace indexing to complete…',
					cancellable: true,
				},
				async (_progress, token) => {
					return new Promise<boolean>((resolve) => {
						token.onCancellationRequested(() => resolve(false));
						indexer.waitForIndexed().then(() => resolve(true));
					});
				}
			);

			if (!proceeded) {
				return;
			}
		}

		const service = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);
		const lastResult = service.getLastResult(editor.document.uri);

		if (!lastResult) {
			vscode.window.showInformationMessage('No SHACL validation results available. Run validation first.');
			return;
		}

		const format = await vscode.window.showQuickPick(
			[
				{
					id: 'problems',
					label: 'View Problems',
					description: 'Focus the Problems panel'
				},
				{
					id: 'turtle',
					label: 'Export as Turtle',
					description: '(text/turtle)'
				},
				{
					id: 'plaintext',
					label: 'Export as Plain Text',
					description: '(text/plain)'
				}
			],
			{
				placeHolder: 'Select an action for the SHACL validation report',
				title: 'View SHACL Report'
			}
		);

		if (!format) {
			return;
		}

		if (format.id === 'problems') {
			await vscode.commands.executeCommand('workbench.panel.markers.view.focus');
			return;
		}

		let content: string | undefined;
		let language: string;

		if (format.id === 'turtle') {
			content = await service.getReportAsTurtle(editor.document.uri);
			language = 'turtle';
		} else {
			content = service.getReportAsText(editor.document.uri);
			language = 'plaintext';
		}

		if (!content) {
			vscode.window.showWarningMessage('Failed to generate the validation report.');
			return;
		}

		const document = await vscode.workspace.openTextDocument({ content, language });

		await vscode.window.showTextDocument(document, { preview: true });
	}
};
