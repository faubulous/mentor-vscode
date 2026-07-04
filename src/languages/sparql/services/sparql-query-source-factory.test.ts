import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
    container: { resolve: vi.fn(() => ({})) },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

vi.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));

import { Uri } from '@src/utilities/mocks/vscode';
import { SparqlQuerySourceFactory } from '@src/languages/sparql/services/sparql-query-source-factory';
import { DocumentConnectionService } from '@src/languages/sparql/services/document-connection-service';
import { SparqlConnectionRegistry, WORKSPACE_CONNECTION } from '@src/languages/sparql/services/sparql-connection-registry';
import { TripleStoreConfigService } from '@src/languages/sparql/services/triple-store-config-service';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { DEFAULT_SEED_STORES } from '@src/languages/sparql/services/default-stores';
import type { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import type { TripleStoreConfig } from '@src/languages/sparql/services/triple-store-config';
import packageJson from '../../../../package.json';

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

function makeFactory() {
    const ctx = makeContext();
    const storeConfigService = new TripleStoreConfigService();
    const connectionRegistry = new SparqlConnectionRegistry(
        ctx as any,
        { getCredential: async () => null } as any,
        storeConfigService,
    );
    const documentConnectionService = new DocumentConnectionService(ctx as any, connectionRegistry);
    const factory = new SparqlQuerySourceFactory({} as any, storeConfigService, connectionRegistry, documentConnectionService);
    return { factory, connectionRegistry };
}

/**
 * The built-in store catalog as seen at runtime: the protected `sparql` store (the package.json
 * `default`) unioned with the stores seeded into user settings on first run ({@link DEFAULT_SEED_STORES}).
 */
const manifestDefaultStores: TripleStoreConfig[] = (packageJson as any).contributes.configuration
    .flatMap((b: any) => Object.entries(b.properties ?? {}))
    .find(([key]: [string]) => key === 'mentor.sparql.stores')?.[1]?.default ?? [];

const builtInStoreConfigs: TripleStoreConfig[] = [...manifestDefaultStores, ...DEFAULT_SEED_STORES];

/**
 * Runs the test callback with the built-in store configs available via the config mock.
 */
function withBuiltInStoreConfigs(run: (factory: SparqlQuerySourceFactory) => void | Promise<void>) {
    return (async () => {
        const vscode = await import('vscode');
        const original = vscode.workspace.getConfiguration;
        (vscode.workspace as any).getConfiguration = () => ({
            get: (key: string, def: any) => key === 'sparql.stores' ? builtInStoreConfigs : def,
            has: () => false,
            inspect: () => undefined,
            update: async () => {},
        });
        try {
            await run(makeFactory().factory);
        } finally {
            (vscode.workspace as any).getConfiguration = original;
        }
    })();
}

describe('SparqlQuerySourceFactory', () => {
    describe('getQuerySourceForDocument', () => {
        it('returns a ComunicaEndpoint for a file URI', async () => {
            const { factory } = makeFactory();
            const uri = Uri.parse('file:///test.sparql');
            const source = await factory.getQuerySourceForDocument(uri as any);
            expect(source).toBeDefined();
        });
    });

    describe('getQuerySourceForConnection', () => {
        it('returns a ComunicaEndpoint for the workspace store', async () => {
            const { factory, connectionRegistry } = makeFactory();
            const conn = connectionRegistry.getConnection(WORKSPACE_CONNECTION.id)!;
            const source = await factory.getQuerySourceForConnection(conn);
            expect(source).toBeDefined();
        });
    });

    describe('store inference application (URL-parameter only — pragma rewriting moved to SparqlQueryService)', () => {
        it('appends the url-parameter fragment to the query source for a reasoning store', () =>
            withBuiltInStoreConfigs(async factory => {
                const conn: SparqlConnection = {
                    id: 'c', endpointUrl: 'https://e/sparql', configScope: ConfigurationScope.User, storeType: 'rdf4j',
                };
                // The built-in RDF4J store config defines infer=true / infer=false url parameters.
                expect(((await factory.getQuerySourceForConnection(conn, true)) as any).value).toContain('infer=true');
                expect(((await factory.getQuerySourceForConnection(conn, false)) as any).value).toContain('infer=false');
            })
        );
    });
});
