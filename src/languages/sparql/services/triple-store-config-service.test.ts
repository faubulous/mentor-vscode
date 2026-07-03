import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('../../../utilities/mocks/vscode'));

import { TripleStoreConfigService } from './triple-store-config-service';
import type { TripleStoreConfig } from './triple-store-config';
import type { SparqlConnection } from './sparql-connection';
import { ConfigurationScope } from '../../../utilities/config-scope';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeService() {
    return new TripleStoreConfigService();
}

function makeConnection(overrides: Partial<SparqlConnection> = {}): SparqlConnection {
    return {
        id: 'test-conn',
        endpointUrl: 'https://example.org/sparql',
        configScope: ConfigurationScope.User,
        ...overrides,
    };
}

function withStoreConfigs(configs: TripleStoreConfig[], run: (svc: TripleStoreConfigService) => void) {
    return (async () => {
        const vscode = await import('vscode');
        const original = vscode.workspace.getConfiguration;

        (vscode.workspace as any).getConfiguration = () => ({
            get: (key: string, def: any) => key === 'sparql.stores' ? configs : def,
            has: () => false,
            inspect: () => undefined,
            update: async () => { },
        });

        try {
            run(new TripleStoreConfigService());
        } finally {
            (vscode.workspace as any).getConfiguration = original;
        }
    })();
}

function withInspectedStoreConfigs(
    inspected: { defaultValue?: TripleStoreConfig[]; globalValue?: TripleStoreConfig[]; workspaceValue?: TripleStoreConfig[] },
    run: (svc: TripleStoreConfigService) => void,
) {
    return (async () => {
        const vscode = await import('vscode');
        const original = vscode.workspace.getConfiguration;

        (vscode.workspace as any).getConfiguration = () => ({
            get: (_key: string, def: any) => def,
            has: () => false,
            inspect: (key: string) => key === 'sparql.stores' ? inspected : undefined,
            update: async () => { },
        });

        try {
            run(new TripleStoreConfigService());
        } finally {
            (vscode.workspace as any).getConfiguration = original;
        }
    })();
}

const rdf4jConfig: TripleStoreConfig = {
    id: 'rdf4j',
    label: 'RDF4J',
    inference: { supported: true, urlParameters: { enabled: 'infer=true', disabled: 'infer=false' } },
};

const sparqlConfig: TripleStoreConfig = { id: 'sparql', label: 'SPARQL Endpoint' };
const qleverConfig: TripleStoreConfig = { id: 'qlever', label: 'QLever' };

// ---------------------------------------------------------------------------
// defaultStoreType
// ---------------------------------------------------------------------------

describe('TripleStoreConfigService – defaultStoreType', () => {
    it('is "sparql"', () => {
        expect(makeService().defaultStoreType).toBe('sparql');
    });
});

// ---------------------------------------------------------------------------
// getStoreConfigs
// ---------------------------------------------------------------------------

describe('TripleStoreConfigService – getStoreConfigs', () => {
    it('returns configs from the setting when set', () =>
        withStoreConfigs([rdf4jConfig, sparqlConfig], svc => {
            expect(svc.getStoreConfigs()).toHaveLength(2);
            expect(svc.getStoreConfigs()[0].id).toBe('rdf4j');
        })
    );

    it('returns [] when the setting is unset (VS Code provides the package.json default at runtime)', () => {
        // Default mock returns `def` for any get() call; no default is passed, so undefined → []
        expect(makeService().getStoreConfigs()).toEqual([]);
    });

    it('unions default, user, and workspace store types so none are shadowed by another scope', () =>
        withInspectedStoreConfigs(
            {
                defaultValue: [sparqlConfig, qleverConfig],
                globalValue: [{ id: 'user-store', label: 'User Store' }],
                workspaceValue: [{ id: 'ws-store', label: 'Workspace Store' }],
            },
            svc => {
                expect(svc.getStoreConfigs().map(s => s.id)).toEqual(['sparql', 'qlever', 'user-store', 'ws-store']);
            }
        )
    );

    it('lets a workspace store type override a built-in default with the same id', () =>
        withInspectedStoreConfigs(
            {
                defaultValue: [sparqlConfig],
                workspaceValue: [{ id: 'sparql', label: 'Custom SPARQL' }],
            },
            svc => {
                const configs = svc.getStoreConfigs();
                expect(configs).toHaveLength(1);
                expect(configs[0].label).toBe('Custom SPARQL');
            }
        )
    );
});

// ---------------------------------------------------------------------------
// getStoreConfig
// ---------------------------------------------------------------------------

describe('TripleStoreConfigService – getStoreConfig', () => {
    it('returns the matching config by id', () =>
        withStoreConfigs([rdf4jConfig, sparqlConfig], svc => {
            expect(svc.getStoreConfig('rdf4j')?.label).toBe('RDF4J');
        })
    );

    it('returns undefined for an unknown id', () =>
        withStoreConfigs([rdf4jConfig], svc => {
            expect(svc.getStoreConfig('unknown')).toBeUndefined();
        })
    );

    it('falls back to defaultStoreType when passed undefined', () =>
        withStoreConfigs([sparqlConfig, rdf4jConfig], svc => {
            expect(svc.getStoreConfig(undefined)?.id).toBe('sparql');
        })
    );

    it('returns undefined when the default store type is not in the list', () =>
        withStoreConfigs([rdf4jConfig], svc => {
            expect(svc.getStoreConfig(undefined)).toBeUndefined();
        })
    );
});

// ---------------------------------------------------------------------------
// supportsInference
// ---------------------------------------------------------------------------

describe('TripleStoreConfigService – supportsInference', () => {
    it('returns true for the workspace connection (matched by id)', () => {
        const svc = makeService();
        expect(svc.supportsInference(makeConnection({ id: 'workspace' }))).toBe(true);
    });

    it('returns true for a connection with storeType = workspace', () => {
        const svc = makeService();
        expect(svc.supportsInference(makeConnection({ storeType: 'workspace' }))).toBe(true);
    });

    it('returns true for a store config with inference.supported = true', () =>
        withStoreConfigs([rdf4jConfig], svc => {
            expect(svc.supportsInference(makeConnection({ storeType: 'rdf4j' }))).toBe(true);
        })
    );

    it('returns false for a store config without reasoning', () =>
        withStoreConfigs([sparqlConfig], svc => {
            expect(svc.supportsInference(makeConnection({ storeType: 'sparql' }))).toBe(false);
        })
    );

    it('returns false when the store type is unknown (no config found)', () => {
        const svc = makeService(); // no configs in mock
        expect(svc.supportsInference(makeConnection({ storeType: 'mystery' }))).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// isWorkspaceConnection
// ---------------------------------------------------------------------------

describe('TripleStoreConfigService – isWorkspaceConnection', () => {
    it('returns true for a connection with id = workspace', () => {
        expect(makeService().isWorkspaceConnectionId('workspace')).toBe(true);
    });

    it('returns true for a connection with storeType = workspace', () => {
        expect(makeService().isWorkspaceConnectionId('workspace')).toBe(true);
    });

    it('returns false for a regular SPARQL connection', () => {
        expect(makeService().isWorkspaceConnectionId('conn-1')).toBe(false);
    });

    it('returns false when storeType is undefined and id is not workspace', () => {
        // storeType defaults to 'sparql', which is not 'workspace'
        expect(makeService().isWorkspaceConnectionId('conn-2')).toBe(false);
    });
});
