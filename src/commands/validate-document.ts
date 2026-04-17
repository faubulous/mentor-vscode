import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { IWorkspaceIndexerService } from '@src/services/core';
import { ServiceToken } from '@src/services/tokens';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';

export const validateDocument = {
	id: 'mentor.command.validateDocument',
	handler: async () => {
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			return;
		}

		// Wait for background workspace indexing to finish so required shape graphs are available.
		const indexerService = container.resolve<IWorkspaceIndexerService>(ServiceToken.WorkspaceIndexerService);
		await indexerService.waitForIndexed();

		const validationService = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);

		// If no SHACL shapes are configured for this document, open shape configuration first.
		const effectiveShapes = validationService.getEffectiveShapeGraphs(editor.document.uri);

		if (effectiveShapes.length === 0) {
			await vscode.commands.executeCommand('mentor.command.manageShaclShapes');
			return;
		}

		const result = await validationService.validateDocument(editor.document.uri);

		if (!result) {
			return;
		} else if (result.conforms) {
			vscode.window.showInformationMessage('SHACL validation: No issues found.');
		} else {
			vscode.window.showWarningMessage(`SHACL validation: ${result.results.length} issue(s) found.`);
		}
	}
};
