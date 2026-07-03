import { SparqlConnection, SparqlConnectionView } from '@src/languages/sparql/services/sparql-connection';
import { ExecuteCommandMessage } from '../../../../webview-messaging';

export interface GraphStatus {
    count: number;
    error?: string;
}

export type ConnectionsListMessages =
    ExecuteCommandMessage |
    { id: 'GetConnections' } |
    { id: 'GetConnectionsResult', connections: SparqlConnectionView[] } |
    { id: 'ConnectionsChanged', connections: SparqlConnectionView[] } |
    { id: 'DeleteConnection', connection: SparqlConnection } |
    { id: 'CreateConnection' } |
    { id: 'ListGraphs', connection: SparqlConnection } |
    { id: 'ReloadGraphs' } |
    { id: 'TestConnection', connection: SparqlConnection } |
    { id: 'TestConnectionResult', connectionId: string, success: boolean, error?: string } |
    { id: 'OpenInBrowser', url: string } |
    { id: 'GetGraphStatuses' } |
    { id: 'GetGraphStatusesResult', statuses: Record<string, GraphStatus> } |
    { id: 'GraphStatusChanged', connectionId: string, status: GraphStatus };
