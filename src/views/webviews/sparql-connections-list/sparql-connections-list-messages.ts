import { SparqlConnection } from '@src/services/sparql-connection';
import { ExecuteCommandMessage } from '../webview-messaging';

export type SparqlConnectionsListMessages =
    ExecuteCommandMessage |
    { id: 'GetConnections' } |
    { id: 'GetConnectionsResult', connections: SparqlConnection[] } |
    { id: 'ConnectionsChanged', connections: SparqlConnection[] } |
    { id: 'EditConnection', connection: SparqlConnection } |
    { id: 'DeleteConnection', connection: SparqlConnection } |
    { id: 'CreateConnection' } |
    { id: 'ListGraphs', connection: SparqlConnection } |
    { id: 'TestConnection', connection: SparqlConnection } |
    { id: 'TestConnectionResult', connectionId: string, success: boolean, error?: string };
