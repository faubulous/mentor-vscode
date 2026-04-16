import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';

export const validateDocument = {
	id: 'mentor.command.validateDocument',
	handler: async () => {
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			return;
		}

		const service = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);

		// If no SHACL shapes are configured for this document, open shape configuration first.
		const effectiveShapes = service.getEffectiveShapeGraphs(editor.document.uri);

		if (effectiveShapes.length === 0) {
			await vscode.commands.executeCommand('mentor.command.manageShaclShapes');
			return;
		}

		const result = await service.validateDocument(editor.document.uri);

		if (result) {
			if (result.conforms) {
				vscode.window.showInformationMessage('SHACL validation passed: data conforms to all shapes.');
			} else {
				vscode.window.showWarningMessage(`SHACL validation: ${result.results.length} issue(s) found.`);
			}
		}
	}
};
