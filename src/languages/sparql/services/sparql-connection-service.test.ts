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
import { SparqlConnectionService, MENTOR_WORKSPACE_STORE } from './sparql-connection-service';
import { ConfigurationScope } from '@src/utilities/config-scope';
import type { SparqlConnection } from './sparql-connection';
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
});
