import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
    container: { resolve: vi.fn(() => ({})) },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

// uuid produces real IDs — a simple mock is fine for our purposes
vi.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));

import { SparqlConnectionRegistry, WORKSPACE_CONNECTION } from '@src/languages/sparql/services/sparql-connection-registry';
import { TripleStoreConfigService } from '@src/languages/sparql/services/triple-store-config-service';
import { ConfigurationScope } from '@src/utilities/config-scope';
import type { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import type { TripleStoreConfig } from '@src/languages/sparql/services/triple-store-config';
import type { AuthCredential } from '@src/services/core/credential';

/**
 * Builds a minimal ExtensionContext stub with an in-memory workspaceState.
 */
function makeContext(initial: Record<string, any> = {}) {
    const store = new Map<string, any>(Object.entries(initial));
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

function makeStoreConfigService() {
    return new TripleStoreConfigService();
}

function makeService() {
    return new SparqlConnectionRegistry(
        makeContext() as any,
        makeCredentialStorage() as any,
        makeStoreConfigService(),
    );
}

/**
 * The built-in store presets (sparql, jena, qlever, rdf4j) are hardcoded in the config
 * service and always present — no settings value is needed for them, so tests that need
 * the built-in catalog run against an empty `sparql.stores` setting.
 */
const builtInStoreConfigs: TripleStoreConfig[] = [];

/**
 * Runs the test callback with the built-in store configs available via the config mock.
 * The mock remains active for the duration of the callback so calls to getStoreConfigs()
 * inside the callback return the real defaults.
 */
function withStoreConfigs(configs: any[], run: (svc: SparqlConnectionRegistry) => void | Promise<void>) {
    return (async () => {
        const vscode = await import('vscode');
        const original = vscode.workspace.getConfiguration;
        (vscode.workspace as any).getConfiguration = () => ({
            get: (key: string, def: any) => key === 'sparql.stores' ? configs : def,
            has: () => false,
            inspect: () => undefined,
            update: async () => {},
        });
        try {
            await run(new SparqlConnectionRegistry(makeContext() as any, makeCredentialStorage() as any, makeStoreConfigService()));
        } finally {
            (vscode.workspace as any).getConfiguration = original;
        }
    })();
}

function withBuiltInStoreConfigs(run: (svc: SparqlConnectionRegistry) => void | Promise<void>) {
    return withStoreConfigs(builtInStoreConfigs, run);
}

describe('SparqlConnectionRegistry', () => {
    describe('WORKSPACE_CONNECTION constant', () => {
        it('has the expected id', () => {
            expect(WORKSPACE_CONNECTION.id).toBe('workspace');
        });

        it('has the workspace endpoint URL', () => {
            expect(WORKSPACE_CONNECTION.endpointUrl).toBe('workspace:');
        });

        it('is marked as protected', () => {
            expect(WORKSPACE_CONNECTION.isProtected).toBe(true);
        });

        it('has storeType workspace', () => {
            expect(WORKSPACE_CONNECTION.storeType).toBe('workspace');
        });
    });

    describe('getConnections', () => {
        it('includes the workspace store on startup', () => {
            const svc = makeService();
            const connections = svc.getConnections();
            expect(connections.some(c => c.id === WORKSPACE_CONNECTION.id)).toBe(true);
        });

        it('returns at least one connection', () => {
            const svc = makeService();
            expect(svc.getConnections().length).toBeGreaterThan(0);
        });
    });

    describe('getConnection', () => {
        it('returns the workspace store by id', () => {
            const svc = makeService();
            const conn = svc.getConnection(WORKSPACE_CONNECTION.id);
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

        it('enables autoLoadGraphs on the new connection', async () => {
            const svc = makeService();
            const conn = await svc.createConnection();
            expect(conn.autoLoadGraphs).toBe(true);
        });

        it('defaults the new connection to Workspace scope when a workspace is open', async () => {
            const svc = makeService();
            const conn = await svc.createConnection();
            expect(conn.configScope).toBe(ConfigurationScope.Workspace);
        });

        it('falls back to User scope when no workspace folder is open', async () => {
            const vscode = await import('vscode');
            const original = vscode.workspace.workspaceFolders;
            (vscode.workspace as { workspaceFolders: unknown }).workspaceFolders = undefined;

            try {
                const svc = makeService();
                const conn = await svc.createConnection();
                expect(conn.configScope).toBe(ConfigurationScope.User);
            } finally {
                (vscode.workspace as { workspaceFolders: unknown }).workspaceFolders = original;
            }
        });

        it('uses an explicitly requested User scope', async () => {
            const svc = makeService();
            const conn = await svc.createConnection(ConfigurationScope.User);
            expect(conn.configScope).toBe(ConfigurationScope.User);
        });

        it('uses an explicitly requested Workspace scope', async () => {
            const svc = makeService();
            const conn = await svc.createConnection(ConfigurationScope.Workspace);
            expect(conn.configScope).toBe(ConfigurationScope.Workspace);
        });
    });

    describe('deleteConnection', () => {
        it('removes an added connection', async () => {
            const svc = makeService();
            const conn = await svc.createConnection();
            await svc.deleteConnection(conn.id);
            expect(svc.getConnection(conn.id)).toBeUndefined();
        });

        it('throws when attempting to remove the workspace store', async () => {
            const svc = makeService();
            await expect(svc.deleteConnection(WORKSPACE_CONNECTION.id)).rejects.toThrow('cannot be removed');
            expect(svc.getConnection(WORKSPACE_CONNECTION.id)).toBeDefined();
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

        it('throws when attempting to modify the workspace store connection', async () => {
            const svc = makeService();
            const before = svc.getConnections().length;
            await expect(svc.updateConnection({ ...WORKSPACE_CONNECTION, endpointUrl: 'https://changed.org' })).rejects.toThrow('cannot be modified');
            // Workspace store should not be modified
            expect(svc.getConnection(WORKSPACE_CONNECTION.id)?.endpointUrl).toBe('workspace:');
            expect(svc.getConnections().length).toBe(before);
        });
    });

    describe('supportsInference', () => {
        it('returns false for a plain sparql connection', async () => {
            const svc = makeService();
            const conn = await svc.createConnection();
            conn.storeType = 'sparql';
            // Default SparqlEndpointFactory does not support inference for plain sparql
            expect(makeStoreConfigService().supportsInference(conn)).toBe(false);
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

    describe('getInferenceEnabled', () => {
        it('returns false for an unknown connection (falls back to default)', () => {
            const svc = makeService();
            expect(svc.getInferenceEnabled('nonexistent-id')).toBe(false);
        });

        it('returns the persisted inference setting for a known (non-workspace) connection', () => {
            // Inference state lives in workspace state, not on the connection object, so any
            // connection id — not just the workspace store — must reflect its persisted value.
            const ctx = makeContext({ 'mentor.inference.enabled:conn-xyz': true });
            const svc = new SparqlConnectionRegistry(ctx as any, makeCredentialStorage() as any, makeStoreConfigService());
            expect(svc.getInferenceEnabled('conn-xyz')).toBe(true);
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
            const before = svc.getInferenceEnabled(WORKSPACE_CONNECTION.id);
            const result = await svc.toggleInferenceEnabled(WORKSPACE_CONNECTION.id);
            expect(result).toBe(!before);
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

    describe('saveConnectionWithCredential', () => {
        it('persists the connection and replaces the credential when one is provided', async () => {
            const credentialStorage = {
                getCredential: async () => null,
                deleteCredential: vi.fn(async () => {}),
                saveCredential: vi.fn(async () => {}),
            };
            const svc = new SparqlConnectionRegistry(makeContext() as any, credentialStorage as any, makeStoreConfigService());
            const conn = await svc.createConnection();
            const credential: AuthCredential = { type: 'basic', username: 'u', password: 'p' } as any;

            await svc.saveConnectionWithCredential(conn, credential);

            expect(credentialStorage.deleteCredential).toHaveBeenCalledWith(conn.id);
            expect(credentialStorage.saveCredential).toHaveBeenCalledWith(conn.id, credential);
            expect(svc.getConnection(conn.id)?.isNew).toBe(false);
        });

        it('leaves credentials untouched when null is passed', async () => {
            const credentialStorage = {
                getCredential: async () => null,
                deleteCredential: vi.fn(async () => {}),
                saveCredential: vi.fn(async () => {}),
            };
            const svc = new SparqlConnectionRegistry(makeContext() as any, credentialStorage as any, makeStoreConfigService());
            const conn = await svc.createConnection();

            await svc.saveConnectionWithCredential(conn, null);

            expect(credentialStorage.deleteCredential).not.toHaveBeenCalled();
            expect(credentialStorage.saveCredential).not.toHaveBeenCalled();
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
            const svc = new SparqlConnectionRegistry(makeContext() as any, makeCredentialStorage() as any, makeStoreConfigService());
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
            const svc = new SparqlConnectionRegistry(makeContext() as any, makeCredentialStorage() as any, makeStoreConfigService());
            (vscode.workspace as any).getConfiguration = originalGetConfig;

            const connections = svc.getConnectionsForConfigurationScope(ConfigurationScope.Workspace);
            // workspace store is also Workspace-scoped; the loaded connection should also appear
            expect(connections.some(c => c.endpointUrl === 'https://workspace.example.org/sparql')).toBe(true);
        });
    });

    describe('getStoreConfigs', () => {
        it('lists the built-in store configs (and not the internal workspace store)', () =>
            withBuiltInStoreConfigs(() => {
                const ids = makeStoreConfigService().getStoreConfigs().map((s: TripleStoreConfig) => s.id);
                expect(ids).toEqual(['sparql', 'jena', 'qlever', 'rdf4j']);
                expect(ids).not.toContain('workspace');
            })
        );

        it('exposes reasoning support via inference.supported', () =>
            withBuiltInStoreConfigs(() => {
                const byId = Object.fromEntries(makeStoreConfigService().getStoreConfigs().map((s: TripleStoreConfig) => [s.id, s]));
                expect(byId['rdf4j']?.inference?.supported).toBe(true);
                expect(byId['sparql']?.inference).toBeUndefined();
                expect(byId['qlever']?.inference).toBeUndefined();
            })
        );

        it('exposes the jena store-specific empty-pattern listGraphs query', () =>
            withBuiltInStoreConfigs(() => {
                const jena = makeStoreConfigService().getStoreConfigs().find((s: TripleStoreConfig) => s.id === 'jena');
                expect(jena?.queries?.listGraphs).toContain('GRAPH ?graph {}');
            })
        );
    });

    describe('getStoreConfig', () => {
        it('resolves a store config by id (defaulting to sparql)', () =>
            withBuiltInStoreConfigs(() => {
                expect(makeStoreConfigService().getStoreConfig('rdf4j')?.label).toBe('RDF4J');
                expect(makeStoreConfigService().getStoreConfig(undefined)?.id).toBe('sparql');
            })
        );
    });

    describe('getQueryTemplate', () => {
        it('uses the store profile query when present', () =>
            withBuiltInStoreConfigs(() => {
                const conn: SparqlConnection = {
                    id: 'c', endpointUrl: 'https://e/sparql', configScope: ConfigurationScope.User, storeType: 'jena',
                };
                // Jena's built-in profile ships an empty-pattern listGraphs query.
                expect(makeStoreConfigService().getQueryTemplate(conn, 'listGraphs')).toContain('GRAPH ?graph {}');
            })
        );

        it('falls back to the global setting when the profile has no query', () => {
            const conn: SparqlConnection = {
                id: 'c', endpointUrl: 'https://e/sparql', configScope: ConfigurationScope.User, storeType: 'sparql',
            };
            // No store configs mocked → no profile queries → falls back to global setting
            // (undefined here, since the mock config returns no value for it).
            expect(makeStoreConfigService().getQueryTemplate(conn, 'listGraphs')).toBeUndefined();
        });
    });

    describe('storeType persistence', () => {
        it('serializes storeType and restores it on reload', async () => {
            const vscode = await import('vscode');
            const original = vscode.workspace.getConfiguration;
            let savedGlobal: any[] = [];

            (vscode.workspace as any).getConfiguration = () => ({
                get: (_k: string, def: any) => def,
                has: () => false,
                inspect: () => ({ globalValue: savedGlobal, workspaceValue: undefined }),
                update: async (key: string, value: any, target: any) => {
                    if (key === 'sparql.connections' && target === vscode.ConfigurationTarget.Global) {
                        savedGlobal = value;
                    }
                },
            });

            try {
                const svc = new SparqlConnectionRegistry(makeContext() as any, makeCredentialStorage() as any, makeStoreConfigService());
                const conn = await svc.createConnection();
                conn.configScope = ConfigurationScope.User; // This test exercises Global-scope persistence.
                conn.storeType = 'jena';
                await svc.updateConnection(conn);
                await svc.saveConfiguration();

                const serialized = savedGlobal.find(c => c.id === conn.id);
                expect(serialized.storeType).toBe('jena');

                // A fresh service loads from the captured global value.
                const svc2 = new SparqlConnectionRegistry(makeContext() as any, makeCredentialStorage() as any, makeStoreConfigService());
                expect(svc2.getConnection(conn.id)?.storeType).toBe('jena');
            } finally {
                (vscode.workspace as any).getConfiguration = original;
            }
        });
    });
});
