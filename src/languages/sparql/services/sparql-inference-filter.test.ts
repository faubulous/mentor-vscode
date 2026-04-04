import { describe, it, expect, vi } from 'vitest';
import { createFilteredSource } from './sparql-inference-filter';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

describe('createFilteredSource', () => {
    function makeStore(quads: any[]) {
        return {
            match: (_subject: any, _predicate: any, _object: any, _graph: any) => ({
                filter: (predicate: (q: any) => boolean) => quads.filter(predicate)
            })
        };
    }

    function makeQuad(graphValue: string) {
        return {
            subject: { termType: 'NamedNode', value: 'http://example.org/s' },
            predicate: { termType: 'NamedNode', value: 'http://example.org/p' },
            object: { termType: 'NamedNode', value: 'http://example.org/o' },
            graph: { termType: 'NamedNode', value: graphValue },
        };
    }

    it('passes through quads from non-inference graphs', () => {
        const quad = makeQuad('http://example.org/graph');
        const store = makeStore([quad]);
        const filtered = createFilteredSource(store as any);
        const result = filtered.match(null, null, null, null) as any;
        expect(result).toHaveLength(1);
        expect(result[0]).toBe(quad);
    });

    it('filters out quads from inference graphs', () => {
        const inferenceQuad = makeQuad('http://example.org/graph?inference');
        const store = makeStore([inferenceQuad]);
        const filtered = createFilteredSource(store as any);
        const result = filtered.match(null, null, null, null) as any;
        expect(result).toHaveLength(0);
    });

    it('keeps normal quads and removes inference graph quads', () => {
        const normalQuad = makeQuad('http://example.org/graph');
        const inferenceQuad = makeQuad('http://example.org/graph?inference');
        const store = makeStore([normalQuad, inferenceQuad]);
        const filtered = createFilteredSource(store as any);
        const result = filtered.match(null, null, null, null) as any;
        expect(result).toHaveLength(1);
        expect(result[0]).toBe(normalQuad);
    });

    it('passes match arguments through to the underlying store', () => {
        const matchSpy = vi.fn().mockReturnValue({ filter: (fn: any) => [].filter(fn) });
        const store = { match: matchSpy };
        const filtered = createFilteredSource(store as any);
        const subject = { termType: 'NamedNode', value: 'http://example.org/s' } as any;
        const predicate = { termType: 'NamedNode', value: 'http://example.org/p' } as any;
        filtered.match(subject, predicate, null, null);
        expect(matchSpy).toHaveBeenCalledWith(subject, predicate, null, null);
    });

    it('handles empty store correctly', () => {
        const store = makeStore([]);
        const filtered = createFilteredSource(store as any);
        const result = filtered.match(null, null, null, null) as any;
        expect(result).toHaveLength(0);
    });
});
