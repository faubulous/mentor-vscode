import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentConnectionService } from '@src/languages/sparql/services';
import { ITripleStoreConfigService } from '@src/languages/sparql/services';

export const toggleDocumentInference = {
	id: 'mentor.command.toggleDocumentInference',
	handler: async (documentUri?: vscode.Uri) => {
		const documentConnectionService = container.resolve<IDocumentConnectionService>(ServiceToken.DocumentConnectionService);
		const storeConfigService = container.resolve<ITripleStoreConfigService>(ServiceToken.StoreConfigService);

		// If no document URI provided, use the active editor
		const targetUri = documentUri ?? vscode.window.activeTextEditor?.document.uri;

		if (!targetUri) {
			vscode.window.showErrorMessage('No document selected.');
			return;
		}

		const connection = documentConnectionService.getConnectionForDocument(targetUri);

		if (!storeConfigService.supportsInference(connection)) {
			vscode.window.showErrorMessage('The current connection does not support inference toggling.');
			return;
		}

		const newValue = await documentConnectionService.toggleInferenceEnabledForDocument(targetUri);
		const statusText = newValue ? 'enabled' : 'disabled';
		
		vscode.window.setStatusBarMessage(`Inference ${statusText} for this document`, 3000);
	}
};
