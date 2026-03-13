import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionService } from '@src/languages/sparql/services';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';

export const toggleSparqlConnectionInference = {
	id: 'mentor.command.toggleSparqlConnectionInference',
	handler: async (connection?: SparqlConnection) => {
		const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
		
		// If no connection provided, use workspace store
		const connectionId = connection?.id ?? 'workspace';
		const targetConnection = connectionService.getConnection(connectionId);
		
		if (!targetConnection) {
			vscode.window.showErrorMessage(`Connection not found: ${connectionId}`);
			return;
		}
		
		if (!connectionService.supportsInference(targetConnection)) {
			vscode.window.showErrorMessage(`This connection does not support inference toggling.`);
			return;
		}
		
		const newValue = await connectionService.toggleInferenceEnabled(connectionId);
		
		const statusText = newValue ? 'enabled' : 'disabled';
		vscode.window.setStatusBarMessage(`Inference ${statusText} for ${targetConnection.endpointUrl}`, 5000);
	}
};
