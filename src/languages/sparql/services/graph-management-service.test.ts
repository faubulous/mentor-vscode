import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { workspace } from '@src/utilities/mocks/vscode';
import { GraphManagementService } from '@src/languages/sparql/services/graph-management-service';
import { ConfigurationScope } from '@src/utilities/config-scope';
import type { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';

function makeConnection(overrides: Partial<SparqlConnection>): SparqlConnection {
    return {
        id: overrides.id ?? 'c',
        endpointUrl: 'https://example.org/sparql',
        configScope: ConfigurationScope.User,
        autoLoadGraphs: true,
        ...overrides,
    };
}

/**
 * Builds a service whose registry returns the given connections and whose query service
 * records each `executeQueryOnConnection` call so tests can assert which connections were
 * actually contacted.
 */
function makeService(connections: SparqlConnection[]) {
    const contacted: string[] = [];

    const registry = { getConnections: () => connections } as any;
    const queryService = {
        executeQueryOnConnection: vi.fn(async (_query: string, connection: SparqlConnection) => {
            contacted.push(connection.id);
            return { type: 'bindings', bindings: [] };
        }),
    } as any;
    const storeConfigService = {
        getQueryTemplate: () => 'SELECT ?g WHERE { GRAPH ?g {} }',
        isWorkspaceConnectionId: () => false,
    } as any;
    const workspaceStore = { getGraphs: () => [] } as any;

    const service = new GraphManagementService(registry, queryService, storeConfigService, workspaceStore);

    return { service, contacted, queryService };
}

describe('GraphManagementService.autoLoadConnections', () => {
    beforeEach(() => {
        workspace.isTrusted = true;
    });

    afterEach(() => {
        workspace.isTrusted = true;
        vi.restoreAllMocks();
    });

    it('does not contact any endpoint in an untrusted workspace', async () => {
        workspace.isTrusted = false;

        const { service, contacted } = makeService([
            makeConnection({ id: 'a', endpointUrl: 'https://dbpedia.org/sparql' }),
        ]);

        await service.autoLoadConnections();

        expect(contacted).toEqual([]);
    });

    it('skips a workspace-scoped connection whose endpoint is loopback or metadata', async () => {
        const { service, contacted } = makeService([
            makeConnection({ id: 'meta', endpointUrl: 'http://169.254.169.254/latest/meta-data/', configScope: ConfigurationScope.Workspace }),
            makeConnection({ id: 'local', endpointUrl: 'http://localhost:3030/ds/sparql', configScope: ConfigurationScope.Workspace }),
        ]);

        await service.autoLoadConnections();

        expect(contacted).toEqual([]);
    });

    it('loads a workspace-scoped connection with a public endpoint', async () => {
        const { service, contacted } = makeService([
            makeConnection({ id: 'pub', endpointUrl: 'https://query.wikidata.org/sparql', configScope: ConfigurationScope.Workspace }),
        ]);

        await service.autoLoadConnections();

        expect(contacted).toEqual(['pub']);
    });

    it('allows a user-scoped connection to a loopback endpoint (developer local store)', async () => {
        const { service, contacted } = makeService([
            makeConnection({ id: 'devlocal', endpointUrl: 'http://localhost:3030/ds/sparql', configScope: ConfigurationScope.User }),
        ]);

        await service.autoLoadConnections();

        expect(contacted).toEqual(['devlocal']);
    });

    it('rejects a user-scoped connection with a non-http scheme', async () => {
        const { service, contacted } = makeService([
            makeConnection({ id: 'bad', endpointUrl: 'file:///etc/passwd', configScope: ConfigurationScope.User }),
        ]);

        await service.autoLoadConnections();

        expect(contacted).toEqual([]);
    });
});
