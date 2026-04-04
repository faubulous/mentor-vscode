import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const mockConnectionService = {
    onDidChangeConnections: (_handler: any) => ({ dispose: () => {} }),
    onDidChangeConnectionForDocument: (_handler: any) => ({ dispose: () => {} }),
    getConnectionForDocument: () => null,
    supportsInference: () => false,
    getInferenceEnabledForDocument: () => false,
    getGraphsForDocument: async () => [],
};

vi.mock('tsyringe', () => ({
    container: { resolve: vi.fn(() => mockConnectionService) },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

import { SparqlCodeLensProvider } from './sparql-code-lens-provider';

describe('SparqlCodeLensProvider', () => {
    describe('constructor', () => {
        it('can be instantiated without throwing', () => {
            expect(() => new SparqlCodeLensProvider()).not.toThrow();
        });
    });

    describe('onDidChangeCodeLenses', () => {
        it('is exposed as an event function', () => {
            const provider = new SparqlCodeLensProvider();
            expect(typeof provider.onDidChangeCodeLenses).toBe('function');
        });
    });

    describe('refresh', () => {
        it('fires the onDidChangeCodeLenses event', () => {
            const provider = new SparqlCodeLensProvider();
            let fired = false;
            provider.onDidChangeCodeLenses(() => { fired = true; });
            provider.refresh();
            expect(fired).toBe(true);
        });
    });

    describe('provideCodeLenses', () => {
        it('returns empty array when no connection is configured for the document', async () => {
            const provider = new SparqlCodeLensProvider();
            const doc = { uri: 'file:///test.sparql' };
            const lenses = await provider.provideCodeLenses(doc as any);
            expect(lenses).toEqual([]);
        });
    });
});
