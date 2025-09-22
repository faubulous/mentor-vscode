import * as vscode from 'vscode';
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
        if (endpoint) this.postMessage({ id: 'EditSparqlEndpoint', endpoint });
    }

    protected async onDidReceiveMessage(message: SparqlEndpointMessages) {
        switch (message.id) {
            case 'ExecuteCommand': {
                await vscode.commands.executeCommand(message.command, ...(message.args || []));
                return;
            }
        }
    }
}

export const sparqlEndpointController = new SparqlEndpointController();