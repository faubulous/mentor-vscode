import * as vscode from 'vscode';
import { mentor } from '@src/mentor';
import { WebviewController } from '../webview-controller';
import { SparqlConnectionMessages } from './sparql-connection-messages';
import { SparqlConnection } from '@src/services/sparql-connection';
import { MicrosoftAuthCredential } from '@src/services/credential';
import { loginMicrosoftAuthProvider } from '@src/commands/login-microsoft-auth-provider';

export class SparqlConnectionController extends WebviewController<SparqlConnectionMessages> {
    private selectedConnection?: SparqlConnection;

    constructor() {
        super({
            componentPath: 'sparql-connection-view.js',
            panelId: 'sparqlConnectionPanel',
            panelTitle: 'SPARQL Connection',
        });
    }

    /**
     * Opens the SPARQL endpoint editor in the editor area and optionally preloads the endpoint.
     */
    async edit(connection?: SparqlConnection) {
        super.show(vscode.ViewColumn.Active);

        this.selectedConnection = connection;

        if (connection) {
            this.postMessage({
                id: 'GetSparqlConnectionResult',
                connection: connection
            });
        }
    }

    protected async onDidReceiveMessage(message: SparqlConnectionMessages) {
        switch (message.id) {
            case 'ExecuteCommand': {
                await vscode.commands.executeCommand(message.command, ...(message.args || []));

                if (message.command === 'mentor.command.deleteSparqlConnection') {
                    this.panel?.dispose();
                }
                return;
            }
            case 'GetSparqlConnection': {
                if (this.selectedConnection) {
                    this.postMessage({
                        id: 'GetSparqlConnectionResult',
                        connection: this.selectedConnection
                    });
                } else {
                    // Note: This always returns at least one connection (the Mentor Store).
                    const connection = mentor.sparqlConnectionService.getConnections()[0];

                    this.postMessage({
                        id: 'GetSparqlConnectionResult',
                        connection: connection
                    });
                }
                return;
            }
            case 'GetSparqlConnectionCredential': {
                const credential = await mentor.credentialStorageService.getCredential(message.connectionId);

                this.postMessage({
                    id: 'GetSparqlConnectionCredentialResult',
                    connectionId: message.connectionId,
                    credential
                });
                return;
            }
            case 'SaveSparqlConnection': {
                await mentor.sparqlConnectionService.updateEndpoint(message.connection);
                await mentor.sparqlConnectionService.saveConfiguration();

                if (message.credential) {
                    await mentor.credentialStorageService.deleteCredential(message.connection.id);
                    await mentor.credentialStorageService.saveCredential(message.connection.id, message.credential);
                }

                vscode.window.showInformationMessage(`SPARQL connection saved.`);
                return;
            }
            case 'UpdateSparqlConnection': {
                await mentor.sparqlConnectionService.updateEndpoint(message.connection);
                return;
            }
            case 'TestSparqlConnection': {
                const result = await mentor.sparqlConnectionService.testConnection(message.connection, message.credential);

                this.postMessage({ id: 'TestSparqlConnectionResult', error: result });
                return;
            }
            case 'FetchMicrosoftAuthCredential': {
                const command = loginMicrosoftAuthProvider.id;
                const credential = await vscode.commands.executeCommand<MicrosoftAuthCredential | null>(command, message.scopes);

                if (credential) {
                    this.postMessage({
                        id: 'FetchMicrosoftAuthCredentialResult',
                        connectionId: message.connectionId,
                        credential: credential
                    });
                } else {
                    this.postMessage({
                        id: 'FetchMicrosoftAuthCredentialResult',
                        connectionId: message.connectionId,
                        credential: null
                    });
                }
                return;
            }
        }
    }
}

export const sparqlConnectionController = new SparqlConnectionController();