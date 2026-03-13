import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionService } from '@src/languages/sparql/services';
import { WebviewController } from '../webview-controller';
import { SparqlConnectionsListMessages } from './sparql-connections-list-messages';
import { SparqlConnectionController } from '../sparql-connection/sparql-connection-controller';

export class SparqlConnectionsListController extends WebviewController<SparqlConnectionsListMessages> {
    constructor() {
        super({
            componentPath: 'sparql-connections-list-view.js',
            panelId: 'sparqlConnectionsListPanel',
            panelTitle: 'Manage Connections',
            panelIcon: 'database-connection'
        });

        const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);

        // Listen for connection changes and update the webview
        this.subscribe(
            connectionService.onDidChangeConnections(() => {
                this.sendConnectionsUpdate();
            })
        );
    }

    /**
     * Opens the connections list in the editor area.
     */
    async open() {
        await super.show(vscode.ViewColumn.Active);
        this.sendConnectionsUpdate();
    }

    /**
     * Sends the current connections list to the webview.
     */
    private sendConnectionsUpdate() {
        const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
        const connections = connectionService.getConnections();
        
        this.postMessage({
            id: 'ConnectionsChanged',
            connections: connections
        });
    }

    protected async onDidReceiveMessage(message: SparqlConnectionsListMessages): Promise<boolean> {
        const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);

        switch (message.id) {
            case 'GetConnections': {
                const connections = connectionService.getConnections();
                this.postMessage({
                    id: 'GetConnectionsResult',
                    connections: connections
                });
                return true;
            }
            case 'CreateConnection': {
                const connection = await connectionService.createConnection();
                const connectionController = container.resolve<SparqlConnectionController>(ServiceToken.SparqlConnectionController);
                connectionController.edit(connection);
                return true;
            }
            case 'EditConnection': {
                const connectionController = container.resolve<SparqlConnectionController>(ServiceToken.SparqlConnectionController);
                connectionController.edit(message.connection);
                return true;
            }
            case 'DeleteConnection': {
                const answer = await vscode.window.showWarningMessage(
                    `Are you sure you want to delete the connection "${message.connection.endpointUrl}"?`,
                    { modal: true },
                    'Delete'
                );
                
                if (answer === 'Delete') {
                    await connectionService.deleteConnection(message.connection.id);
                    await connectionService.saveConfiguration();
                }
                return true;
            }
            case 'ListGraphs': {
                // First test the connection
                const testResult = await connectionService.testConnection(message.connection);
                
                if (testResult !== null) {
                    // Connection failed - send error result
                    this.postMessage({
                        id: 'TestConnectionResult',
                        connectionId: message.connection.id,
                        success: false,
                        error: testResult.message
                    });
                    return true;
                }
                
                // Connection succeeded - update state and execute query
                this.postMessage({
                    id: 'TestConnectionResult',
                    connectionId: message.connection.id,
                    success: true
                });
                
                await vscode.commands.executeCommand('mentor.command.listGraphs', message.connection);
                return true;
            }
            case 'TestConnection': {
                const result = await connectionService.testConnection(message.connection);
                this.postMessage({
                    id: 'TestConnectionResult',
                    connectionId: message.connection.id,
                    success: result === null,
                    error: result?.message
                });
                return true;
            }
            default:
                return super.onDidReceiveMessage(message);
        }
    }
}
