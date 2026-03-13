import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionService } from '@src/languages/sparql/services';

export const toggleDocumentInference = {
	id: 'mentor.command.toggleDocumentInference',
	handler: async (documentUri?: vscode.Uri) => {
		const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
		
		// If no document URI provided, use the active editor
		const targetUri = documentUri ?? vscode.window.activeTextEditor?.document.uri;
		
		if (!targetUri) {
			vscode.window.showErrorMessage('No document selected.');
			return;
		}
		
		const connection = connectionService.getConnectionForDocument(targetUri);
		
		if (!connectionService.supportsInference(connection)) {
			vscode.window.showErrorMessage('The current connection does not support inference toggling.');
			return;
		}
		
		const newValue = await connectionService.toggleInferenceEnabledForDocument(targetUri);
		
		const statusText = newValue ? 'enabled' : 'disabled';
		vscode.window.setStatusBarMessage(`Inference ${statusText} for this document`, 3000);
	}
};
