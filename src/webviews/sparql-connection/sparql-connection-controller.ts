import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { WebviewController } from '../webview-controller';
import { SparqlConnectionMessages } from './sparql-connection-messages';
import { SparqlConnection } from '@/services/sparql-connection';

export class SparqlConnectionController extends WebviewController<SparqlConnectionMessages> {
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
    async edit(endpoint?: SparqlConnection) {
        super.show(vscode.ViewColumn.Active);

        if (endpoint) {
            this.postMessage({ id: 'EditSparqlConnection', connection: endpoint });
        }
    }

    protected async onDidReceiveMessage(message: SparqlConnectionMessages) {
        switch (message.id) {
            case 'ExecuteCommand': {
                await vscode.commands.executeCommand(message.command, ...(message.args || []));
                return;
            }
            case 'SaveSparqlConnection': {
                await mentor.sparqlConnectionService.updateEndpoint(message.connection);
                await mentor.sparqlConnectionService.saveConfiguration();

                if (message.credential) {
                    await mentor.credentialStorageService.deleteCredential(message.connection.id);
                    await mentor.credentialStorageService.saveCredential(message.connection.id, message.credential);
                }

                vscode.window.showInformationMessage(`SPARQL endpoint saved.`);
                return;
            }
            case 'UpdateSparqlConnection': {
                await mentor.sparqlConnectionService.updateEndpoint(message.connection);
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
            case 'TestSparqlConnection': {
                const result = await mentor.sparqlConnectionService.testConnection(message.connection, message.credential);

                this.postMessage({ id: 'TestSparqlConnectionResult', error: result });
                return;
            }
        }
    }
}

export const sparqlConnectionController = new SparqlConnectionController();