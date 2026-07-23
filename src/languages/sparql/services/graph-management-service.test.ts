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
 * Builds a minimal ExtensionContext stub with an in-memory workspaceState.
 */
function makeContext(initial: Record<string, any> = {}) {
    const store = new Map<string, any>(Object.entries(initial));
    return {
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
}

/**
 * Builds a service whose registry returns the given connections and whose query service
 * records each `executeQueryOnConnection` call so tests can assert which connections were
 * actually contacted. The optional initial state seeds the in-memory workspaceState the
 * service hydrates its cache from.
 */
function makeService(connections: SparqlConnection[], initialState: Record<string, any> = {}) {
    const contacted: string[] = [];

    const context = makeContext(initialState);
    const registry = {
        getConnections: () => connections,
        getConnection: (id: string) => connections.find(c => c.id === id),
    } as any;
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

    const service = new GraphManagementService(context as any, registry, queryService, storeConfigService, workspaceStore);

    return { service, contacted, queryService, context };
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

describe('GraphManagementService.ensureGraphsLoadedForConnection', () => {
    beforeEach(() => {
        workspace.isTrusted = true;
    });

    afterEach(() => {
        workspace.isTrusted = true;
        vi.restoreAllMocks();
    });

    it('loads an eligible, uncached connection on demand', async () => {
        const connection = makeConnection({ id: 'on-demand' });
        const { service, contacted } = makeService([connection]);

        await service.ensureGraphsLoadedForConnection(connection);

        expect(contacted).toEqual(['on-demand']);
        expect(service.hasGraphsForConnection('on-demand')).toBe(true);
    });

    it('does not refetch a connection whose graphs are already cached', async () => {
        const connection = makeConnection({ id: 'cached' });
        const { service, contacted } = makeService([connection]);

        await service.ensureGraphsLoadedForConnection(connection);
        await service.ensureGraphsLoadedForConnection(connection);

        expect(contacted).toEqual(['cached']);
    });

    it('does not contact the endpoint in an untrusted workspace', async () => {
        workspace.isTrusted = false;

        const connection = makeConnection({ id: 'untrusted' });
        const { service, contacted } = makeService([connection]);

        await service.ensureGraphsLoadedForConnection(connection);

        expect(contacted).toEqual([]);
    });

    it('ignores connections that do not opt into auto-loading', async () => {
        const connection = makeConnection({ id: 'no-auto', autoLoadGraphs: false });
        const { service, contacted } = makeService([connection]);

        await service.ensureGraphsLoadedForConnection(connection);

        expect(contacted).toEqual([]);
    });

    it('ignores protected connections (e.g. the workspace store)', async () => {
        const connection = makeConnection({ id: 'protected', isProtected: true });
        const { service, contacted } = makeService([connection]);

        await service.ensureGraphsLoadedForConnection(connection);

        expect(contacted).toEqual([]);
    });

    it('skips a workspace-scoped connection whose endpoint targets an internal host', async () => {
        const connection = makeConnection({ id: 'ssrf', endpointUrl: 'http://169.254.169.254/latest/meta-data/', configScope: ConfigurationScope.Workspace });
        const { service, contacted } = makeService([connection]);

        await service.ensureGraphsLoadedForConnection(connection);

        expect(contacted).toEqual([]);
    });

    it('refetches once the reload interval has been exceeded', async () => {
        vi.useFakeTimers();

        try {
            const connection = makeConnection({ id: 'stale', graphReloadIntervalSeconds: 60 });
            const { service, contacted } = makeService([connection]);

            await service.ensureGraphsLoadedForConnection(connection);
            vi.advanceTimersByTime(61_000);
            await service.ensureGraphsLoadedForConnection(connection);

            expect(contacted).toEqual(['stale', 'stale']);
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('GraphManagementService.loadGraphsForConnection', () => {
    beforeEach(() => {
        workspace.isTrusted = true;
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('serves from the cache while the reload interval has not been exceeded', async () => {
        const connection = makeConnection({ id: 'fresh', graphReloadIntervalSeconds: 60 });
        const { service, contacted } = makeService([connection]);

        await service.loadGraphsForConnection(connection);
        vi.advanceTimersByTime(30_000);
        await service.loadGraphsForConnection(connection);

        expect(contacted).toEqual(['fresh']);
    });

    it('queries the endpoint again once the reload interval has been exceeded', async () => {
        const connection = makeConnection({ id: 'expired', graphReloadIntervalSeconds: 60 });
        const { service, contacted } = makeService([connection]);

        await service.loadGraphsForConnection(connection);
        vi.advanceTimersByTime(61_000);
        await service.loadGraphsForConnection(connection);

        expect(contacted).toEqual(['expired', 'expired']);
    });

    it('uses the 24-hour default interval when none is configured', async () => {
        const connection = makeConnection({ id: 'default-ttl' });
        const { service, contacted } = makeService([connection]);

        await service.loadGraphsForConnection(connection);
        vi.advanceTimersByTime(12 * 60 * 60 * 1000);
        await service.loadGraphsForConnection(connection);

        expect(contacted).toEqual(['default-ttl']);

        vi.advanceTimersByTime(13 * 60 * 60 * 1000);
        await service.loadGraphsForConnection(connection);

        expect(contacted).toEqual(['default-ttl', 'default-ttl']);
    });

    it('never expires the cache when the reload interval is explicitly zero', async () => {
        const connection = makeConnection({ id: 'no-expiry', graphReloadIntervalSeconds: 0 });
        const { service, contacted } = makeService([connection]);

        await service.loadGraphsForConnection(connection);
        vi.advanceTimersByTime(7 * 24 * 60 * 60 * 1000);
        await service.loadGraphsForConnection(connection);

        expect(contacted).toEqual(['no-expiry']);
    });

    it('with a reload time, refetches only once the time of day has passed', async () => {
        vi.setSystemTime(new Date(2026, 6, 20, 10, 0, 0)); // Monday 10:00

        const connection = makeConnection({ id: 'nightly', graphReloadIntervalSeconds: 86_400, graphReloadTime: '02:00' });
        const { service, contacted } = makeService([connection]);

        await service.loadGraphsForConnection(connection);

        // Tuesday 01:59 — before the 02:00 boundary, still fresh.
        vi.setSystemTime(new Date(2026, 6, 21, 1, 59, 0));
        await service.loadGraphsForConnection(connection);

        expect(contacted).toEqual(['nightly']);

        // Tuesday 02:01 — past the boundary, even though a plain 24h interval
        // (which would expire Tuesday 10:00) is not exceeded yet.
        vi.setSystemTime(new Date(2026, 6, 21, 2, 1, 0));
        await service.loadGraphsForConnection(connection);

        expect(contacted).toEqual(['nightly', 'nightly']);
    });

    it('with a reload time, a load before it becomes due the same day', async () => {
        vi.setSystemTime(new Date(2026, 6, 20, 1, 0, 0)); // Monday 01:00

        const connection = makeConnection({ id: 'early', graphReloadIntervalSeconds: 86_400, graphReloadTime: '02:00' });
        const { service, contacted } = makeService([connection]);

        await service.loadGraphsForConnection(connection);

        // Monday 02:01 — the store has been updated since the pre-02:00 load.
        vi.setSystemTime(new Date(2026, 6, 20, 2, 1, 0));
        await service.loadGraphsForConnection(connection);

        expect(contacted).toEqual(['early', 'early']);
    });

    it('anchors a multi-day interval to the reload time', async () => {
        vi.setSystemTime(new Date(2026, 6, 20, 10, 0, 0)); // Monday 10:00

        const connection = makeConnection({ id: 'multi', graphReloadIntervalSeconds: 3 * 86_400, graphReloadTime: '02:00' });
        const { service, contacted } = makeService([connection]);

        await service.loadGraphsForConnection(connection);

        // Wednesday 12:00 — the reload is due Thursday 02:00 (first 02:00 after the
        // load, plus the two remaining days of the three-day interval).
        vi.setSystemTime(new Date(2026, 6, 22, 12, 0, 0));
        await service.loadGraphsForConnection(connection);

        expect(contacted).toEqual(['multi']);

        // Thursday 02:01 — due.
        vi.setSystemTime(new Date(2026, 6, 23, 2, 1, 0));
        await service.loadGraphsForConnection(connection);

        expect(contacted).toEqual(['multi', 'multi']);
    });

    it('ignores a malformed reload time and falls back to the sliding interval', async () => {
        const connection = makeConnection({ id: 'bad-time', graphReloadIntervalSeconds: 60, graphReloadTime: 'twoish' });
        const { service, contacted } = makeService([connection]);

        await service.loadGraphsForConnection(connection);
        vi.advanceTimersByTime(30_000);
        await service.loadGraphsForConnection(connection);

        expect(contacted).toEqual(['bad-time']);

        vi.advanceTimersByTime(31_000);
        await service.loadGraphsForConnection(connection);

        expect(contacted).toEqual(['bad-time', 'bad-time']);
    });

    it('bypasses a fresh cache when the reload is forced', async () => {
        const connection = makeConnection({ id: 'forced', graphReloadIntervalSeconds: 3600 });
        const { service, contacted } = makeService([connection]);

        await service.loadGraphsForConnection(connection);
        await service.loadGraphsForConnection(connection, { force: true });

        expect(contacted).toEqual(['forced', 'forced']);
    });

    it('shares a single endpoint query between concurrent loads', async () => {
        const connection = makeConnection({ id: 'concurrent' });
        const { service, contacted } = makeService([connection]);

        await Promise.all([
            service.loadGraphsForConnection(connection),
            service.loadGraphsForConnection(connection),
            service.loadGraphsForConnection(connection, { force: true }),
        ]);

        expect(contacted).toEqual(['concurrent']);
    });

    it('persists a successful load to the workspace state', async () => {
        const connection = makeConnection({ id: 'persisted', graphReloadIntervalSeconds: 60 });
        const { service, context } = makeService([connection]);

        await service.loadGraphsForConnection(connection);

        const state = context.workspaceState.get('mentor.sparql.graphCache');

        expect(state.persisted).toEqual({
            graphs: [],
            loadedAt: Date.now(),
            endpointUrl: 'https://example.org/sparql',
        });
    });

    it('caches a failed load and retries it once the interval has been exceeded', async () => {
        const connection = makeConnection({ id: 'failing', graphReloadIntervalSeconds: 60 });
        const { service, contacted, queryService } = makeService([connection]);

        queryService.executeQueryOnConnection.mockImplementation(async (_query: string, c: SparqlConnection) => {
            contacted.push(c.id);
            throw new Error('endpoint unreachable');
        });

        await service.loadGraphsForConnection(connection);
        await service.loadGraphsForConnection(connection);

        expect(contacted).toEqual(['failing']);
        expect(service.getGraphLoadError('failing')).toBe('endpoint unreachable');

        vi.advanceTimersByTime(61_000);
        await service.loadGraphsForConnection(connection);

        expect(contacted).toEqual(['failing', 'failing']);
    });
});

describe('GraphManagementService cache hydration', () => {
    /**
     * Builds the persisted workspaceState value for a single connection entry.
     */
    function makeState(connectionId: string, entry: Record<string, any> | null) {
        return { 'mentor.sparql.graphCache': { [connectionId]: entry } };
    }

    beforeEach(() => {
        workspace.isTrusted = true;
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('serves a hydrated entry from the cache while it is still fresh', async () => {
        const connection = makeConnection({ id: 'hydrated', graphReloadIntervalSeconds: 60 });
        const { service, contacted } = makeService([connection], makeState('hydrated', {
            graphs: ['http://example.org/graph/a'],
            loadedAt: Date.now() - 30_000,
            endpointUrl: 'https://example.org/sparql',
        }));

        expect(service.hasGraphsForConnection('hydrated')).toBe(true);
        expect(service.getGraphsForConnection('hydrated', false)).toEqual(['http://example.org/graph/a']);

        await service.loadGraphsForConnection(connection);

        expect(contacted).toEqual([]);
    });

    it('hydrates an expired entry but refetches it on the next load', async () => {
        const connection = makeConnection({ id: 'expired', graphReloadIntervalSeconds: 60 });
        const { service, contacted } = makeService([connection], makeState('expired', {
            graphs: ['http://example.org/graph/a'],
            loadedAt: Date.now() - 61_000,
            endpointUrl: 'https://example.org/sparql',
        }));

        // The stale list is available immediately for consumers...
        expect(service.getGraphsForConnection('expired', false)).toEqual(['http://example.org/graph/a']);

        // ...but the next load contacts the endpoint again.
        await service.loadGraphsForConnection(connection);

        expect(contacted).toEqual(['expired']);
    });

    it('hydrates a connection without an explicit interval using the 24-hour default', async () => {
        const connection = makeConnection({ id: 'default-ttl' });
        const { service, contacted } = makeService([connection], makeState('default-ttl', {
            graphs: ['http://example.org/graph/a'],
            loadedAt: Date.now() - 12 * 60 * 60 * 1000,
            endpointUrl: 'https://example.org/sparql',
        }));

        expect(service.hasGraphsForConnection('default-ttl')).toBe(true);

        await service.loadGraphsForConnection(connection);

        expect(contacted).toEqual([]);
    });

    it('does not hydrate a connection whose reload interval is explicitly zero', async () => {
        const connection = makeConnection({ id: 'no-expiry', graphReloadIntervalSeconds: 0 });
        const { service, contacted } = makeService([connection], makeState('no-expiry', {
            graphs: ['http://example.org/graph/a'],
            loadedAt: Date.now(),
            endpointUrl: 'https://example.org/sparql',
        }));

        expect(service.hasGraphsForConnection('no-expiry')).toBe(false);

        await service.loadGraphsForConnection(connection);

        expect(contacted).toEqual(['no-expiry']);
    });

    it('does not hydrate an entry whose endpoint URL no longer matches the connection', () => {
        const connection = makeConnection({ id: 'moved', graphReloadIntervalSeconds: 60 });
        const { service } = makeService([connection], makeState('moved', {
            graphs: ['http://example.org/graph/a'],
            loadedAt: Date.now(),
            endpointUrl: 'https://old.example.org/sparql',
        }));

        expect(service.hasGraphsForConnection('moved')).toBe(false);
    });

    it('prunes entries for connections that no longer exist', () => {
        const { service, context } = makeService([], makeState('deleted', {
            graphs: ['http://example.org/graph/a'],
            loadedAt: Date.now(),
            endpointUrl: 'https://example.org/sparql',
        }));

        expect(service.hasGraphsForConnection('deleted')).toBe(false);
        expect(context.workspaceState.get('mentor.sparql.graphCache')).toEqual({});
    });

    it('ignores malformed persisted values without throwing', () => {
        const connection = makeConnection({ id: 'broken', graphReloadIntervalSeconds: 60 });

        for (const state of [
            { 'mentor.sparql.graphCache': 'not-an-object' },
            makeState('broken', { graphs: 'not-an-array', loadedAt: Date.now(), endpointUrl: 'https://example.org/sparql' }),
            makeState('broken', { graphs: [], endpointUrl: 'https://example.org/sparql' }),
            makeState('broken', null),
        ]) {
            const { service } = makeService([connection], state);

            expect(service.hasGraphsForConnection('broken')).toBe(false);
        }
    });

    it('removes a persisted entry when a later load fails, so a reload retries', async () => {
        const connection = makeConnection({ id: 'retry', graphReloadIntervalSeconds: 60 });
        const state = makeState('retry', {
            graphs: ['http://example.org/graph/a'],
            loadedAt: Date.now(),
            endpointUrl: 'https://example.org/sparql',
        });

        const { service, context, queryService } = makeService([connection], state);

        queryService.executeQueryOnConnection.mockImplementation(async () => {
            throw new Error('endpoint unreachable');
        });

        await service.loadGraphsForConnection(connection, { force: true });

        expect(context.workspaceState.get('mentor.sparql.graphCache')).toEqual({});

        // A "window reload" over the same state starts without a cached list and
        // contacts the endpoint again.
        const reloaded = makeService([connection], { 'mentor.sparql.graphCache': context.workspaceState.get('mentor.sparql.graphCache') });

        expect(reloaded.service.hasGraphsForConnection('retry')).toBe(false);

        await reloaded.service.loadGraphsForConnection(connection);

        expect(reloaded.contacted).toEqual(['retry']);
    });
});
