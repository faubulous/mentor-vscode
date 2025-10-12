import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { WebviewController } from '../webview-controller';
import { SparqlEndpointMessages } from './sparql-endpoint-messages';
import { SparqlEndpoint } from '@/services/sparql-endpoint';

export class SparqlEndpointController extends WebviewController<SparqlEndpointMessages> {
    constructor() {
        super({
            componentPath: 'sparql-endpoint-view.js',
            panelId: 'sparqlEndpointPanel',
            panelTitle: 'SPARQL Endpoint',
        });
    }

    /**
     * Opens the SPARQL endpoint editor in the editor area and optionally preloads the endpoint.
     */
    async edit(endpoint?: SparqlEndpoint) {
        super.show(vscode.ViewColumn.Active);

        if (endpoint) {
            this.postMessage({ id: 'EditSparqlEndpoint', endpoint });
        }
    }

    protected async onDidReceiveMessage(message: SparqlEndpointMessages) {
        switch (message.id) {
            case 'ExecuteCommand': {
                await vscode.commands.executeCommand(message.command, ...(message.args || []));
                return;
            }
            case 'SaveSparqlEndpoint': {
                await mentor.sparqlEndpointService.updateEndpoint(message.endpoint);
                await mentor.sparqlEndpointService.saveConfiguration();

                if (message.credential) {
                    await mentor.credentialStorageService.deleteCredential(message.endpoint.id);
                    await mentor.credentialStorageService.saveCredential(message.endpoint.id, message.credential);
                }

                vscode.window.showInformationMessage(`SPARQL endpoint saved.`);
                return;
            }
            case 'UpdateSparqlEndpoint': {
                await mentor.sparqlEndpointService.updateEndpoint(message.endpoint);
                return;
            }
            case 'GetSparqlEndpointCredential': {
                const credential = await mentor.credentialStorageService.getCredential(message.connection.id);

                this.postMessage({
                    id: 'GetSparqlEndpointCredentialResult',
                    connection: message.connection,
                    credential
                });
                return;
            }
            case 'TestSparqlEndpoint': {
                const result = await mentor.sparqlEndpointService.testConnection(message.endpoint, message.credential);

                this.postMessage({ id: 'TestSparqlEndpointResult', error: result });
                return;
            }
        }
    }
}

export const sparqlEndpointController = new SparqlEndpointController();