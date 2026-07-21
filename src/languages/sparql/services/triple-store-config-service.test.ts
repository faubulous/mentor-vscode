import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('../../../utilities/mocks/vscode'));

import { TripleStoreConfigService } from './triple-store-config-service';
import { PRESET_STORES } from './default-stores';
import { generateStoreId, type TripleStoreConfig } from './triple-store-config';
import type { SparqlConnection } from './sparql-connection';
import { ConfigurationScope } from '../../../utilities/config-scope';

const presetIds = PRESET_STORES.map(s => s.id);

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
    it('always returns the built-in presets first, even when the setting is unset', () => {
        expect(makeService().getStoreConfigs().map(s => s.id)).toEqual(presetIds);
    });

    it('appends configs from the setting after the presets', () =>
        withStoreConfigs([{ id: 'my-store', label: 'My Store' }], svc => {
            expect(svc.getStoreConfigs().map(s => s.id)).toEqual([...presetIds, 'my-store']);
        })
    );

    it('unions user and workspace store types so none are shadowed by another scope', () =>
        withInspectedStoreConfigs(
            {
                globalValue: [{ id: 'user-store', label: 'User Store' }],
                workspaceValue: [{ id: 'ws-store', label: 'Workspace Store' }],
            },
            svc => {
                expect(svc.getStoreConfigs().map(s => s.id)).toEqual([...presetIds, 'user-store', 'ws-store']);
            }
        )
    );

    it('ignores settings entries whose id collides with a preset (presets cannot be shadowed)', () =>
        withInspectedStoreConfigs(
            {
                globalValue: [{ id: 'jena', label: 'Legacy Seeded Jena' }],
                workspaceValue: [{ id: 'sparql', label: 'Custom SPARQL' }],
            },
            svc => {
                const configs = svc.getStoreConfigs();
                expect(configs.map(s => s.id)).toEqual(presetIds);
                expect(configs.find(s => s.id === 'sparql')?.label).toBe('SPARQL Endpoint');
                expect(configs.find(s => s.id === 'jena')?.label).toBe('Apache Jena Fuseki');
            }
        )
    );

    it('ignores preset-id entries in the non-inspect fallback path', () =>
        withStoreConfigs([rdf4jConfig, { id: 'my-store', label: 'My Store' }], svc => {
            const configs = svc.getStoreConfigs();
            expect(configs.map(s => s.id)).toEqual([...presetIds, 'my-store']);
            expect(configs.find(s => s.id === 'rdf4j')?.label).toBe('RDF4J');
        })
    );

    it('tags settings-defined stores with their configuration scope and leaves presets untagged', () =>
        withInspectedStoreConfigs(
            {
                globalValue: [{ id: 'user-store', label: 'User Store' }],
                workspaceValue: [{ id: 'ws-store', label: 'Workspace Store' }],
            },
            svc => {
                const configs = svc.getStoreConfigs();
                expect(configs.find(s => s.id === 'user-store')?.configScope).toBe(ConfigurationScope.User);
                expect(configs.find(s => s.id === 'ws-store')?.configScope).toBe(ConfigurationScope.Workspace);
                expect(configs.filter(s => presetIds.includes(s.id)).every(s => s.configScope === undefined)).toBe(true);
            }
        )
    );

    it('keeps the workspace scope tag when the same id is defined in both scopes', () =>
        withInspectedStoreConfigs(
            {
                globalValue: [{ id: 'shared', label: 'User Copy' }],
                workspaceValue: [{ id: 'shared', label: 'Workspace Copy' }],
            },
            svc => {
                const shared = svc.getStoreConfigs().find(s => s.id === 'shared');
                expect(shared?.label).toBe('Workspace Copy');
                expect(shared?.configScope).toBe(ConfigurationScope.Workspace);
            }
        )
    );
});

// ---------------------------------------------------------------------------
// getStoreConfigScope
// ---------------------------------------------------------------------------

describe('TripleStoreConfigService – getStoreConfigScope', () => {
    it('reports presets as preset', () => {
        expect(makeService().getStoreConfigScope('jena')).toBe('preset');
    });

    it('reports the scope a settings-defined store lives in', () =>
        withInspectedStoreConfigs(
            {
                globalValue: [{ id: 'user-store', label: 'User Store' }],
                workspaceValue: [{ id: 'ws-store', label: 'Workspace Store' }],
            },
            svc => {
                expect(svc.getStoreConfigScope('user-store')).toBe('user');
                expect(svc.getStoreConfigScope('ws-store')).toBe('workspace');
            }
        )
    );

    it('reports workspace when the same id is defined in both scopes', () =>
        withInspectedStoreConfigs(
            {
                globalValue: [{ id: 'shared', label: 'User Copy' }],
                workspaceValue: [{ id: 'shared', label: 'Workspace Copy' }],
            },
            svc => {
                expect(svc.getStoreConfigScope('shared')).toBe('workspace');
            }
        )
    );

    it('returns undefined for an unknown id', () => {
        expect(makeService().getStoreConfigScope('mystery')).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// generateStoreId
// ---------------------------------------------------------------------------

describe('generateStoreId', () => {
    it('slugifies the label', () => {
        expect(generateStoreId('My GraphDB Store', [])).toBe('my-graphdb-store');
    });

    it('disambiguates against existing ids with a numeric suffix', () => {
        expect(generateStoreId('My Store', ['my-store'])).toBe('my-store-2');
        expect(generateStoreId('My Store', ['my-store', 'my-store-2'])).toBe('my-store-3');
    });

    it('avoids preset and reserved ids when they are passed as existing', () => {
        expect(generateStoreId('SPARQL', ['sparql', 'workspace'])).toBe('sparql-2');
        expect(generateStoreId('Workspace', ['sparql', 'workspace'])).toBe('workspace-2');
    });

    it('falls back to "store" for labels without slug characters', () => {
        expect(generateStoreId('***', [])).toBe('store');
    });
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

    it('resolves the default store type from the presets when the setting is unset', () => {
        expect(makeService().getStoreConfig(undefined)?.label).toBe('SPARQL Endpoint');
    });

    it('resolves preset store types without any settings value', () => {
        expect(makeService().getStoreConfig('jena')?.label).toBe('Apache Jena Fuseki');
    });
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
