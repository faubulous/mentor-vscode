import { describe, it, expect, vi } from 'vitest';
import { WorkspaceEndpointProvider } from '@src/languages/sparql/services/endpoints/workspace-endpoint-provider';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

describe('WorkspaceEndpointProvider', () => {
    function makeStore(graphs: string[] = []) {
        return {
            match: vi.fn().mockReturnValue({ filter: (fn: any) => [].filter(fn) }),
            getGraphs: vi.fn().mockReturnValue(graphs),
        } as any;
    }

    it('createEndpoint returns the raw store when inference is enabled', () => {
        const store = makeStore();
        const provider = new WorkspaceEndpointProvider(() => store);
        const endpoint = provider.createEndpoint(true) as any;
        expect(endpoint.type).toBe('rdfjs');
        expect(endpoint.value).toBe(store);
    });

    it('createEndpoint returns a filtered source when inference is disabled', () => {
        const store = makeStore();
        const provider = new WorkspaceEndpointProvider(() => store);
        const endpoint = provider.createEndpoint(false) as any;
        expect(endpoint.type).toBe('rdfjs');
        expect(endpoint.value).not.toBe(store);
        expect(typeof endpoint.value.match).toBe('function');
    });

    it('getGraphs returns all graphs when inference is enabled', () => {
        const graphs = ['http://example.org/', 'http://example.org/graphinference'];
        const provider = new WorkspaceEndpointProvider(() => makeStore(graphs));
        expect(provider.getGraphs(true)).toEqual(graphs);
    });

    it('getGraphs filters inference graphs when inference is disabled', () => {
        const graphs = ['http://example.org/', 'http://example.org/graphinference'];
        const provider = new WorkspaceEndpointProvider(() => makeStore(graphs));
        expect(provider.getGraphs(false)).toEqual(['http://example.org/']);
    });

    it('getGraphs returns an empty array when the store has no graphs', () => {
        const provider = new WorkspaceEndpointProvider(() => makeStore([]));
        expect(provider.getGraphs(false)).toEqual([]);
    });
});
