import { describe, it, expect, vi } from 'vitest';
import { DefaultSparqlEndpointProvider } from './default-endpoint-provider';
import { GraphDbEndpointProvider } from './graphdb-endpoint-provider';
import { WorkspaceEndpointProvider } from './workspace-endpoint-provider';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

function makeConnection(endpointUrl: string) {
    return { id: 'test', endpointUrl, storeType: 'sparql' } as any;
}

describe('DefaultSparqlEndpointProvider', () => {
    const provider = new DefaultSparqlEndpointProvider();

    it('has storeType sparql', () => {
        expect(provider.storeType).toBe('sparql');
    });

    it('does not support inference', () => {
        expect(provider.supportsInference).toBe(false);
    });

    it('createEndpoint returns sparql endpoint with connection URL', async () => {
        const conn = makeConnection('http://example.org/sparql');
        const endpoint = await provider.createEndpoint(conn, { inferenceEnabled: false }) as any;
        expect(endpoint.type).toBe('sparql');
        expect(endpoint.value).toBe('http://example.org/sparql');
        expect(endpoint.connection).toBe(conn);
    });

    it('getGraphs returns empty array', async () => {
        const conn = makeConnection('http://example.org/sparql');
        const graphs = await provider.getGraphs(conn, { inferenceEnabled: false });
        expect(graphs).toEqual([]);
    });
});

describe('GraphDbEndpointProvider', () => {
    const provider = new GraphDbEndpointProvider();

    it('has storeType graphdb', () => {
        expect(provider.storeType).toBe('graphdb');
    });

    it('supports inference', () => {
        expect(provider.supportsInference).toBe(true);
    });

    it('createEndpoint appends infer=true when inference is enabled', async () => {
        const conn = makeConnection('http://example.org/sparql');
        const endpoint = await provider.createEndpoint(conn, { inferenceEnabled: true }) as any;
        expect(endpoint.type).toBe('sparql');
        expect(endpoint.value).toContain('infer=true');
    });

    it('createEndpoint appends infer=false when inference is disabled', async () => {
        const conn = makeConnection('http://example.org/sparql');
        const endpoint = await provider.createEndpoint(conn, { inferenceEnabled: false }) as any;
        expect(endpoint.type).toBe('sparql');
        expect(endpoint.value).toContain('infer=false');
    });

    it('createEndpoint preserves existing query parameters', async () => {
        const conn = makeConnection('http://example.org/sparql?repo=test');
        const endpoint = await provider.createEndpoint(conn, { inferenceEnabled: true }) as any;
        expect(endpoint.value).toContain('repo=test');
        expect(endpoint.value).toContain('infer=true');
    });

    it('getGraphs returns empty array', async () => {
        const conn = makeConnection('http://example.org/sparql');
        const graphs = await provider.getGraphs(conn, { inferenceEnabled: true });
        expect(graphs).toEqual([]);
    });
});

describe('WorkspaceEndpointProvider', () => {
    function makeStore(graphs: string[] = []) {
        return {
            match: vi.fn().mockReturnValue({ filter: (fn: any) => [].filter(fn) }),
            getGraphs: vi.fn().mockReturnValue(graphs),
        } as any;
    }

    it('has storeType workspace', () => {
        const store = makeStore();
        const provider = new WorkspaceEndpointProvider(() => store);
        expect(provider.storeType).toBe('workspace');
    });

    it('supports inference', () => {
        const store = makeStore();
        const provider = new WorkspaceEndpointProvider(() => store);
        expect(provider.supportsInference).toBe(true);
    });

    it('createEndpoint returns raw store when inference is enabled', async () => {
        const store = makeStore();
        const provider = new WorkspaceEndpointProvider(() => store);
        const endpoint = await provider.createEndpoint(null as any, { inferenceEnabled: true }) as any;
        expect(endpoint.type).toBe('rdfjs');
        expect(endpoint.value).toBe(store);
    });

    it('createEndpoint returns filtered source when inference is disabled', async () => {
        const store = makeStore();
        const provider = new WorkspaceEndpointProvider(() => store);
        const endpoint = await provider.createEndpoint(null as any, { inferenceEnabled: false }) as any;
        expect(endpoint.type).toBe('rdfjs');
        expect(endpoint.value).not.toBe(store);
        expect(typeof endpoint.value.match).toBe('function');
    });

    it('getGraphs returns all graphs when inference is enabled', async () => {
        const graphs = ['http://example.org/', 'http://example.org/graphinference'];
        const store = makeStore(graphs);
        const provider = new WorkspaceEndpointProvider(() => store);
        const result = await provider.getGraphs(null as any, { inferenceEnabled: true });
        expect(result).toEqual(graphs);
    });

    it('getGraphs filters inference graphs when inference is disabled', async () => {
        const graphs = ['http://example.org/', 'http://example.org/graphinference'];
        const store = makeStore(graphs);
        const provider = new WorkspaceEndpointProvider(() => store);
        const result = await provider.getGraphs(null as any, { inferenceEnabled: false });
        expect(result).toEqual(['http://example.org/']);
    });

    it('getGraphs returns empty array when store has no graphs', async () => {
        const store = makeStore([]);
        const provider = new WorkspaceEndpointProvider(() => store);
        const result = await provider.getGraphs(null as any, { inferenceEnabled: false });
        expect(result).toEqual([]);
    });
});
