import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionService } from '@src/languages/sparql/services';
import { ICredentialStorageService } from '@src/services/core';
import { AuthCredential, MicrosoftAuthCredential } from '@src/services/core/credential';
import { loginMicrosoftAuthProvider } from '@src/commands/login-microsoft-auth-provider';
import { getConfig } from '@src/utilities/vscode/config';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { SettingsPanelController } from '@src/views/webviews/settings/settings-panel-controller';

export class SparqlConnectionController {
	/**
	 * Opens the settings panel at the connections section and, if a connection is provided,
	 * opens the inline connection editor for that connection.
	 */
	async edit(connection?: SparqlConnection) {
		const settingsController = container.resolve<SettingsPanelController>(ServiceToken.SettingsPanelController);
		await settingsController.show(vscode.ViewColumn.Active, 'connections');

		if (connection) {
			settingsController.postMessage({ id: 'OpenConnectionForm', connection });
		}
	}

	async getCredential(connectionId: string): Promise<AuthCredential | undefined> {
		const credentialService = container.resolve<ICredentialStorageService>(ServiceToken.CredentialStorageService);
		return credentialService.getCredential(connectionId);
	}

	async saveConnection(connection: SparqlConnection, credential: AuthCredential | null): Promise<void> {
		const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
		await connectionService.updateConnection(connection);
		await connectionService.saveConfiguration();

		if (credential) {
			const credentialService = container.resolve<ICredentialStorageService>(ServiceToken.CredentialStorageService);
			await credentialService.deleteCredential(connection.id);
			await credentialService.saveCredential(connection.id, credential);
		}

		vscode.window.showInformationMessage('SPARQL connection saved.');
	}

	async updateConnection(connection: SparqlConnection): Promise<void> {
		const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
		await connectionService.updateConnection(connection);
	}

	async testConnection(connection: SparqlConnection, credential?: AuthCredential | null): Promise<{ code: number; message: string } | null> {
		const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
		return connectionService.testConnection(connection, credential ?? undefined);
	}

	async getInferenceFeatureEnabled(): Promise<boolean> {
		return getConfig().get<boolean>('inference.enabled', false);
	}

	async toggleInference(connectionId: string): Promise<boolean> {
		const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
		return connectionService.toggleInferenceEnabled(connectionId);
	}

	async fetchMicrosoftCredential(connectionId: string, scopes: string[]): Promise<MicrosoftAuthCredential | null> {
		const credential = await vscode.commands.executeCommand<MicrosoftAuthCredential | null>(loginMicrosoftAuthProvider.id, scopes);
		return credential ?? null;
	}
}