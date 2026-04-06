import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

let onChangeConnectionsHandler: ((...args: any[]) => void) | null = null;
let onChangeConnectionForDocHandler: ((...args: any[]) => void) | null = null;
let getConnectionForDocumentResult: any = null;
let supportsInferenceResult = false;
let getInferenceEnabledResult = false;

const mockConnectionService = {
    onDidChangeConnections: (handler: any) => {
        onChangeConnectionsHandler = handler;
        return { dispose: () => {} };
    },
    onDidChangeConnectionForDocument: (handler: any) => {
        onChangeConnectionForDocHandler = handler;
        return { dispose: () => {} };
    },
    getConnectionForDocument: () => getConnectionForDocumentResult,
    supportsInference: () => supportsInferenceResult,
    getInferenceEnabledForDocument: () => getInferenceEnabledResult,
    getGraphsForDocument: async () => [],
};

vi.mock('tsyringe', () => ({
    container: { resolve: vi.fn(() => mockConnectionService) },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

const { mockGetConfig } = vi.hoisted(() => ({
    mockGetConfig: vi.fn(() => ({ get: (_key: string, defaultValue?: any) => defaultValue })),
}));

vi.mock('@src/utilities/vscode/config', () => ({
    getConfig: (...args: any[]) => mockGetConfig(...args),
}));

import { SparqlCodeLensProvider } from './sparql-code-lens-provider';

beforeEach(() => {
    onChangeConnectionsHandler = null;
    onChangeConnectionForDocHandler = null;
    getConnectionForDocumentResult = null;
    supportsInferenceResult = false;
    getInferenceEnabledResult = false;
    mockGetConfig.mockReturnValue({ get: (_key: string, defaultValue?: any) => defaultValue });
});

describe('SparqlCodeLensProvider', () => {
    describe('constructor', () => {
        it('can be instantiated without throwing', () => {
            expect(() => new SparqlCodeLensProvider()).not.toThrow();
        });

        it('registers onDidChangeConnectionForDocument handler', () => {
            new SparqlCodeLensProvider();
            expect(onChangeConnectionForDocHandler).not.toBeNull();
        });

        it('registers onDidChangeConnections handler', () => {
            new SparqlCodeLensProvider();
            expect(onChangeConnectionsHandler).not.toBeNull();
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

        it('fires event when onDidChangeConnectionForDocument triggers refresh', () => {
            const provider = new SparqlCodeLensProvider();
            let fired = false;
            provider.onDidChangeCodeLenses(() => { fired = true; });
            onChangeConnectionForDocHandler?.();
            expect(fired).toBe(true);
        });

        it('fires event when onDidChangeConnections triggers refresh', () => {
            const provider = new SparqlCodeLensProvider();
            let fired = false;
            provider.onDidChangeCodeLenses(() => { fired = true; });
            onChangeConnectionsHandler?.();
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

        it('returns connection CodeLens when connection is configured', async () => {
            getConnectionForDocumentResult = { endpointUrl: 'http://sparql.example.org/endpoint' };
            const provider = new SparqlCodeLensProvider();
            const doc = { uri: 'file:///test.sparql' };
            const lenses = await provider.provideCodeLenses(doc as any);
            expect(lenses.length).toBeGreaterThanOrEqual(1);
            expect(lenses[0].command?.command).toBe('mentor.command.selectSparqlConnection');
        });

        it('only has connection lens when inference is not enabled in config', async () => {
            getConnectionForDocumentResult = { endpointUrl: 'http://sparql.example.org/endpoint' };
            const provider = new SparqlCodeLensProvider();
            const doc = { uri: 'file:///test.sparql' };
            const lenses = await provider.provideCodeLenses(doc as any);
            // inference.enabled returns false, so only 1 lens
            expect(lenses.length).toBe(1);
        });

        it('connection lens title contains the endpoint URL', async () => {
            getConnectionForDocumentResult = { endpointUrl: 'http://my.endpoint/sparql' };
            const provider = new SparqlCodeLensProvider();
            const doc = { uri: 'file:///test.sparql' };
            const lenses = await provider.provideCodeLenses(doc as any);
            expect(lenses[0].command?.title).toContain('http://my.endpoint/sparql');
        });
    });

    describe('provideCodeLenses with inference', () => {
        it('returns two lenses when inference is enabled and connection supports it', async () => {
            getConnectionForDocumentResult = { endpointUrl: 'http://sparql.example.org/endpoint' };
            supportsInferenceResult = true;
            getInferenceEnabledResult = false;
            mockGetConfig.mockReturnValue({ get: (key: string, def?: any) => key === 'inference.enabled' ? true : def });

            const provider = new SparqlCodeLensProvider();
            const doc = { uri: 'file:///test.sparql' };
            const lenses = await provider.provideCodeLenses(doc as any);
            expect(lenses.length).toBe(2);
            expect(lenses[1].command?.command).toBe('mentor.command.toggleDocumentInference');
        });

        it('inference lens shows "off" text when inference is disabled', async () => {
            getConnectionForDocumentResult = { endpointUrl: 'http://sparql.example.org/endpoint' };
            supportsInferenceResult = true;
            getInferenceEnabledResult = false;
            mockGetConfig.mockReturnValue({ get: (key: string, def?: any) => key === 'inference.enabled' ? true : def });

            const provider = new SparqlCodeLensProvider();
            const doc = { uri: 'file:///test.sparql' };
            const lenses = await provider.provideCodeLenses(doc as any);
            expect(lenses[1].command?.title).toContain('off');
        });

        it('inference lens shows "on" text when inference is enabled', async () => {
            getConnectionForDocumentResult = { endpointUrl: 'http://sparql.example.org/endpoint' };
            supportsInferenceResult = true;
            getInferenceEnabledResult = true;
            mockGetConfig.mockReturnValue({ get: (key: string, def?: any) => key === 'inference.enabled' ? true : def });

            const provider = new SparqlCodeLensProvider();
            const doc = { uri: 'file:///test.sparql' };
            const lenses = await provider.provideCodeLenses(doc as any);
            expect(lenses[1].command?.title).toContain('on');
        });

        it('does not add inference lens when inference.enabled config is false', async () => {
            getConnectionForDocumentResult = { endpointUrl: 'http://sparql.example.org/endpoint' };
            supportsInferenceResult = true;
            // mockGetConfig returns default (falsy) value

            const provider = new SparqlCodeLensProvider();
            const doc = { uri: 'file:///test.sparql' };
            const lenses = await provider.provideCodeLenses(doc as any);
            expect(lenses.length).toBe(1);
        });

        it('does not add inference lens when connection does not support inference', async () => {
            getConnectionForDocumentResult = { endpointUrl: 'http://sparql.example.org/endpoint' };
            supportsInferenceResult = false;
            mockGetConfig.mockReturnValue({ get: (key: string, def?: any) => key === 'inference.enabled' ? true : def });

            const provider = new SparqlCodeLensProvider();
            const doc = { uri: 'file:///test.sparql' };
            const lenses = await provider.provideCodeLenses(doc as any);
            expect(lenses.length).toBe(1);
        });
    });
});
