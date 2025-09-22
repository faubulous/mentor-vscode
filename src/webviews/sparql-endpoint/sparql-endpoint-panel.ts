import * as vscode from 'vscode';
import { WebviewComponentFactory } from '../webview-component-factory';
import { SparqlEndpointMessages } from './sparql-endpoint-messages';
import { SparqlConnection } from '@/services/sparql-connection';

export class SparqlEndpointPanel {
    private _panel?: vscode.WebviewPanel;
    
    private _context?: vscode.ExtensionContext;

    register(context: vscode.ExtensionContext) {
        this._context = context;

        return [];
    }

    show(endpoint?: SparqlConnection) {
        if (!this._context) {
            throw new Error('Extension context is not initialized. Please register the provider first.');
        }

        if (!this._panel) {
            this._panel = new WebviewComponentFactory(this._context, 'sparql-endpoint-view.js').createPanel(
                'sparqlEndpointPanel',
                'SPARQL Endpoint',
                vscode.ViewColumn.Active
            );

            this._panel.webview.onDidReceiveMessage(message => this._onDidReceiveMessage(message));
        } else {
            this._panel.reveal(vscode.ViewColumn.Active);
        }

        if (endpoint) {
            this._panel.webview.postMessage({ id: 'EditSparqlEndpoint', endpoint });
        }
    }

    private async _onDidReceiveMessage(message: SparqlEndpointMessages) {
        switch (message.id) {
            case 'ExecuteCommand': {
                await vscode.commands.executeCommand(message.command, ...(message.args || []));
                return;
            }
        }
    }
}

export const sparqlEndpointPanel = new SparqlEndpointPanel();