import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { WebviewController } from '../webview-controller';
import { SparqlEndpointMessages } from './sparql-endpoint-messages';
import { SparqlConnection } from '@/services/sparql-connection';

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
    open(endpoint?: SparqlConnection) {
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
                await mentor.sparqlConnectionService.updateConnection(message.endpoint);

                if (message.credential) {
                    await mentor.credentialStorageService.saveCredential(message.endpoint.endpointUrl, message.credential);
                } else {
                    await mentor.credentialStorageService.deleteCredential(message.endpoint.endpointUrl);
                }

                vscode.window.showInformationMessage(`SPARQL endpoint saved.`);
                return;
            }
            case 'GetSparqlEndpointCredential': {
                const credential = await mentor.credentialStorageService.getCredential(message.endpointUrl);
                this.postMessage({ id: 'GetSparqlEndpointCredentialResult', credential });
                return;
            }
            case 'TestSparqlEndpoint': {
                const result = await mentor.sparqlConnectionService.testConnection(message.endpoint, message.credential);
                this.postMessage({ id: 'TestSparqlEndpointResult', isReachable: result });
                return;
            }
        }
    }
}

export const sparqlEndpointController = new SparqlEndpointController();