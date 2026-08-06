import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';

/**
 * Prompts the user to cancel the batch SHACL validation currently in flight. Invoked by
 * clicking the validation status bar item; cancellation happens only after the user
 * confirms via the shown notification, never silently.
 */
export const cancelValidation = {
	id: 'mentor.command.cancelValidation',
	handler: async () => {
		const service = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);

		if (!service.isValidating) {
			return;
		}

		const choice = await vscode.window.showWarningMessage(
			'SHACL validation is running.',
			'Cancel Validation'
		);

		if (choice === 'Cancel Validation') {
			service.cancelActiveValidation();
		}
	}
};
