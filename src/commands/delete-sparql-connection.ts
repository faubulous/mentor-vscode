import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/token';
import { ISparqlConnectionService, ICredentialStorageService } from '@src/services/interface';
import { SparqlConnection } from '@src/services/shared/sparql-connection';

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

		const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
		const credentialService = container.resolve<ICredentialStorageService>(ServiceToken.CredentialStorageService);

		await connectionService.deleteConnection(connection.id);
		await connectionService.saveConfiguration();

		await credentialService.deleteCredential(connection.id);

		vscode.window.showInformationMessage('SPARQL connection deleted.');
	}
};