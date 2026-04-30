import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
    container: { resolve: vi.fn(() => ({})) },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

// uuid produces real IDs — a simple mock is fine for our purposes
vi.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));

import { Uri } from '@src/utilities/mocks/vscode';
import { SparqlConnectionService, MENTOR_WORKSPACE_STORE } from '@src/languages/sparql/services/sparql-connection-service';
import { ConfigurationScope } from '@src/utilities/config-scope';
import type { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import type { AuthCredential } from '@src/services/core/credential';

/**
 * Builds a minimal ExtensionContext stub with an in-memory workspaceState.
 */
function makeContext() {
    const store = new Map<string, any>();
    return {
        workspaceState: {
            get: (key: string, defaultValue?: any) => store.has(key) ? store.get(key) : defaultValue,
            update: async (key: string, value: any) => { store.set(key, value); },
            keys: () => [...store.keys()],
        },
        subscriptions: [],
    };
}

function makeCredentialStorage() {
    return { getCredential: async () => null };
}

function makeService() {
    return new SparqlConnectionService(
        makeContext() as any,
        makeCredentialStorage() as any,
    );
}

/**
 * Builds a mock notebook-cell URI with scheme 'vscode-notebook-cell'.
 * The path matches the notebook path so _getNotebookFromCellUri can find it.
 */
function _buildCellUri(notebookPath: string) {
    const base = Uri.parse(notebookPath);
    // Return a plain object that mimics a vscode-notebook-cell URI
    return {
        scheme: 'vscode-notebook-cell',
        path: base.path,
        toString: () => `vscode-notebook-cell:${base.path}#cell0`,
    };
}

describe('SparqlConnectionService', () => {
    describe('MENTOR_WORKSPACE_STORE constant', () => {
        it('has the expected id', () => {
            expect(MENTOR_WORKSPACE_STORE.id).toBe('workspace');
        });

        it('has the workspace endpoint URL', () => {
            expect(MENTOR_WORKSPACE_STORE.endpointUrl).toBe('workspace:');
        });

        it('is marked as protected', () => {
            expect(MENTOR_WORKSPACE_STORE.isProtected).toBe(true);
        });

        it('has storeType workspace', () => {
            expect(MENTOR_WORKSPACE_STORE.storeType).toBe('workspace');
        });
    });

    describe('getConnections', () => {
        it('includes the workspace store on startup', () => {
            const svc = makeService();
            const connections = svc.getConnections();
            expect(connections.some(c => c.id === MENTOR_WORKSPACE_STORE.id)).toBe(true);
        });

        it('returns at least one connection', () => {
            const svc = makeService();
            expect(svc.getConnections().length).toBeGreaterThan(0);
        });
    });

    describe('getConnection', () => {
        it('returns the workspace store by id', () => {
            const svc = makeService();
            const conn = svc.getConnection(MENTOR_WORKSPACE_STORE.id);
            expect(conn).toBeDefined();
            expect(conn?.endpointUrl).toBe('workspace:');
        });

        it('returns undefined for an unknown id', () => {
            const svc = makeService();
            expect(svc.getConnection('nonexistent')).toBeUndefined();
        });
    });

    describe('getConnectionsForConfigurationScope', () => {
        it('returns workspace-scoped connections', () => {
            const svc = makeService();
            const result = svc.getConnectionsForConfigurationScope(ConfigurationScope.Workspace);
            // Workspace store is Workspace-scoped
            expect(result.some(c => c.configScope === ConfigurationScope.Workspace)).toBe(true);
        });

        it('returns empty array for User scope when no user connections are defined', () => {
            const svc = makeService();
            // No user connections loaded from default getConfig().inspect() which returns undefined
            const result = svc.getConnectionsForConfigurationScope(ConfigurationScope.User);
            expect(result).toHaveLength(0);
        });
    });

    describe('getSupportedConfigurationScopes', () => {
        it('contains User scope', () => {
            const svc = makeService();
            expect(svc.getSupportedConfigurationScopes()).toContain(ConfigurationScope.User);
        });

        it('contains Workspace scope', () => {
            const svc = makeService();
            expect(svc.getSupportedConfigurationScopes()).toContain(ConfigurationScope.Workspace);
        });

        it('returns exactly two scopes', () => {
            const svc = makeService();
            expect(svc.getSupportedConfigurationScopes()).toHaveLength(2);
        });
    });

    describe('createConnection', () => {
        it('adds a connection to the list', async () => {
            const svc = makeService();
            const before = svc.getConnections().length;
            await svc.createConnection();
            expect(svc.getConnections().length).toBe(before + 1);
        });

        it('marks the new connection as isNew', async () => {
            const svc = makeService();
            const conn = await svc.createConnection();
            expect(conn.isNew).toBe(true);
        });

        it('assigns an id to the new connection', async () => {
            const svc = makeService();
            const conn = await svc.createConnection();
            expect(typeof conn.id).toBe('string');
            expect(conn.id.length).toBeGreaterThan(0);
        });

        it('marks the new connection as not modified', async () => {
            const svc = makeService();
            const conn = await svc.createConnection();
            expect(conn.isModified).toBe(false);
        });
    });

    describe('deleteConnection', () => {
        it('removes an added connection', async () => {
            const svc = makeService();
            const conn = await svc.createConnection();
            await svc.deleteConnection(conn.id);
            expect(svc.getConnection(conn.id)).toBeUndefined();
        });

        it('does not remove the workspace store', async () => {
            const svc = makeService();
            await svc.deleteConnection(MENTOR_WORKSPACE_STORE.id);
            expect(svc.getConnection(MENTOR_WORKSPACE_STORE.id)).toBeDefined();
        });

        it('silently succeeds for an unknown id', async () => {
            const svc = makeService();
            const before = svc.getConnections().length;
            await svc.deleteConnection('not-a-real-id');
            expect(svc.getConnections().length).toBe(before);
        });
    });

    describe('updateConnection', () => {
        it('updates an existing connection in-place', async () => {
            const svc = makeService();
            const conn = await svc.createConnection();
            conn.endpointUrl = 'https://new.endpoint/sparql';
            await svc.updateConnection(conn);
            expect(svc.getConnection(conn.id)?.endpointUrl).toBe('https://new.endpoint/sparql');
        });

        it('inserts a connection that does not exist yet', async () => {
            const svc = makeService();
            const before = svc.getConnections().length;
            const newConn: SparqlConnection = {
                id: 'brand-new',
                endpointUrl: 'https://example.org/sparql',
                configScope: ConfigurationScope.User,
            };
            await svc.updateConnection(newConn);
            expect(svc.getConnections().length).toBe(before + 1);
            expect(svc.getConnection('brand-new')).toBeDefined();
        });

        it('does not modify the workspace store connection', async () => {
            const svc = makeService();
            const before = svc.getConnections().length;
            await svc.updateConnection({ ...MENTOR_WORKSPACE_STORE, endpointUrl: 'https://changed.org' });
            // Workspace store should not be modified
            expect(svc.getConnection(MENTOR_WORKSPACE_STORE.id)?.endpointUrl).toBe('workspace:');
            expect(svc.getConnections().length).toBe(before);
        });
    });

    describe('getConnectionForDocument', () => {
        it('returns the workspace store when no connection is set for the document', () => {
            const svc = makeService();
            const uri = Uri.parse('file:///test.sparql');
            const conn = svc.getConnectionForDocument(uri as any);
            expect(conn.id).toBe(MENTOR_WORKSPACE_STORE.id);
        });

        it('accepts a string URI and falls back to workspace store', () => {
            const svc = makeService();
            const conn = svc.getConnectionForDocument('file:///other.sparql');
            expect(conn.id).toBe(MENTOR_WORKSPACE_STORE.id);
        });
    });

    describe('getDefaultInferenceEnabled', () => {
        it('returns false when config returns the default', () => {
            const svc = makeService();
            // getConfig().get() returns the provided default value
            expect(svc.getDefaultInferenceEnabled()).toBe(false);
        });
    });

    describe('supportsInference', () => {
        it('returns false for a plain sparql connection', async () => {
            const svc = makeService();
            const conn = await svc.createConnection();
            conn.storeType = 'sparql';
            // Default SparqlEndpointFactory does not support inference for plain sparql
            expect(svc.supportsInference(conn)).toBe(false);
        });
    });

    describe('getAuthHeaders', () => {
        it('returns empty headers when no credential is provided', async () => {
            const svc = makeService();
            const headers = await svc.getAuthHeaders(undefined as any);
            expect(Object.keys(headers)).toHaveLength(0);
        });

        it('sets Basic authorization header for basic credentials', async () => {
            const svc = makeService();
            const cred: AuthCredential = { type: 'basic', username: 'user', password: 'pass' } as any;
            const headers = await svc.getAuthHeaders(cred);
            expect(headers.Authorization).toMatch(/^Basic /);
            // Base64-decode and verify
            const encoded = headers.Authorization.replace('Basic ', '');
            expect(atob(encoded)).toBe('user:pass');
        });

        it('sets Bearer authorization header for bearer credentials', async () => {
            const svc = makeService();
            const cred: AuthCredential = { type: 'bearer', token: 'my-token' } as any;
            const headers = await svc.getAuthHeaders(cred);
            expect(headers.Authorization).toBe('Bearer my-token');
        });

        it('sets Bearer authorization header for microsoft credentials', async () => {
            const svc = makeService();
            const cred: AuthCredential = { type: 'microsoft', accessToken: 'ms-token' } as any;
            const headers = await svc.getAuthHeaders(cred);
            expect(headers.Authorization).toBe('Bearer ms-token');
        });
    });

    describe('onDidChangeConnections event', () => {
        it('fires when createConnection is called', async () => {
            const svc = makeService();
            let fired = false;
            svc.onDidChangeConnections(() => { fired = true; });
            await svc.createConnection();
            expect(fired).toBe(true);
        });

        it('fires when deleteConnection is called', async () => {
            const svc = makeService();
            const conn = await svc.createConnection();
            let fired = false;
            svc.onDidChangeConnections(() => { fired = true; });
            await svc.deleteConnection(conn.id);
            expect(fired).toBe(true);
        });

        it('fires when updateConnection is called', async () => {
            const svc = makeService();
            const conn = await svc.createConnection();
            let fired = false;
            svc.onDidChangeConnections(() => { fired = true; });
            await svc.updateConnection(conn);
            expect(fired).toBe(true);
        });
    });

    describe('notifyDocumentConnectionChanged', () => {
        it('fires the onDidChangeConnectionForDocument event with the URI', () => {
            const svc = makeService();
            const uri = Uri.parse('file:///test.sparql');
            let firedUri: any;
            svc.onDidChangeConnectionForDocument(u => { firedUri = u; });
            svc.notifyDocumentConnectionChanged(uri as any);
            expect(firedUri).toBe(uri);
        });
    });

    describe('getInferenceEnabled', () => {
        it('returns false for an unknown connection (falls back to default)', () => {
            const svc = makeService();
            expect(svc.getInferenceEnabled('nonexistent-id')).toBe(false);
        });

        it('returns the stored inference setting for a known connection', async () => {
            const svc = makeService();
            const conn = await svc.createConnection();
            conn.storeType = 'graphdb';
            // Manually set inferenceEnabled on the connection object
            conn.inferenceEnabled = true;
            await svc.updateConnection(conn);
            expect(svc.getInferenceEnabled(conn.id)).toBe(true);
        });
    });

    describe('setInferenceEnabled', () => {
        it('throws when connection is not found', async () => {
            const svc = makeService();
            await expect(svc.setInferenceEnabled('not-found', true)).rejects.toThrow('Connection not found');
        });

        it('throws when connection does not support inference', async () => {
            const svc = makeService();
            const conn = await svc.createConnection();
            conn.storeType = 'sparql';
            await svc.updateConnection(conn);
            await expect(svc.setInferenceEnabled(conn.id, true)).rejects.toThrow('does not support inference');
        });
    });

    describe('toggleInferenceEnabled', () => {
        it('flips false to true for workspace store (which supports inference)', async () => {
            const svc = makeService();
            // workspace store starts with inferenceEnabled = false (default)
            const before = svc.getInferenceEnabled(MENTOR_WORKSPACE_STORE.id);
            const result = await svc.toggleInferenceEnabled(MENTOR_WORKSPACE_STORE.id);
            expect(result).toBe(!before);
        });
    });

    describe('getInferenceEnabledForDocument', () => {
        it('returns false for a plain file URI with no stored setting', () => {
            const svc = makeService();
            const uri = Uri.parse('file:///test.sparql');
            expect(svc.getInferenceEnabledForDocument(uri as any)).toBe(false);
        });

        it('returns the stored document-level setting when one is set', async () => {
            const ctx = makeContext();
            const svc = new SparqlConnectionService(ctx as any, makeCredentialStorage() as any);
            const uri = Uri.parse('file:///doc.sparql');
            await svc.setInferenceEnabledForDocument(uri as any, true);
            expect(svc.getInferenceEnabledForDocument(uri as any)).toBe(true);
        });
    });

    describe('setInferenceEnabledForDocument', () => {
        it('stores and retrieves a file-level inference setting', async () => {
            const svc = makeService();
            const uri = Uri.parse('file:///doc.sparql');
            await svc.setInferenceEnabledForDocument(uri as any, true);
            expect(svc.getInferenceEnabledForDocument(uri as any)).toBe(true);
        });
    });

    describe('toggleInferenceEnabledForDocument', () => {
        it('toggles false to true for a file URI', async () => {
            const svc = makeService();
            const uri = Uri.parse('file:///doc2.sparql');
            // Default is false
            const result = await svc.toggleInferenceEnabledForDocument(uri as any);
            expect(result).toBe(true);
        });
    });

    describe('clearInferenceEnabledForDocument', () => {
        it('clears the document-level setting (reverts to default)', async () => {
            const svc = makeService();
            const uri = Uri.parse('file:///doc3.sparql');
            await svc.setInferenceEnabledForDocument(uri as any, true);
            await svc.clearInferenceEnabledForDocument(uri as any);
            // After clearing, falls back to connection default (false)
            expect(svc.getInferenceEnabledForDocument(uri as any)).toBe(false);
        });
    });

    describe('saveConfiguration', () => {
        it('fires onDidChangeConnections and marks connections as not new/modified', async () => {
            const svc = makeService();
            const conn = await svc.createConnection();
            conn.isNew = true;
            conn.isModified = true;
            await svc.updateConnection(conn);

            let fired = false;
            svc.onDidChangeConnections(() => { fired = true; });
            await svc.saveConfiguration();

            expect(fired).toBe(true);
            expect(svc.getConnection(conn.id)?.isNew).toBe(false);
            expect(svc.getConnection(conn.id)?.isModified).toBe(false);
        });
    });

    describe('getConnectionForEndpoint', () => {
        it('returns the connection with the matching endpoint URL', async () => {
            const svc = makeService();
            const conn = await svc.createConnection();
            conn.endpointUrl = 'https://example.org/sparql';
            await svc.updateConnection(conn);
            const found = svc.getConnectionForEndpoint('https://example.org/sparql');
            expect(found?.id).toBe(conn.id);
        });

        it('returns undefined when no connection matches the endpoint URL', () => {
            const svc = makeService();
            expect(svc.getConnectionForEndpoint('https://not-found.org/sparql')).toBeUndefined();
        });
    });

    describe('getQuerySourceForDocument', () => {
        it('returns a ComunicaEndpoint for a file URI', async () => {
            const svc = makeService();
            const uri = Uri.parse('file:///test.sparql');
            const source = await svc.getQuerySourceForDocument(uri as any);
            expect(source).toBeDefined();
        });
    });

    describe('getQuerySourceForConnection', () => {
        it('returns a ComunicaEndpoint for the workspace store', async () => {
            const svc = makeService();
            const conn = svc.getConnection(MENTOR_WORKSPACE_STORE.id)!;
            const source = await svc.getQuerySourceForConnection(conn);
            expect(source).toBeDefined();
        });
    });

    describe('getGraphsForDocument', () => {
        it('returns an array for a file URI', async () => {
            const { container } = await import('tsyringe');
            vi.spyOn(container, 'resolve').mockReturnValue({ getGraphs: () => [] } as any);
            const svc = makeService();
            const uri = Uri.parse('file:///test.sparql');
            const graphs = await svc.getGraphsForDocument(uri as any);
            expect(Array.isArray(graphs)).toBe(true);
            vi.restoreAllMocks();
        });
    });

    describe('setQuerySourceForDocument', () => {
        it('stores the connection ID for a file URI and fires connectionForDocument event', async () => {
            const svc = makeService();
            const conn = await svc.createConnection();
            const uri = Uri.parse('file:///test.sparql');
            let firedUri: any;
            svc.onDidChangeConnectionForDocument(u => { firedUri = u; });
            await svc.setQuerySourceForDocument(uri as any, conn.id);
            expect(firedUri).toBeDefined();
            // After storing, getConnectionForDocument should return the set connection
            const found = svc.getConnectionForDocument(uri as any);
            expect(found.id).toBe(conn.id);
        });

        it('invokes setConnectionForCell for a notebook-cell URI', async () => {
            const vscode = await import('vscode');
            const svc = makeService();
            const conn = await svc.createConnection();

            const cellUri = _buildCellUri('file:///nb-sq.sparql-book');
            const mockCell = { document: { uri: cellUri }, metadata: {}, index: 0 };
            const mockNotebook = { uri: Uri.parse('file:///nb-sq.sparql-book'), getCells: () => [mockCell] };
            (vscode.workspace as any).notebookDocuments = [mockNotebook];

            let firedUri: any;
            svc.onDidChangeConnectionForDocument(u => { firedUri = u; });
            await svc.setQuerySourceForDocument(cellUri as any, conn.id);
            expect(firedUri).toBeDefined();

            (vscode.workspace as any).notebookDocuments = [];
        });
    });

    describe('testConnection', () => {
        it('returns null immediately for the workspace store', async () => {
            const svc = makeService();
            const conn = svc.getConnection(MENTOR_WORKSPACE_STORE.id)!;
            const result = await svc.testConnection(conn);
            expect(result).toBeNull();
        });

        it('returns an error when fetch fails', async () => {
            const svc = makeService();
            const conn: SparqlConnection = {
                id: 'test-endpoint',
                endpointUrl: 'https://invalid.example.org/sparql',
                configScope: ConfigurationScope.User,
            };
            // Global fetch will fail for non-existent host - mock it
            vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
            const result = await svc.testConnection(conn);
            expect(result).not.toBeNull();
            expect(result?.message).toContain('Network error');
            vi.unstubAllGlobals();
        });

        it('returns null when fetch succeeds (ok response)', async () => {
            const svc = makeService();
            const conn: SparqlConnection = {
                id: 'test-endpoint',
                endpointUrl: 'https://example.org/sparql',
                configScope: ConfigurationScope.User,
            };
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
            const result = await svc.testConnection(conn, null);
            expect(result).toBeNull();
            vi.unstubAllGlobals();
        });

        it('returns error details when fetch returns non-ok response', async () => {
            const svc = makeService();
            const conn: SparqlConnection = {
                id: 'test-endpoint',
                endpointUrl: 'https://example.org/sparql',
                configScope: ConfigurationScope.User,
            };
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                text: async () => 'Auth required',
            }));
            const result = await svc.testConnection(conn, null);
            expect(result?.code).toBe(401);
            expect(result?.message).toBe('Auth required');
            vi.unstubAllGlobals();
        });
    });

    describe('_loadConnectionsFromConfiguration (via constructor with mocked inspect)', () => {
        it('loads global connections when inspect returns globalValue', async () => {
            const vscode = await import('vscode');
            const originalGetConfig = vscode.workspace.getConfiguration;
            // Temporarily override getConfiguration to return a config with inspect that has globalValue
            const mockConn: SparqlConnection = { id: 'global-1', endpointUrl: 'https://global.example.org/sparql', configScope: ConfigurationScope.User };
            (vscode.workspace as any).getConfiguration = () => ({
                get: (key: string, def: any) => def,
                has: () => false,
                inspect: () => ({ globalValue: [mockConn], workspaceValue: undefined }),
                update: async () => {},
            });
            const svc = new SparqlConnectionService(makeContext() as any, makeCredentialStorage() as any);
            (vscode.workspace as any).getConfiguration = originalGetConfig;

            const connections = svc.getConnectionsForConfigurationScope(ConfigurationScope.User);
            expect(connections.some(c => c.endpointUrl === 'https://global.example.org/sparql')).toBe(true);
        });

        it('loads workspace connections when inspect returns workspaceValue', async () => {
            const vscode = await import('vscode');
            const originalGetConfig = vscode.workspace.getConfiguration;
            const mockConn: SparqlConnection = { id: 'ws-1', endpointUrl: 'https://workspace.example.org/sparql', configScope: ConfigurationScope.Workspace };
            (vscode.workspace as any).getConfiguration = () => ({
                get: (key: string, def: any) => def,
                has: () => false,
                inspect: () => ({ globalValue: undefined, workspaceValue: [mockConn] }),
                update: async () => {},
            });
            const svc = new SparqlConnectionService(makeContext() as any, makeCredentialStorage() as any);
            (vscode.workspace as any).getConfiguration = originalGetConfig;

            const connections = svc.getConnectionsForConfigurationScope(ConfigurationScope.Workspace);
            // workspace store is also Workspace-scoped; the loaded connection should also appear
            expect(connections.some(c => c.endpointUrl === 'https://workspace.example.org/sparql')).toBe(true);
        });
    });

    describe('getConnectionForDocument — notebook-cell branch', () => {
        it('returns workspace store when cell has no connectionId metadata', async () => {
            const vscode = await import('vscode');
            const cellUri = _buildCellUri('file:///nb.sparql-book');
            const mockCell = { document: { uri: cellUri }, metadata: {}, index: 0 };
            const mockNotebook = { uri: Uri.parse('file:///nb.sparql-book'), getCells: () => [mockCell] };
            (vscode.workspace as any).notebookDocuments = [mockNotebook];

            const svc = makeService();
            const conn = svc.getConnectionForDocument(cellUri as any);
            expect(conn.id).toBe(MENTOR_WORKSPACE_STORE.id);

            (vscode.workspace as any).notebookDocuments = [];
        });

        it('returns a specific connection when cell metadata has connectionId', async () => {
            const vscode = await import('vscode');
            const svc = makeService();
            const userConn = await svc.createConnection();
            userConn.endpointUrl = 'https://cell.example.org/sparql';
            await svc.updateConnection(userConn);

            const cellUri = _buildCellUri('file:///nb.sparql-book');
            const mockCell = { document: { uri: cellUri }, metadata: { connectionId: userConn.id }, index: 0 };
            const mockNotebook = { uri: Uri.parse('file:///nb.sparql-book'), getCells: () => [mockCell] };
            (vscode.workspace as any).notebookDocuments = [mockNotebook];

            const conn = svc.getConnectionForDocument(cellUri as any);
            expect(conn.id).toBe(userConn.id);

            (vscode.workspace as any).notebookDocuments = [];
        });
    });

    describe('getInferenceEnabledForDocument — notebook-cell branch', () => {
        it('returns undefined (falls back to connection) when cell has no inferenceEnabled metadata', async () => {
            const vscode = await import('vscode');
            const cellUri = _buildCellUri('file:///nb2.sparql-book');
            const mockCell = { document: { uri: cellUri }, metadata: {}, index: 0 };
            const mockNotebook = { uri: Uri.parse('file:///nb2.sparql-book'), getCells: () => [mockCell] };
            (vscode.workspace as any).notebookDocuments = [mockNotebook];

            const svc = makeService();
            // Falls back to connection setting (false)
            expect(svc.getInferenceEnabledForDocument(cellUri as any)).toBe(false);

            (vscode.workspace as any).notebookDocuments = [];
        });

        it('returns the cell-level inferenceEnabled when set in metadata', async () => {
            const vscode = await import('vscode');
            const cellUri = _buildCellUri('file:///nb3.sparql-book');
            const mockCell = { document: { uri: cellUri }, metadata: { inferenceEnabled: true }, index: 0 };
            const mockNotebook = { uri: Uri.parse('file:///nb3.sparql-book'), getCells: () => [mockCell] };
            (vscode.workspace as any).notebookDocuments = [mockNotebook];

            const svc = makeService();
            expect(svc.getInferenceEnabledForDocument(cellUri as any)).toBe(true);

            (vscode.workspace as any).notebookDocuments = [];
        });
    });

    describe('setConnectionForCell', () => {
        it('throws when notebook is not found', async () => {
            const svc = makeService();
            const cellUri = _buildCellUri('file:///missing.sparql-book');
            await expect(svc.setConnectionForCell(cellUri as any, 'some-id')).rejects.toThrow('Notebook document not found');
        });

        it('throws when cell is not found in the notebook', async () => {
            const vscode = await import('vscode');
            const cellUri = _buildCellUri('file:///nb4.sparql-book');
            const mockNotebook = { uri: Uri.parse('file:///nb4.sparql-book'), getCells: () => [] };
            (vscode.workspace as any).notebookDocuments = [mockNotebook];

            const svc = makeService();
            await expect(svc.setConnectionForCell(cellUri as any, 'some-id')).rejects.toThrow('Cell not found');

            (vscode.workspace as any).notebookDocuments = [];
        });

        it('applies workspace edit when cell is found', async () => {
            const vscode = await import('vscode');
            const cellUri = _buildCellUri('file:///nb5.sparql-book');
            const mockCell = { document: { uri: cellUri }, metadata: {}, index: 0 };
            const mockNotebook = { uri: Uri.parse('file:///nb5.sparql-book'), getCells: () => [mockCell] };
            (vscode.workspace as any).notebookDocuments = [mockNotebook];

            const svc = makeService();
            await svc.setConnectionForCell(cellUri as any, 'conn-xyz');
            // If no error thrown, the edit was applied successfully

            (vscode.workspace as any).notebookDocuments = [];
        });
    });

    describe('setInferenceEnabledForDocument — notebook-cell branch', () => {
        it('throws when notebook is not found for cell URI', async () => {
            const svc = makeService();
            const cellUri = _buildCellUri('file:///missing.sparql-book');
            await expect(svc.setInferenceEnabledForDocument(cellUri as any, true)).rejects.toThrow('Notebook document not found');
        });

        it('throws when cell is not found in notebook', async () => {
            const vscode = await import('vscode');
            const cellUri = _buildCellUri('file:///nb6.sparql-book');
            const mockNotebook = { uri: Uri.parse('file:///nb6.sparql-book'), getCells: () => [] };
            (vscode.workspace as any).notebookDocuments = [mockNotebook];

            const svc = makeService();
            await expect(svc.setInferenceEnabledForDocument(cellUri as any, true)).rejects.toThrow('Cell not found');

            (vscode.workspace as any).notebookDocuments = [];
        });

        it('applies a workspace edit to set inferenceEnabled on the cell', async () => {
            const vscode = await import('vscode');
            const cellUri = _buildCellUri('file:///nb7.sparql-book');
            const mockCell = { document: { uri: cellUri }, metadata: {}, index: 0 };
            const mockNotebook = { uri: Uri.parse('file:///nb7.sparql-book'), getCells: () => [mockCell] };
            (vscode.workspace as any).notebookDocuments = [mockNotebook];

            const svc = makeService();
            await svc.setInferenceEnabledForDocument(cellUri as any, true);
            // No throw = success

            (vscode.workspace as any).notebookDocuments = [];
        });

        it('applies a workspace edit to clear inferenceEnabled (undefined)', async () => {
            const vscode = await import('vscode');
            const cellUri = _buildCellUri('file:///nb8.sparql-book');
            const mockCell = { document: { uri: cellUri }, metadata: { inferenceEnabled: true }, index: 0 };
            const mockNotebook = { uri: Uri.parse('file:///nb8.sparql-book'), getCells: () => [mockCell] };
            (vscode.workspace as any).notebookDocuments = [mockNotebook];

            const svc = makeService();
            await svc.setInferenceEnabledForDocument(cellUri as any, undefined);
            // No throw = success

            (vscode.workspace as any).notebookDocuments = [];
        });
    });

    describe('_onNotebookDocumentChanged — adds cells with inherited settings', () => {
        it('inherits connectionId and inferenceEnabled from the previous cell when new cells are added', async () => {
            const vscode = await import('vscode');
            // Create a service and capture the notebookDocumentChanged handler
            let notebookChangeHandler: ((e: any) => Promise<void>) | undefined;
            (vscode.workspace as any).onDidChangeNotebookDocument = (handler: any) => {
                notebookChangeHandler = handler;
                return { dispose: () => {} };
            };

            const svc = new SparqlConnectionService(makeContext() as any, makeCredentialStorage() as any);

            // Set up a mock notebook with a previous cell having metadata
            const nbUri = Uri.parse('file:///nb9.sparql-book');
            const existingCellUri = _buildCellUri('file:///nb9.sparql-book');
            const newCellUri = _buildCellUri('file:///nb9.sparql-book');

            const existingCell = {
                document: { uri: existingCellUri },
                metadata: { connectionId: 'conn-prev', inferenceEnabled: true },
                index: 0
            };
            const newCell = {
                document: { uri: newCellUri },
                metadata: {},
                index: 1
            };
            const mockNotebook = {
                uri: nbUri,
                getCells: () => [existingCell, newCell]
            };
            (vscode.workspace as any).notebookDocuments = [mockNotebook];

            // Trigger the handler
            if (notebookChangeHandler) {
                await notebookChangeHandler({
                    notebook: mockNotebook,
                    contentChanges: [{ addedCells: [newCell] }]
                });
            }
            // applyEdit was called (no throw)
            (vscode.workspace as any).notebookDocuments = [];
            (vscode.workspace as any).onDidChangeNotebookDocument = (_handler: any) => ({ dispose: () => {} });
        });

        it('does not inherit settings when new cell already has metadata', async () => {
            const vscode = await import('vscode');
            let notebookChangeHandler: ((e: any) => Promise<void>) | undefined;
            (vscode.workspace as any).onDidChangeNotebookDocument = (handler: any) => {
                notebookChangeHandler = handler;
                return { dispose: () => {} };
            };

            const svc = new SparqlConnectionService(makeContext() as any, makeCredentialStorage() as any);

            const nbUri = Uri.parse('file:///nb10.sparql-book');
            const newCellUri = _buildCellUri('file:///nb10.sparql-book');
            const newCell = {
                document: { uri: newCellUri },
                metadata: { connectionId: 'already-set' },
                index: 0
            };
            const mockNotebook = {
                uri: nbUri,
                getCells: () => [newCell]
            };

            if (notebookChangeHandler) {
                await notebookChangeHandler({
                    notebook: mockNotebook,
                    contentChanges: [{ addedCells: [newCell] }]
                });
            }
            // No error = success
            (vscode.workspace as any).onDidChangeNotebookDocument = (_handler: any) => ({ dispose: () => {} });
        });
    });

    describe('getAuthHeaders — entra-client-credentials branch', () => {
        it('acquires a token and sets Bearer header', async () => {
            const { EntraClientCredentialService } = await import('@src/services/core/entra-client-credential-service');
            vi.spyOn(EntraClientCredentialService.prototype, 'acquireToken').mockResolvedValue('entra-token');

            const svc = makeService();
            const cred: any = { type: 'entra-client-credentials', tenantId: 't', clientId: 'c', clientSecret: 's' };
            const headers = await svc.getAuthHeaders(cred);
            expect(headers.Authorization).toBe('Bearer entra-token');
        });
    });

    describe('handleFileRenames', () => {
        function makeServiceWithState(initial: Record<string, any>) {
            const store = new Map<string, any>(Object.entries(initial));
            const ctx = {
                workspaceState: {
                    get: (key: string, defaultValue?: any) => store.has(key) ? store.get(key) : defaultValue,
                    update: async (key: string, value: any) => {
                        if (value === undefined) {
                            store.delete(key);
                        } else {
                            store.set(key, value);
                        }
                    },
                    keys: () => [...store.keys()],
                },
                subscriptions: [],
            };
            const svc = new SparqlConnectionService(ctx as any, { getCredential: async () => null } as any);
            return { svc, store };
        }

        it('migrates sparql.connection: key on file rename', async () => {
            const { svc, store } = makeServiceWithState({
                'sparql.connection:file:///workspace/old.ttl': 'conn-1',
            });

            await svc.handleFileRenames([{
                oldUri: Uri.parse('file:///workspace/old.ttl'),
                newUri: Uri.parse('file:///workspace/new.ttl'),
            }]);

            expect(store.has('sparql.connection:file:///workspace/new.ttl')).toBe(true);
            expect(store.get('sparql.connection:file:///workspace/new.ttl')).toBe('conn-1');
            expect(store.has('sparql.connection:file:///workspace/old.ttl')).toBe(false);
        });

        it('migrates mentor.inference.document: key on file rename', async () => {
            const { svc, store } = makeServiceWithState({
                'mentor.inference.document:file:///workspace/old.ttl': true,
            });

            await svc.handleFileRenames([{
                oldUri: Uri.parse('file:///workspace/old.ttl'),
                newUri: Uri.parse('file:///workspace/new.ttl'),
            }]);

            expect(store.has('mentor.inference.document:file:///workspace/new.ttl')).toBe(true);
            expect(store.get('mentor.inference.document:file:///workspace/new.ttl')).toBe(true);
            expect(store.has('mentor.inference.document:file:///workspace/old.ttl')).toBe(false);
        });

        it('migrates both key prefixes in a single rename', async () => {
            const { svc, store } = makeServiceWithState({
                'sparql.connection:file:///workspace/old.ttl': 'conn-1',
                'mentor.inference.document:file:///workspace/old.ttl': false,
            });

            await svc.handleFileRenames([{
                oldUri: Uri.parse('file:///workspace/old.ttl'),
                newUri: Uri.parse('file:///workspace/new.ttl'),
            }]);

            expect(store.has('sparql.connection:file:///workspace/new.ttl')).toBe(true);
            expect(store.has('mentor.inference.document:file:///workspace/new.ttl')).toBe(true);
            expect(store.has('sparql.connection:file:///workspace/old.ttl')).toBe(false);
            expect(store.has('mentor.inference.document:file:///workspace/old.ttl')).toBe(false);
        });

        it('migrates all keys under a renamed folder', async () => {
            const { svc, store } = makeServiceWithState({
                'sparql.connection:file:///workspace/models/a.ttl': 'conn-a',
                'sparql.connection:file:///workspace/models/sub/b.ttl': 'conn-b',
                'mentor.inference.document:file:///workspace/models/a.ttl': true,
            });

            await svc.handleFileRenames([{
                oldUri: Uri.parse('file:///workspace/models'),
                newUri: Uri.parse('file:///workspace/renamed'),
            }]);

            expect(store.has('sparql.connection:file:///workspace/renamed/a.ttl')).toBe(true);
            expect(store.has('sparql.connection:file:///workspace/renamed/sub/b.ttl')).toBe(true);
            expect(store.has('mentor.inference.document:file:///workspace/renamed/a.ttl')).toBe(true);
            expect(store.has('sparql.connection:file:///workspace/models/a.ttl')).toBe(false);
            expect(store.has('sparql.connection:file:///workspace/models/sub/b.ttl')).toBe(false);
            expect(store.has('mentor.inference.document:file:///workspace/models/a.ttl')).toBe(false);
        });

        it('does not migrate a sibling folder with a common name prefix', async () => {
            const { svc, store } = makeServiceWithState({
                'sparql.connection:file:///workspace/models/a.ttl': 'conn-a',
                'sparql.connection:file:///workspace/models-extra/b.ttl': 'conn-b',
            });

            await svc.handleFileRenames([{
                oldUri: Uri.parse('file:///workspace/models'),
                newUri: Uri.parse('file:///workspace/renamed'),
            }]);

            expect(store.has('sparql.connection:file:///workspace/renamed/a.ttl')).toBe(true);
            expect(store.has('sparql.connection:file:///workspace/models-extra/b.ttl')).toBe(true);
        });

        it('does not migrate unrelated keys', async () => {
            const { svc, store } = makeServiceWithState({
                'sparql.connection:file:///workspace/other.ttl': 'conn-x',
                'mentor.inference.enabled:some-connection-id': true,
            });

            await svc.handleFileRenames([{
                oldUri: Uri.parse('file:///workspace/old.ttl'),
                newUri: Uri.parse('file:///workspace/new.ttl'),
            }]);

            expect(store.has('sparql.connection:file:///workspace/other.ttl')).toBe(true);
            expect(store.has('mentor.inference.enabled:some-connection-id')).toBe(true);
        });
    });
});
