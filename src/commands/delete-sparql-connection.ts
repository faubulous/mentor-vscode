import * as vscode from 'vscode';
import { container } from '@src/service-container';
import { ServiceToken } from '@src/service-token';
import { SparqlConnection } from '@src/services/sparql-connection';
import { SparqlConnectionService } from '@src/services/sparql-connection-service';
import { CredentialStorageService } from '@src/services/credential-storage-service';

export const deleteSparqlConnection = {
	id: 'mentor.command.deleteSparqlConnection',
	handler: async (connection: SparqlConnection) => {
		const confirm = await vscode.window.showWarningMessage(
			'Are you sure you want to delete this SPARQL connection?',
			{ modal: true },
			'Delete'
		);

		if (confirm !== 'Delete') {
			return;
		}

		const connectionService = container.resolve<SparqlConnectionService>(ServiceToken.SparqlConnectionService);
		const credentialService = container.resolve<CredentialStorageService>(ServiceToken.CredentialStorageService);

		await connectionService.deleteConnection(connection.id);
		await connectionService.saveConfiguration();

		await credentialService.deleteCredential(connection.id);

		vscode.window.showInformationMessage('SPARQL connection deleted.');
	}
};